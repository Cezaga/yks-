// Aynı bölümün eski ve yeni sayfası birlikte kaydedilmiş olabilir
// (ör. gastronomi-...-2022 ve gastronomi-...-2024). Aynı AD + aynı SEVİYE
// olan kayıtlarda en güncel yılı taşıyanı bırakır, diğerini siler.
//
// DİKKAT: Aynı ada sahip ama seviyesi farklı olanlar (ör. "Maliye" önlisans ve
// lisans) GERÇEKTEN ayrı programlardır; onlara dokunulmaz.
//
// Kullanım: node scraper/dedupeDepartments.js [--dry]
import { readdirSync, readFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIndex } from './rebuildIndex.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEPT_DIR = path.join(__dirname, '..', 'app', 'public', 'data', 'departments')
const dry = process.argv.includes('--dry')

const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
const nk = s => String(s || '').toLocaleLowerCase('tr-TR').split('').map(c => FOLD[c] ?? c).join('').replace(/[^a-z0-9]/g, '')

function levelOf(rows) {
  const counts = {}
  for (const r of rows) {
    const m = (r.programRaw || '').match(/(\d)\s*Y[ıi]ll[ıi]k/i)
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top) return Number(top[0]) === 2 ? '2yillik' : '4yillik'
  const st = new Set(rows.map(r => (r.scoreType || '').toUpperCase()).filter(Boolean))
  return st.size > 0 && [...st].every(s => s === 'TYT') ? '2yillik' : '4yillik'
}

const groups = new Map()
for (const f of readdirSync(DEPT_DIR).filter(x => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(path.join(DEPT_DIR, f), 'utf8'))
  if (!d.rows || d.rows.length === 0) continue
  const years = new Set()
  for (const r of d.rows) for (const y of r.years) years.add(y.year)
  const maxYear = years.size ? Math.max(...years) : 0
  const key = `${nk(d.name)}||${levelOf(d.rows)}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push({ file: f, name: d.name, rows: d.rows.length, maxYear })
}

let silinen = 0
for (const [, list] of groups) {
  if (list.length < 2) continue
  // en güncel yıl, eşitlikte daha çok satır kazanır
  list.sort((a, b) => b.maxYear - a.maxYear || b.rows - a.rows)
  const [tut, ...at] = list
  console.log(`${tut.name}:`)
  console.log(`  TUT  ${tut.file.slice(0, 55)} (${tut.rows} satır, ${tut.maxYear})`)
  for (const x of at) {
    console.log(`  SİL  ${x.file.slice(0, 55)} (${x.rows} satır, ${x.maxYear})`)
    if (!dry) unlinkSync(path.join(DEPT_DIR, x.file))
    silinen++
  }
}

console.log(`\n${silinen} eski kopya silindi${dry ? ' (--dry)' : ''}.`)
if (silinen > 0 && !dry) {
  const { audit } = buildIndex()
  console.log(`index.json yeniden kuruldu: ${JSON.stringify(audit)}`)
}
