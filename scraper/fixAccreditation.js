// TYÇ ve AKREDİTASYON sütunları bitişik olduğu için parser akreditasyon adını
// ikiye bölüyordu:  extra.tyc = "* MÜDE"  +  accreditation = "K"   -> "MÜDEK"
//                   extra.tyc = "* ECZAK" +  accreditation = "DER" -> "ECZAKDER"
//                   extra.tyc = "* MÜDEK" +  accreditation = null  -> "MÜDEK"
// Bu script programs.json ve lookup.json'daki akreditasyon alanını onarır.
//
// Kullanım: node scraper/fixAccreditation.js [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KDIR = path.join(__dirname, '..', 'app', 'public', 'data', 'kilavuz')
const dry = process.argv.includes('--dry')

const progPath = path.join(KDIR, 'programs.json')
const programs = JSON.parse(readFileSync(progPath, 'utf8'))

// "* X" biçimindeki tyc değerinden akreditasyon adını geri kazan.
const SPLIT_TYC = /^\*\s*(\S.*)$/

let repaired = 0
let tycNormalized = 0
const before = programs.filter(p => p.accreditation).length
const samples = []

for (const p of programs) {
  const tyc = p.extra && typeof p.extra.tyc === 'string' ? p.extra.tyc : null
  if (!tyc) continue
  const m = tyc.match(SPLIT_TYC)
  if (!m) continue

  // tyc'ye taşmış ön ek + accreditation'daki kuyruk = gerçek ad (araya boşluk girmez)
  const head = m[1].trim()
  const tail = typeof p.accreditation === 'string' ? p.accreditation.trim() : ''
  const full = (head + tail).replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim()

  if (full && full !== p.accreditation) {
    if (samples.length < 8) {
      samples.push(`${p.code} ${p.university.slice(0, 26)}: tyc="${tyc}" + akr=${JSON.stringify(p.accreditation)} -> "${full}"`)
    }
    p.accreditation = full
    repaired++
  }
  p.extra.tyc = '*' // TYÇ sütununun gerçek değeri sadece yıldız
  tycNormalized++
}

const after = programs.filter(p => p.accreditation).length

console.log('=== AKREDİTASYON ONARIMI ===')
console.log(`onarılan kayıt        : ${repaired}`)
console.log(`tyc normalize edilen  : ${tycNormalized}`)
console.log(`akreditasyon dolu     : ${before} -> ${after}`)
console.log('\n--- örnekler ---')
samples.forEach(s => console.log('  ' + s))

if (dry) {
  console.log('\n(--dry: dosya yazılmadı)')
  process.exit(0)
}

writeFileSync(progPath, JSON.stringify(programs))
console.log('\nprograms.json güncellendi.')

// lookup.json'daki akreditasyon alanını da aynı değerlerle güncelle (alan indeksi 18).
const lookupPath = path.join(KDIR, 'lookup.json')
try {
  const lookup = JSON.parse(readFileSync(lookupPath, 'utf8'))
  const accIdx = Array.isArray(lookup.fields) ? lookup.fields.indexOf('accreditation') : 18
  const byCode = new Map(programs.map(p => [String(p.code), p.accreditation]))
  let lookupFixed = 0
  for (const row of lookup.rows || []) {
    const acc = byCode.get(String(row[0]))
    if (acc !== undefined && row[accIdx] !== acc) {
      row[accIdx] = acc
      lookupFixed++
    }
  }
  writeFileSync(lookupPath, JSON.stringify(lookup))
  console.log(`lookup.json güncellendi (alan indeksi ${accIdx}, ${lookupFixed} satır).`)
} catch (err) {
  console.log('lookup.json güncellenemedi:', err.message)
}
