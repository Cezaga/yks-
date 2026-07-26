// links_missing.json'daki eksik bölümleri çeker, departments/ altına yazar ve
// index.json'u yeniden kurar.
//
// Kullanım: node scraper/fetchMissing.js
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { fetchPolite, sleep } from './fetchPolite.js'
import { parseDepartmentPage } from './parseDepartmentPage.js'
import { buildIndex } from './rebuildIndex.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'app', 'public', 'data', 'departments')

// Bölüm değil, kampüs/kurum sayfası olanlar
const NOT_A_DEPARTMENT = /kampusu|yerleskesi|enstitusu-|universite/i

const missing = JSON.parse(readFileSync(path.join(__dirname, 'links_missing.json'), 'utf8'))
  .filter(m => !NOT_A_DEPARTMENT.test(m.slug))

console.log(`${missing.length} eksik bölüm çekilecek.\n`)

/** Sayfa başlığından düzgün Türkçe bölüm adını çıkar. */
function nameFromPage(html, fallback) {
  const $ = cheerio.load(html)
  const raw = ($('h1').first().text() || $('title').text() || '').replace(/\s+/g, ' ').trim()
  // "Adalet 2025 Taban Puanları ve Başarı Sıralamaları" -> "Adalet"
  const m = raw.match(/^(.*?)\s*(?:\(\s*\d\s*Y[ıi]ll[ıi]k\s*\))?\s*\d{4}\s*Taban\s*Puan/i)
  const name = (m ? m[1] : raw.split(/\s+\d{4}\s+/)[0] || '').replace(/\s+/g, ' ').trim()
  return name || fallback
}

let ok = 0
let bos = 0
let hata = 0
const eklenen = []

for (const [i, dept] of missing.entries()) {
  const res = await fetchPolite(dept.url, { retries: 3, timeoutMs: 35000, backoffMs: [3000, 8000, 15000] })
  if (!res.ok || !res.html) {
    console.log(`  [${i + 1}/${missing.length}] HATA ${dept.name} (status ${res.status})`)
    hata++
    await sleep(800)
    continue
  }

  const name = nameFromPage(res.html, dept.name)
  const parsed = parseDepartmentPage(res.html, {
    name,
    slug: dept.slug,
    level: null, // rebuildIndex sayfanın kendi verisinden türetecek
    scoreType: null,
    url: dept.url
  })

  if (parsed.rows.length === 0) {
    console.log(`  [${i + 1}/${missing.length}] BOŞ  ${name} (${parsed.warnings.join('; ')})`)
    bos++
    await sleep(800)
    continue
  }

  const file = path.join(OUT, `${dept.slug}.json`)
  const yeni = !existsSync(file)
  writeFileSync(file, JSON.stringify(parsed))
  console.log(`  [${i + 1}/${missing.length}] OK   ${name} -> ${parsed.rows.length} satır${yeni ? '' : ' (üzerine yazıldı)'}`)
  ok++
  eklenen.push({ name, slug: dept.slug, rows: parsed.rows.length })
  await sleep(900)
}

console.log(`\nÇekim bitti: ${ok} eklendi, ${bos} boş, ${hata} hata.`)

if (ok > 0) {
  const { audit } = buildIndex()
  console.log(`index.json yeniden kuruldu: ${JSON.stringify(audit)}`)
  console.log('\nEklenen bölümler:')
  eklenen.forEach(e => console.log(`  ${e.name} (${e.rows} satır)`))
}
