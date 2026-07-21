import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { fetchPolite } from './fetchPolite.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LISTING_PAGES = [
  {
    url: 'https://www.basarisiralamalari.com/4-yillik-bolumlerin-basari-siralamalari-taban-puanlari-osym/',
    level: '4yillik'
  },
  {
    url: 'https://www.basarisiralamalari.com/2-yillik-universite-onlisans-bolumleri-basari-siralamasi-taban-puanlari/',
    level: '2yillik'
  }
]

// Department page URLs end in "-taban-puanlari-ve-basari-siralamasi" (2024 set).
const DEPARTMENT_URL_RE = /-taban-puanlari(-ve-basari-siralamasi)?\/?$/i
const LINK_TEXT_RE = /^(.*?)\s+Taban Puanlar[ıi]/u

function cleanName(name) {
  return name
    .replace(/\s+Taban Puanlar[ıi].*$/iu, '')
    .replace(/\s*\(\d\s*Y[ıi]ll[ıi]k\).*$/iu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Preferred path: read link lists exported from the browser (the two listing
// pages return 500/504 to Node, but the browser renders them fine).
function fromLocalFiles() {
  const files = ['links_4.json', 'links_2.json']
    .map(f => path.join(__dirname, f))
    .filter(existsSync)
  if (files.length === 0) return null

  const map = new Map()
  for (const file of files) {
    const arr = JSON.parse(readFileSync(file, 'utf8'))
    for (const l of arr) {
      if (!l.url || !DEPARTMENT_URL_RE.test(new URL(l.url).pathname)) continue
      const name = cleanName(l.name || '')
      if (!name || /^(KPSS|DGS|Lise|Besyo)\b/i.test(name)) continue
      map.set(l.url, {
        name,
        url: l.url,
        slug: new URL(l.url).pathname.replace(/^\/|\/$/g, ''),
        level: l.level,
        scoreType: l.scoreType || null
      })
    }
  }
  return [...map.values()]
}

// Fallback: scrape the listing pages directly (used only if link files absent).
async function fromLive() {
  const results = new Map()
  for (const { url, level } of LISTING_PAGES) {
    const res = await fetchPolite(url, { retries: 5, timeoutMs: 45000, backoffMs: [3000, 8000, 15000, 25000, 40000] })
    if (!res.ok || !res.html) {
      throw new Error(`Liste sayfası çekilemedi: ${url} (status ${res.status})`)
    }
    const $ = cheerio.load(res.html)
    $('a').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return
      let pathname
      try { pathname = new URL(href, url).pathname } catch { return }
      if (!DEPARTMENT_URL_RE.test(pathname)) return
      if (/\/category\/|\/tag\//i.test(pathname)) return
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      const m = text.match(LINK_TEXT_RE)
      const absoluteUrl = new URL(pathname, url).toString()
      results.set(absoluteUrl, {
        name: cleanName(m ? m[1] : text),
        url: absoluteUrl,
        slug: pathname.replace(/^\/|\/$/g, ''),
        level,
        scoreType: null
      })
    })
  }
  return [...results.values()]
}

export async function getDepartmentLinks() {
  return fromLocalFiles() ?? (await fromLive())
}
