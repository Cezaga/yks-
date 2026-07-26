// Sitemap'teki adayları, RESMİ ÖSYM program listesine karşı eşleştirir.
//
// Mantık: URL deseni tahmin etmek yerine
//   1) taban puanı / başarı sıralaması ile ilgili olabilecek TÜM adresleri al,
//   2) slug'dan yıl ve bilinen kuyrukları atarak "temel ad" çıkar,
//   3) bu adı ÖSYM'nin gerçek program adlarıyla ve elimizdekilerle karşılaştır.
//
// Çıktı: scraper/candidates.json  (bizde olmayan, ÖSYM'de karşılığı olan adaylar)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'app', 'public', 'data')

const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }
const nk = s => String(s || '').toLocaleLowerCase('tr-TR').split('').map(c => FOLD[c] ?? c).join('').replace(/[^a-z0-9]/g, '')

const urls = JSON.parse(readFileSync(path.join(__dirname, 'sitemap_urls.json'), 'utf8'))
const index = JSON.parse(readFileSync(path.join(DATA, 'index.json'), 'utf8'))
const programs = JSON.parse(readFileSync(path.join(DATA, 'kilavuz', 'programs.json'), 'utf8'))

// --- ÖSYM'nin gerçek program adları (parantezsiz temel hâl) -----------------
const osym = new Map() // nk(ad) -> { ad, level, sayi }
for (const p of programs) {
  const base = p.program.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  const k = nk(base)
  if (!k) continue
  const e = osym.get(k)
  if (e) e.sayi++
  else osym.set(k, { ad: base, level: p.level, sayi: 1 })
}

// --- elimizdekiler ---------------------------------------------------------
const haveSlug = new Set(index.map(e => e.slug))
const haveName = new Set(index.map(e => nk(e.name)))

// --- aday adresler ---------------------------------------------------------
// Konuyla ilgisiz olduğu kesin olanları ele; gerisini aday say.
const DISQUALIFY = /\/(category|tag)\/|^dgs-|^lgs-|^kpss-|^ales-|^yds-|^msu-|-dgs-|kpss|lgs|ataturk-ilkeleri|konu-anlatimi|nedir|nasil-|hesaplama|atasozu|atasozleri|deyim|kompozisyon|kitap|siir|sinav-sonuclari|aciklandi|ne-zaman|basvuru|tercih-kilavuzu|yurtlari|burslari|fiyat/i
const RELEVANT = /taban-puan|basari-sirala|kontenjan/i
// Üniversite / kurum sayfaları (bölüm değil)
const INSTITUTION = /universite|universitesi|yuksekokul|enstitusu|kampus|yerleske|fakultesi/i

// Slug'dan yıl ve kuyruk kalıplarını at -> temel ad
const TAILS = [
  'taban-puanlari-ve-basari-siralamalari', 'taban-puanlari-ve-basari-siralamasi',
  'basari-siralamasi-ve-taban-puanlari', 'basari-siralamalari-ve-taban-puanlari',
  'taban-puanlari-basari-siralamalari', 'taban-puanlari-basari-siralamasi',
  'taban-puanlari-son-4-yil-basari-siralamalari', 'taban-puanlari-son-2-yil-basari-siralamalari',
  'taban-puanlari-ve-kontenjanlari', 'taban-puanlari-kontenjanlari',
  'taban-puanlari-ve-yuzdelik-dilimleri', 'taban-puanlari-yuzdelik-dilimleri',
  'basari-siralamalari', 'basari-siralamasi', 'taban-puanlari', 'kontenjanlari',
  'son-4-yil', 'son-2-yil', '2-yillik', '4-yillik'
]

function baseFromSlug(slug) {
  let s = slug
  // sondan başlayarak bilinen kuyrukları ve yılları soyup at
  let changed = true
  while (changed) {
    changed = false
    s = s.replace(/-(?:19|20)\d{2}$/, () => { changed = true; return '' })
    for (const t of TAILS) {
      if (s.endsWith('-' + t)) { s = s.slice(0, -(t.length + 1)); changed = true }
    }
    s = s.replace(/-(?:19|20)\d{2}$/, () => { changed = true; return '' })
  }
  // ortada kalan yıl parçaları
  s = s.replace(/-(?:19|20)\d{2}-/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')
  return s
}

const candidates = new Map() // nk(base) -> { base, urls:[], osym }
let ilgili = 0

for (const u of urls) {
  const p = new URL(u).pathname.replace(/^\/|\/$/g, '')
  if (!RELEVANT.test(p)) continue
  if (DISQUALIFY.test('/' + p) || DISQUALIFY.test(p)) continue
  if (INSTITUTION.test(p)) continue
  ilgili++
  if (haveSlug.has(p)) continue // zaten elimizde

  const base = baseFromSlug(p)
  const k = nk(base)
  if (!k || haveName.has(k)) continue

  let e = candidates.get(k)
  if (!e) { e = { base, urls: [], osym: osym.get(k) || null }; candidates.set(k, e) }
  e.urls.push(u)
}

const withOsym = [...candidates.values()].filter(c => c.osym)
const withoutOsym = [...candidates.values()].filter(c => !c.osym)

console.log('=== SİTEMAP ↔ ÖSYM EŞLEŞTİRME ===')
console.log(`sitemap adresi           : ${urls.length}`)
console.log(`taban puanı ile ilgili   : ${ilgili}`)
console.log(`elimizdeki bölüm         : ${index.length}`)
console.log(`ÖSYM'deki farklı program : ${osym.size}`)
console.log('')
console.log(`ADAY (bizde yok)         : ${candidates.size}`)
console.log(`  ÖSYM'de karşılığı VAR  : ${withOsym.length}   <-- öncelikli, gerçek bölüm`)
console.log(`  ÖSYM'de karşılığı yok  : ${withoutOsym.length}  (kapanmış/farklı adlandırma olabilir)`)

withOsym.sort((a, b) => b.osym.sayi - a.osym.sayi)
console.log('\n--- ÖSYM karşılığı olan adaylar (program sayısına göre) ---')
withOsym.slice(0, 60).forEach(c =>
  console.log(`  ${String(c.osym.sayi).padStart(4)} program | ${c.osym.level.padEnd(8)} | ${c.osym.ad}`)
)

writeFileSync(
  path.join(__dirname, 'candidates.json'),
  JSON.stringify(withOsym.map(c => ({ name: c.osym.ad, level: c.osym.level, programCount: c.osym.sayi, urls: c.urls })), null, 1)
)
console.log(`\ncandidates.json yazıldı: ${withOsym.length} aday`)

// ÖSYM'de olup hiçbir adayı da olmayanlar = bu kaynakta gerçekten yok
const coveredKeys = new Set([...haveName, ...withOsym.map(c => nk(c.osym.ad))])
const hicYok = [...osym.entries()].filter(([k]) => !coveredKeys.has(k)).map(([, v]) => v)
hicYok.sort((a, b) => b.sayi - a.sayi)
console.log(`\n--- ÖSYM'de var, sitemap'te ADAY BİLE YOK: ${hicYok.length} ---`)
hicYok.slice(0, 30).forEach(v => console.log(`  ${String(v.sayi).padStart(4)} | ${v.level.padEnd(8)} | ${v.ad}`))
