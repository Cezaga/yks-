// Sitemap'teki TÜM adresleri diske döker. Desen tahmini yapmaz — sınıflandırma
// ayrı adımda, sayfanın kendi içeriğine bakılarak yapılır.
//
// Kullanım: node scraper/dumpSitemap.js
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchPolite, sleep } from './fetchPolite.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITEMAP = 'https://www.basarisiralamalari.com/wp-sitemap.xml'

async function locs(url) {
  const r = await fetchPolite(url, { retries: 3, timeoutMs: 40000, backoffMs: [3000, 8000, 15000] })
  if (!r.ok || !r.html) {
    console.log(`  ! okunamadı: ${url} (status ${r.status})`)
    return []
  }
  return [...r.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim())
}

const subs = await locs(SITEMAP)
const maps = subs.filter(u => /wp-sitemap-.*\.xml/.test(u))
console.log(`${maps.length} alt sitemap`)

const all = new Set()
for (const [i, sm] of maps.entries()) {
  const urls = await locs(sm)
  urls.forEach(u => all.add(u))
  console.log(`  [${i + 1}/${maps.length}] ${sm.split('/').pop()} -> ${urls.length} (toplam ${all.size})`)
  await sleep(400)
}

const list = [...all].sort()
writeFileSync(path.join(__dirname, 'sitemap_urls.json'), JSON.stringify(list, null, 1))
console.log(`\nsitemap_urls.json yazıldı: ${list.length} adres`)

// Kuyruk deseni dağılımı — hangi biçimler var, görelim
const tails = new Map()
for (const u of list) {
  const p = new URL(u).pathname.replace(/^\/|\/$/g, '')
  const m = p.match(/(?:^|-)((?:19|20)\d{2}-.*)$/)
  const tail = m ? m[1].replace(/^\d{4}-/, '') : '(yıl yok)'
  tails.set(tail, (tails.get(tail) || 0) + 1)
}
console.log('\n--- en sık URL kuyrukları ---')
;[...tails.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  .forEach(([t, n]) => console.log(`  ${String(n).padStart(5)}  ${t.slice(0, 70)}`))
