// ÖSYM 2026 kılavuzundaki öğrenim ücreti tablolarını çıkarır.
//
//   Vakıf yükseköğretim kurumları : PDF s. 697-759
//   KKTC üniversiteleri           : PDF s. 760-788
//
// Tablo düzeni (ikisi de aynı):
//   ÜNİVERSİTE ADI | Öğrenim Düzeyi | AD (program) | ÜCRET | AÇIKLAMA
//
// Satırlar sütun hizalı gelir (-table). Uzun üniversite/program/açıklama metinleri
// alt satıra taşar; taşan parça, ait olduğu sütunun karakter aralığında durur.
// Bu yüzden veri satırının sütun sınırlarını bulup, takip eden taşma satırlarını
// aynı sınırlara göre doğru alana ekliyoruz.
//
// Kullanım: node scraper/parseUcretler.js [--dry]
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PDF = 'C:/Users/yusuf/OneDrive/Masaüstü/kontkilavuz_yktd21072026.pdf'
const OUT_DIR = path.join(__dirname, '..', 'app', 'public', 'data', 'kilavuz')

const SECTIONS = [
  { kind: 'vakif', from: 697, to: 759 },
  { kind: 'kktc', from: 760, to: 788 }
]

const MONEY = /\d{1,3}(?:\.\d{3})*,\d{2}/
const LEVEL = /(Hazırlık\s+Programı|Hazırlık|Önlisans|Ön\s+Lisans|Lisans)/
const SKIP = /ÖĞRENİM ÜCRETLERİ|ÜNİVERSİTE ADI|Öğretim Yılı|^\s*Düzeyi\s*$|KDV dahildir|yükseköğretim kurumu|Mütevelli|tercihlerini|Adayların|internet\s+sayfas|YKS\s*$/i

const clean = s => (s || '').replace(/\s+/g, ' ').trim()

function levelOf(text) {
  const t = clean(text).toLocaleLowerCase('tr')
  if (t.startsWith('hazırlık')) return 'hazirlik'
  if (t.startsWith('önlisans') || t.startsWith('ön lisans')) return 'onlisans'
  if (t.startsWith('lisans')) return 'lisans'
  return null
}

function pageText(page) {
  try {
    return execFileSync(
      'pdftotext',
      ['-enc', 'UTF-8', '-table', '-nodiag', '-f', String(page), '-l', String(page), PDF, '-'],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 }
    )
  } catch {
    return ''
  }
}

const rows = []
let skippedPages = 0

