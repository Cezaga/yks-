// Aynı bölümün farklı yıl/ad sürümleri ("PDR" 2023 ve "PDR Rehberlik..." 2024)
// slug önekinden yakalanır: yıldan önceki kısım aynıysa aynı bölümdür.
// En güncel yılı (eşitlikte en çok satırı) taşıyan bırakılır.
//
// "-2-yillik" öneki yıldan önce KORUNUR: "maliye-2-yillik" ile "maliye" ayrı
// programlardır (önlisans/lisans), birbirine karışmaz.
//
// Kullanım: node scraper/dedupeBySlug.js [--dry]
import { readdirSync, readFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIndex } from './rebuildIndex.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEPT_DIR = path.join(__dirname, '..', 'app', 'public', 'data', 'departments')
const dry = process.argv.includes('--dry')

// slug'dan ilk 4 haneli yıldan itibaren her şeyi at -> "bölüm tabanı"
function slugBase(slug) {
  const m = slug.match(/-(?:19|20)\d{2}(?:-|$)/)
  return m ? slug.slice(0, m.index) : slug
}

function maxYear(d) {
  const ys = new Set()
  for (const r of d.rows) for (const y of r.years) ys.add(y.year)
  return ys.size ? Math.max(...ys) : 0
}

const groups = new Map()
for (const f of readdirSync(DEPT_DIR).filter(x => x.endsWith('.json'))) {
  const slug = f.replace(/\.json$/, '')
  const base = slugBase(slug)
  const d = JSON.parse(readFileSync(path.join(DEPT_DIR, f), 'utf8'))
  const info = { file: f, name: d.name, rows: d.rows.length, year: maxYear(d) }
  if (!groups.has(base)) groups.set(base, [])
  groups.get(base).push(info)
}

let silinen = 0
for (const [base, list] of groups) {
  if (list.length < 2) continue
  list.sort((a, b) => b.year - a.year || b.rows - a.rows)
  const [tut, ...at] = list
  console.log(`[${base.slice(0, 45)}]`)
  console.log(`  TUT  ${tut.name} (${tut.rows} satır, ${tut.year})`)
  for (const x of at) {
    console.log(`  SİL  ${x.name} (${x.rows} satır, ${x.year})`)
    if (!dry) unlinkSync(path.join(DEPT_DIR, x.file))
    silinen++
  }
}

console.log(`\n${silinen} eski/mükerrer sürüm silindi${dry ? ' (--dry)' : ''}.`)
if (silinen > 0 && !dry) {
  const { audit } = buildIndex()
  console.log(`index.json yeniden kuruldu: ${JSON.stringify(audit)}`)
}
