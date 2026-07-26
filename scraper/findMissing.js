// Kaynak sitenin sitemap'inden TÜM bölüm sayfalarını toplar ve elimizdeki
// listeyle karşılaştırır. Amaç: liste sayfalarından link çıkarırken kaçırdığımız
// bölümleri bulmak (ör. "Adalet" sitede var ama bizde yoktu).
//
// Kullanım: node scraper/findMissing.js            -> sadece raporlar
//           node scraper/findMissing.js --write    -> links_missing.json yazar
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchPolite } from './fetchPolite.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'app', 'public', 'data')

const SITEMAP = 'https://www.basarisiralamalari.com/wp-sitemap.xml'
// Bölüm sayfası URL deseni (2024 seti)
const DEPT_RE = /-(?:2024|2025)-(?:taban-puanlari-ve-basari-siralamasi|basari-siralamasi-ve-taban-puanlari|taban-puanlari-ve-basari-siralamalari)\/?$/i

async function locs(url) {
  const r = await fetchPolite(url, { retries: 3, timeoutMs: 35000 })
  if (!r.ok || !r.html) return []
  return [...r.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim())
}

console.log('sitemap indeksi okunuyor...')
const subs = await locs(SITEMAP)
const postMaps = subs.filter(u => /wp-sitemap-posts-post-\d+\.xml/.test(u))
console.log(`${postMaps.length} alt sitemap bulundu.`)

const all = new Set()
for (const [i, sm] of postMaps.entries()) {
  const urls = await locs(sm)
  urls.forEach(u => all.add(u))
  console.log(`  [${i + 1}/${postMaps.length}] ${sm.split('/').pop()} -> ${urls.length} URL (toplam ${all.size})`)
}

const deptUrls = [...all].filter(u => {
  const p = new URL(u).pathname
  if (/\/category\/|\/tag\//i.test(p)) return false
  return DEPT_RE.test(p)
})

console.log(`\nsitemap'te bölüm sayfası: ${deptUrls.length}`)

// Elimizdekiler
const index = JSON.parse(readFileSync(path.join(DATA, 'index.json'), 'utf8'))
const haveSlugs = new Set(index.map(e => e.slug))
// links dosyalarındaki slug'lar (index'e girmemiş boş sayfalar da olabilir)
for (const f of ['links_4.json', 'links_2.json']) {
  const p = path.join(__dirname, f)
  if (!existsSync(p)) continue
  for (const l of JSON.parse(readFileSync(p, 'utf8'))) haveSlugs.add(l.slug)
}

const missing = deptUrls
  .map(u => ({ url: u, slug: new URL(u).pathname.replace(/^\/|\/$/g, '') }))
  .filter(x => !haveSlugs.has(x.slug))

// Okunabilir ad: slug'dan türet
const prettify = s =>
  s.replace(DEPT_RE, '')
    .replace(/-2-yillik$/, '')
    .split('-')
    .map(w => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1))
    .join(' ')

console.log(`elimizde olan slug   : ${haveSlugs.size}`)
console.log(`EKSİK bölüm sayfası  : ${missing.length}`)
console.log('\n--- eksikler (ilk 50) ---')
missing.slice(0, 50).forEach(m => console.log('  ' + prettify(m.slug)))

if (process.argv.includes('--write')) {
  writeFileSync(
    path.join(__dirname, 'links_missing.json'),
    JSON.stringify(missing.map(m => ({ name: prettify(m.slug), slug: m.slug, url: m.url, level: null, scoreType: null })), null, 1)
  )
  console.log(`\nlinks_missing.json yazıldı (${missing.length} kayıt).`)
}
