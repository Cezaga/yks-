// Bazı sayfalarda kurumun ili yerine YERLEŞKE İLÇESİ yazılmış oluyor
// (ör. "ÇARŞAMBA" -> Samsun, "KILIMLI" -> Zonguldak). Bu satırlar il
// filtresinde hiçbir zaman görünmez. Burada ilçeyi bağlı olduğu ile çeviriyoruz.
//
// Kullanım: node scraper/fixCities.js [--dry]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEPT_DIR = path.join(__dirname, '..', 'app', 'public', 'data', 'departments')
const CITIES_TS = path.join(__dirname, '..', 'app', 'src', 'data', 'turkeyCities.ts')

const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
const key = s => String(s || '').toLocaleLowerCase('tr-TR').split('').map(c => FOLD[c] ?? c).join('').replace(/[^a-z0-9]/g, '')

// İlçe -> il eşlemesi (yalnızca veride rastlanan, il olmayan değerler)
const DISTRICT_TO_CITY = {
  carsamba: 'SAMSUN',
  kilimli: 'ZONGULDAK'
}

const provinces = new Set(
  [...readFileSync(CITIES_TS, 'utf8').matchAll(/city:\s*'([^']+)'/g)].map(m => key(m[1]))
)

const dry = process.argv.includes('--dry')
let changed = 0
let files = 0
const samples = []

for (const f of readdirSync(DEPT_DIR).filter(x => x.endsWith('.json'))) {
  const p = path.join(DEPT_DIR, f)
  const d = JSON.parse(readFileSync(p, 'utf8'))
  let touched = false
  for (const r of d.rows) {
    if (!r.city) continue
    const k = key(r.city)
    if (provinces.has(k)) continue // zaten geçerli il
    const target = DISTRICT_TO_CITY[k]
    if (!target) continue
    if (samples.length < 10) samples.push(`${f.slice(0, 40)}: "${r.city}" -> "${target}" (${r.university.slice(0, 35)})`)
    r.city = target
    changed++
    touched = true
  }
  if (touched) {
    files++
    if (!dry) writeFileSync(p, JSON.stringify(d))
  }
}

console.log(`ilçe -> il düzeltmesi: ${changed} satır, ${files} dosya${dry ? ' (--dry, yazılmadı)' : ''}`)
samples.forEach(s => console.log('  ' + s))

// Kalan eşleşmeyenleri raporla (elle bakmak için)
const kalan = new Map()
for (const f of readdirSync(DEPT_DIR).filter(x => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(path.join(DEPT_DIR, f), 'utf8'))
  for (const r of d.rows) {
    if (!r.city) continue
    if (provinces.has(key(r.city))) continue
    kalan.set(r.city, (kalan.get(r.city) || 0) + 1)
  }
}
if (kalan.size) {
  console.log('\nHÂLÂ ile eşleşmeyen değerler:')
  for (const [c, n] of [...kalan.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  "${c}"`)
} else {
  console.log('\nTüm il değerleri geçerli ile eşleşiyor.')
}