for (const { kind, from, to } of SECTIONS) {
  for (let page = from; page <= to; page++) {
    const txt = pageText(page)
    if (!txt) {
      skippedPages++
      continue
    }

    // JS'te "." karakteri \r ile eşleşmediği için CRLF'i baştan temizliyoruz.
    const lines = txt.split(/\r?\n/).map(l => l.replace(/\r/g, ''))

    // 1. geçiş: ÜCRET sütununun bu sayfadaki başlangıç konumunu tespit et.
    // (Ücret satırın herhangi bir yerinden alınırsa açıklama metnindeki sayılar
    //  -"1.075,000 TL'dir", "20.000,00 (yirmibin) kayıt ücreti"- ücret sanılıyor.)
    const feeIdxCounts = new Map()
    for (const line of lines) {
      if (SKIP.test(line)) continue
      const lvl = line.match(LEVEL)
      if (!lvl || lvl.index === 0) continue
      const m = line.slice(lvl.index + lvl[0].length).match(MONEY)
      if (!m) continue
      const idx = lvl.index + lvl[0].length + m.index
      feeIdxCounts.set(idx, (feeIdxCounts.get(idx) || 0) + 1)
    }
    let feeCol = null
    let bestCount = 0
    for (const [idx, n] of feeIdxCounts) {
      if (n > bestCount) { bestCount = n; feeCol = idx }
    }
    const FEE_TOL = 12 // sütun içi küçük kaymalara tolerans

    let current = null // { row, uniEnd, progStart, progEnd, aciklamaStart }

    for (const line of lines) {
      if (!line.trim()) continue
      if (SKIP.test(line)) { current = null; continue }

      const lvl = line.match(LEVEL)

      // Ücreti yalnızca ÜCRET sütunu civarında ara.
      let money = null
      if (feeCol != null) {
        const from = Math.max(0, feeCol - FEE_TOL)
        const seg = line.slice(from, feeCol + FEE_TOL + 18)
        const m = seg.match(MONEY)
        if (m) money = { 0: m[0], index: from + m.index }
      }

      // Veri satırı: düzey anahtar sözcüğü var ve satır başında üniversite adı var.
      const isDataRow = lvl && lvl.index > 0

      if (isDataRow) {
        const uniEnd = lvl.index
        const progStart = lvl.index + lvl[0].length
        // Program sütunu her hâlükârda ÜCRET sütununda biter; ücret yoksa bile
        // açıklama metni program adına karışmasın.
        const progEnd = feeCol != null ? Math.min(feeCol, line.length) : (money ? money.index : line.length)
        const aciklamaStart = money
          ? money.index + money[0].length
          : (feeCol != null ? Math.min(feeCol + FEE_TOL + 6, line.length) : line.length)

        const row = {
          kind,
          university: clean(line.slice(0, uniEnd)),
          level: levelOf(lvl[0]),
          program: clean(line.slice(progStart, progEnd)),
          feeText: money ? money[0] : null,
          fee: money ? Number(money[0].replace(/\./g, '').replace(',', '.')) : null,
          note: clean(line.slice(aciklamaStart)),
          page
        }
        rows.push(row)
        current = { row, uniEnd, progStart, progEnd, aciklamaStart }
        continue
      }

      // Taşma satırı: parçaları ait oldukları sütuna ekle.
      if (current) {
        const { row, uniEnd, progStart, progEnd, aciklamaStart } = current
        const uniPart = clean(line.slice(0, uniEnd))
        const progPart = clean(line.slice(progStart, progEnd))
        const notePart = clean(line.slice(aciklamaStart))
        if (uniPart) row.university = clean(row.university + ' ' + uniPart)
        if (progPart) row.program = clean(row.program + ' ' + progPart)
        if (notePart) row.note = clean(row.note + ' ' + notePart)
      }
    }
  }
}

// Aynı üniversite+program+düzey birden çok kez geçebilir; ilkini tut.
const seen = new Set()
const unique = []
for (const r of rows) {
  if (!r.university || !r.program) continue
  const key = `${r.university}||${r.program}||${r.level}`
  if (seen.has(key)) continue
  seen.add(key)
  unique.push(r)
}

const withFee = unique.filter(r => r.fee != null)
const unis = new Set(unique.map(r => r.university))

console.log('=== ÖĞRENİM ÜCRETİ ÇIKARIMI ===')
console.log(`ham satır        : ${rows.length}`)
console.log(`tekilleştirilmiş : ${unique.length}`)
console.log(`ücreti olan      : ${withFee.length}`)
console.log(`üniversite       : ${unis.size}`)
console.log(`vakıf / kktc     : ${unique.filter(r => r.kind === 'vakif').length} / ${unique.filter(r => r.kind === 'kktc').length}`)
console.log(`düzey dağılımı   : ${JSON.stringify(unique.reduce((a, r) => { a[r.level] = (a[r.level] || 0) + 1; return a }, {}))}`)
if (skippedPages) console.log(`okunamayan sayfa : ${skippedPages}`)
if (withFee.length) {
  const fees = withFee.map(r => r.fee).sort((a, b) => a - b)
  console.log(`ücret aralığı    : ${fees[0].toLocaleString('tr-TR')} - ${fees[fees.length - 1].toLocaleString('tr-TR')} ₺`)
}
console.log('\n--- örnekler ---')
unique.slice(0, 5).forEach(r => console.log(`  ${r.university} | ${r.level} | ${r.program} | ${r.feeText ?? '-'}`))

if (process.argv.includes('--dry')) {
  console.log('\n(--dry: dosya yazılmadı)')
  process.exit(0)
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(path.join(OUT_DIR, 'fees.json'), JSON.stringify(unique.map(({ page, ...r }) => r)))
console.log(`\nfees.json yazıldı (${unique.length} kayıt).`)
