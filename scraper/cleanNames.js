// Bölüm adlarındaki gereksiz ekleri temizler.
//   "Mahkeme Büro Hizmetleri (2 Yıllık)" -> "Mahkeme Büro Hizmetleri"
// Seviye bilgisi zaten `level` alanında; ad içinde tekrarı hem arayüzde
// gürültü yapıyor hem de resmi ÖSYM adıyla eşleşmeyi bozuyor.
//
// Kullanım: node scraper/cleanNames.js [--dry]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEPT_DIR = path.join(__dirname, '..', 'app', 'public', 'data', 'departments')
const dry = process.argv.includes('--dry')

function clean(name) {
  return String(name || '')
    .replace(/\s*\(\s*\d\s*Y[ıi]ll[ıi]k\s*\)\s*/giu, ' ')   // (2 Yıllık)
    .replace(/\s*\(\s*[Öö]n\s*Lisans\s*\)\s*/giu, ' ')       // (Ön Lisans)
    .replace(/\s+(?:19|20)\d{2}\s*$/,'')                       // YEAR IN NAME: sondaki yıl
    .replace(/\s*-\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

let changed = 0
const samples = []

for (const f of readdirSync(DEPT_DIR).filter(x => x.endsWith('.json'))) {
  const p = path.join(DEPT_DIR, f)
  const d = JSON.parse(readFileSync(p, 'utf8'))
  const yeni = clean(d.name)
  if (yeni && yeni !== d.name) {
    if (samples.length < 15) samples.push(`"${d.name}" -> "${yeni}"`)
    d.name = yeni
    changed++
    if (!dry) writeFileSync(p, JSON.stringify(d))
  }
}

console.log(`ad temizlendi: ${changed} bölüm${dry ? ' (--dry)' : ''}`)
samples.forEach(s => console.log('  ' + s))
