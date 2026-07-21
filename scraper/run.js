import { mkdir, writeFile, readFile, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchPolite, sleep } from './fetchPolite.js'
import { getDepartmentLinks } from './getDepartmentLinks.js'
import { parseDepartmentPage } from './parseDepartmentPage.js'
import { buildIndex } from './rebuildIndex.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'app', 'public', 'data')
const DEPT_DIR = path.join(OUT_DIR, 'departments')
const FAILED_LOG = path.join(__dirname, 'failed.log')

const FORCE = process.argv.includes('--force')
const DELAY_MS = 1500
const CONCURRENCY = 2

async function main() {
  await mkdir(DEPT_DIR, { recursive: true })

  console.log('Bölüm linkleri toplanıyor...')
  const departments = await getDepartmentLinks()
  console.log(`${departments.length} bölüm bulundu.`)

  await writeFile(FAILED_LOG, '')

  const queue = [...departments]
  let done = 0
  let failed = 0
  let skipped = 0

  async function worker() {
    while (queue.length > 0) {
      const dept = queue.shift()
      if (!dept) return
      const outPath = path.join(DEPT_DIR, `${dept.slug}.json`)

      if (!FORCE && existsSync(outPath)) {
        skipped++
        continue
      }

      const res = await fetchPolite(dept.url, { retries: 4, timeoutMs: 35000, backoffMs: [3000, 8000, 15000, 30000] })
      if (!res.ok || !res.html) {
        failed++
        await appendFile(FAILED_LOG, `${dept.url}\t${res.status}\t${res.error?.message ?? ''}\n`)
        await sleep(DELAY_MS)
        continue
      }

      const parsed = parseDepartmentPage(res.html, dept)
      await writeFile(outPath, JSON.stringify(parsed))

      done++
      if (parsed.warnings.length > 0) {
        console.log(`[UYARI] ${dept.name}: ${parsed.warnings.join('; ')}`)
      }
      if ((done + failed + skipped) % 10 === 0) {
        console.log(`İlerleme: ${done} tamam, ${skipped} atlandı, ${failed} hata, ${queue.length} kaldı`)
      }
      await sleep(DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // Build index.json from the authoritative scraped page data (not the listing
  // labels, which cross-link between 2/4-year pages and mislabel departments).
  const { audit } = buildIndex()
  console.log(`index.json yeniden inşa edildi (audit: ${JSON.stringify(audit)})`)

  console.log(`\nBitti. ${done} yeni, ${skipped} zaten vardı, ${failed} başarısız.`)
  if (failed > 0) {
    console.log(`Başarısız URL'ler: ${FAILED_LOG}`)
  }
}

main().catch(err => {
  console.error('Scraper hata ile durdu:', err)
  process.exit(1)
})
