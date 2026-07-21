// Rebuilds app/public/data/index.json from the AUTHORITATIVE scraped page data
// (each row's real "Puan Türü" and the "(N Yıllık)" in programRaw), instead of
// trusting the listing-page labels — those cross-link between 2/4-year pages
// and mislabel departments (e.g. Hukuk showing up as "2 Yıllık · TYT").
//
// Also prints an audit: how many departments the old link-derived label got wrong.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'app', 'public', 'data')
const DEPT_DIR = path.join(DATA_DIR, 'departments')

const SCORE_ORDER = ['SAY', 'EA', 'SÖZ', 'DİL', 'TYT']

function deriveLevel(rows) {
  // mode of "(N Yıllık)" across rows; 2 → 2yillik, everything else (4/5/6) → 4yillik (lisans)
  const counts = {}
  for (const r of rows) {
    const m = (r.programRaw || '').match(/(\d)\s*Y[ıi]ll[ıi]k/i)
    const n = m ? Number(m[1]) : null
    if (n) counts[n] = (counts[n] || 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  const year = top ? Number(top[0]) : null
  return year === 2 ? '2yillik' : '4yillik'
}

function deriveScoreTypes(rows) {
  const set = new Set()
  for (const r of rows) if (r.scoreType) set.add(r.scoreType.toUpperCase())
  return [...set].sort((a, b) => {
    const ia = SCORE_ORDER.indexOf(a); const ib = SCORE_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function buildIndex() {
  const files = readdirSync(DEPT_DIR).filter(f => f.endsWith('.json'))
  const index = []
  const audit = { total: files.length, empty: 0, levelFixed: 0, scoreFixed: 0 }

  for (const f of files) {
    const d = JSON.parse(readFileSync(path.join(DEPT_DIR, f), 'utf8'))
    if (!d.rows || d.rows.length === 0) {
      audit.empty++
      // keep empty pages out of the searchable index
      continue
    }
    const level = deriveLevel(d.rows)
    const scoreTypes = deriveScoreTypes(d.rows)
    const primary = scoreTypes[0] || d.scoreType || null

    if (d.level && d.level !== level) audit.levelFixed++
    if (d.scoreType && !scoreTypes.includes(d.scoreType.toUpperCase())) audit.scoreFixed++

    index.push({
      name: d.name,
      slug: d.slug,
      level,
      scoreType: primary,
      scoreTypes
    })
  }

  index.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(index))
  return { index, audit }
}

const { index, audit } = buildIndex()
console.log('index.json yeniden inşa edildi:', index.length, 'bölüm')
console.log('AUDIT:', JSON.stringify(audit))
console.log('  boş (index dışı):', audit.empty)
console.log('  level düzeltilen:', audit.levelFixed)
console.log('  scoreType düzeltilen:', audit.scoreFixed)

export { buildIndex }
