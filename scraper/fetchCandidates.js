// candidates.json'daki adayları çeker. Her adayın birden çok URL'si olabilir
// (farklı yıl/kalıp); en çok satır veren sürüm kaydedilir.
//
// Kullanım: node scraper/fetchCandidates.js
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { fetchPolite, sleep } from './fetchPolite.js'
import { parseDepartmentPage } from './parseDepartmentPage.js'
import { buildIndex } from './rebuildIndex.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'app', 'public', 'data', 'departments')

const candidates = JSON.parse(readFileSync(path.join(__dirname, 'candidates.json'), 'utf8'))
console.log(`${candidates.length} aday denenecek.\n`)

function nameFromPage(html, fallback) {
  const $ = cheerio.load(html)
  const raw = ($('h1').first().text() || $('title').text() || '').replace(/\s+/g, ' ').trim()
  const m = raw.match(/^(.*?)\s*(?:\(\s*\d\s*Y[ıi]ll[ıi]k\s*\))?\s*\d{4}\s*Taban\s*Puan/i)
  const name = (m ? m[1] : raw.split(/\s+\d{4}\s+/)[0] || '').replace(/\s+/g, ' ').trim()
  return name || fallback
}

let ok = 0, bos = 0, hata = 0
const eklenen = []
const basarisiz = []

for (const [i, c] of candidates.entries()) {
  let best = null
  let fetched = false // sayfa alınabildi mi (0 satırı "hata" sanmamak için)

  for (const url of c.urls) {
    // Site arka arkaya gelen isteklerde geçici olarak reddedebiliyor; sabırlı ol.
    const res = await fetchPolite(url, { retries: 4, timeoutMs: 45000, backoffMs: [5000, 12000, 25000, 40000] })
    await sleep(2000)
    if (!res.ok || !res.html) continue
    fetched = true

    const slug = new URL(url).pathname.replace(/^\/|\/$/g, '')
    const parsed = parseDepartmentPage(res.html, {
      name: nameFromPage(res.html, c.name),
      slug,
      level: null,
      scoreType: null,
      url
    })
    if (parsed.rows.length > (best?.parsed.rows.length ?? 0)) best = { parsed, slug }
  }

  if (!best && !fetched) {
    console.log(`  [${i + 1}/${candidates.length}] HATA ${c.name} (sayfa alınamadı)`)
    hata++
    basarisiz.push({ ...c, sebep: 'sayfa alınamadı' })
    continue
  }
  if (!best || best.parsed.rows.length === 0) {
    console.log(`  [${i + 1}/${candidates.length}] BOŞ  ${c.name}`)
    bos++
    basarisiz.push({ ...c, sebep: 'tablo yok/boş' })
    continue
  }

  writeFileSync(path.join(OUT, `${best.slug}.json`), JSON.stringify(best.parsed))
  console.log(`  [${i + 1}/${candidates.length}] OK   ${best.parsed.name} -> ${best.parsed.rows.length} satır`)
  ok++
  eklenen.push({ name: best.parsed.name, rows: best.parsed.rows.length, osymPrograms: c.programCount })
}

console.log(`\nBitti: ${ok} eklendi, ${bos} boş, ${hata} hata.`)

if (basarisiz.length) {
  writeFileSync(path.join(__dirname, 'candidates_failed.json'), JSON.stringify(basarisiz, null, 1))
  console.log(`candidates_failed.json yazıldı (${basarisiz.length}).`)
}

if (ok > 0) {
  const { audit } = buildIndex()
  console.log(`index.json yeniden kuruldu: ${JSON.stringify(audit)}`)
  eklenen.sort((a, b) => b.osymPrograms - a.osymPrograms)
  console.log('\nEklenenler (ÖSYM program sayısına göre):')
  eklenen.forEach(e => console.log(`  ${String(e.osymPrograms).padStart(4)} program | ${e.name} (${e.rows} satır)`))
}
