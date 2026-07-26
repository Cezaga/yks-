// Kalan ÖSYM programları için sitemap'te BULANIK ad araması yapar.
//
// Neden gerekli: slug her zaman program adıyla birebir başlamıyor
//   "Rehberlik ve Psikolojik Danışmanlık" -> pdr-rehberlik-ve-psikolojik-danismanlik-2024-...
// Ayrıca aynı bölümün birden çok yılı var; EN YENİ yılı tercih ediyoruz.
//
// Çıktı: scraper/candidates.json (fetchCandidates.js ile çekilebilir)
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

// ÖSYM temel program adları
const osym = new Map()
for (const p of programs) {
  const base = p.program.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  const k = nk(base)
  if (!k) continue
  const e = osym.get(k)
  if (e) e.sayi++
  else osym.set(k, { ad: base, level: p.level, sayi: 1 })
}

const haveName = new Set(index.map(e => nk(e.name)))
const haveSlug = new Set(index.map(e => e.slug))

// Aranacaklar: ÖSYM'de olup bizde adı geçmeyenler
const gaps = [...osym.entries()].filter(([k]) => !haveName.has(k)).map(([k, v]) => ({ key: k, ...v }))
gaps.sort((a, b) => b.sayi - a.sayi)

const EXCLUDE = /^dgs-|-dgs-|^lgs-|^kpss-|nedir|hakkinda-bilgi|kac-net|bolumu$|-bolumu-|taban-puanlari-ve-kontenjanlari|kontenjanlari$/i
const RELEVANT = /taban-puan|basari-sirala/i

// slug -> yıl (en yenisi tercih edilsin)
const yearOf = s => {
  const m = [...s.matchAll(/(?:^|-)((?:20)\d{2})(?:-|$)/g)].map(x => Number(x[1]))
  return m.length ? Math.max(...m) : 0
}

const found = []
const notFound = []

for (const g of gaps) {
  const cands = []
  for (const u of urls) {
    const p = new URL(u).pathname.replace(/^\/|\/$/g, '')
    if (haveSlug.has(p)) continue
    if (!RELEVANT.test(p)) continue
    if (EXCLUDE.test(p)) continue
    const sk = nk(p)
    // Program adının tamamı slug içinde geçiyor mu?
    if (!sk.includes(g.key)) continue
    cands.push({ url: u, slug: p, year: yearOf(p) })
  }
  if (cands.length === 0) { notFound.push(g); continue }
  cands.sort((a, b) => b.year - a.year)
  found.push({ name: g.ad, level: g.level, programCount: g.sayi, urls: cands.slice(0, 3).map(c => c.url) })
}

console.log('=== BULANIK AD ARAMASI ===')
console.log(`ÖSYM'de olup bizde olmayan : ${gaps.length}`)
console.log(`  sitemap'te BULUNAN       : ${found.length}`)
console.log(`  hiç bulunamayan          : ${notFound.length}`)

found.sort((a, b) => b.programCount - a.programCount)
console.log('\n--- bulunanlar ---')
found.slice(0, 40).forEach(f =>
  console.log(`  ${String(f.programCount).padStart(4)} | ${f.level.padEnd(8)} | ${f.name}\n        ${new URL(f.urls[0]).pathname.slice(1, 80)}`)
)

console.log('\n--- hiç bulunamayanlar (bu kaynakta yok) ---')
notFound.slice(0, 25).forEach(g => console.log(`  ${String(g.sayi).padStart(4)} | ${g.level.padEnd(8)} | ${g.ad}`))

writeFileSync(path.join(__dirname, 'candidates.json'), JSON.stringify(found, null, 1))
console.log(`\ncandidates.json yazıldı: ${found.length}`)
