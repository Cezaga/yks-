// Tüm bölüm dosyalarını YÖKATLAS gruplarına otomatik eşler.
// Çıktı: targetsAll.json (rebuild.mjs'in kullanacağı [grup, seviye, slug] listesi)
// ve eşleşmeyenleri raporlar.
import fs from 'fs'
const yok = JSON.parse(fs.readFileSync('yokatlas-2026.json', 'utf8'))
const idx = JSON.parse(fs.readFileSync('../app/public/data/index.json', 'utf8'))

const fold = s => (s || '').toLocaleUpperCase('tr').replace(/[ÇĞİIÖŞÜÂÎÛ]/g, c => ({ 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'I': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' }[c])).replace(/[^A-Z0-9]/g, '')

// YÖKATLAS grup adı -> mevcut seviyeler
const groupLevels = new Map() // foldedName -> {rawName, levels:Set}
for (const x of yok) {
  const k = fold(x.grup)
  if (!groupLevels.has(k)) groupLevels.set(k, { raw: x.grup, levels: new Set() })
  groupLevels.get(k).levels.add(x.tur)
}

const targets = []
const unmatched = []
const ambiguous = []
for (const e of idx) {
  const want = e.level === '2yillik' ? 'ÖNLISANS' : 'LISANS'
  const k = fold(e.name)
  const g = groupLevels.get(k)
  if (g && g.levels.has(want)) {
    targets.push([g.raw, want, e.slug])
  } else if (g && !g.levels.has(want)) {
    // ad eşleşti ama seviye farklı — YÖKATLAS'ta diğer seviyede var
    ambiguous.push(`${e.name} (${e.level}) : grup var ama seviyesi [${[...g.levels].join(',')}]`)
  } else {
    unmatched.push(`${e.name} (${e.level}) [${e.slug}]`)
  }
}
fs.writeFileSync('targetsAll.json', JSON.stringify(targets, null, 0))
console.log('toplam bölüm:', idx.length)
console.log('eşleşen (rebuild edilecek):', targets.length)
console.log('seviye uyuşmazlığı:', ambiguous.length)
console.log('hiç eşleşmeyen:', unmatched.length)
console.log('\n--- SEVİYE UYUŞMAZLIĞI (ilk 30) ---')
ambiguous.slice(0, 30).forEach(x => console.log('  ', x))
console.log('\n--- EŞLEŞMEYEN (ilk 60) ---')
unmatched.slice(0, 60).forEach(x => console.log('  ', x))
