// Sanity-check the parser against a handful of live pages before a full run.
// Usage: node validate.js
import { fetchPolite } from './fetchPolite.js'
import { parseDepartmentPage } from './parseDepartmentPage.js'

const SAMPLES = [
  { url: 'https://www.basarisiralamalari.com/bilgisayar-muhendisligi-taban-puanlari/', name: 'Bilgisayar Mühendisliği', slug: 'bilgisayar-muhendisligi-taban-puanlari', level: '4yillik', scoreType: 'SAY' },
  { url: 'https://www.basarisiralamalari.com/hemsirelik-taban-puanlari/', name: 'Hemşirelik', slug: 'hemsirelik-taban-puanlari', level: '4yillik', scoreType: 'SAY' },
  { url: 'https://www.basarisiralamalari.com/hukuk-taban-puanlari/', name: 'Hukuk', slug: 'hukuk-taban-puanlari', level: '4yillik', scoreType: 'EA' }
]

for (const sample of SAMPLES) {
  const res = await fetchPolite(sample.url)
  if (!res.ok || !res.html) {
    console.log(`[FAIL] ${sample.name}: fetch başarısız (status ${res.status})`)
    continue
  }
  const parsed = parseDepartmentPage(res.html, sample)
  console.log(`\n=== ${sample.name} ===`)
  console.log('satır sayısı:', parsed.rows.length)
  console.log('uyarılar:', parsed.warnings)
  console.log('örnek satır:', JSON.stringify(parsed.rows[0], null, 2))
}
