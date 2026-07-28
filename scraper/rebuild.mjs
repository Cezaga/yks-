// YÖKATLAS'ı referans alarak bir bölümü yeniden kurar.
//
// Kural:
//   - Otoriter liste = YÖKATLAS 2026 (grup+seviye).
//   - Her çıktı satırı için üniversite adı, şehir, fakülte, sektör, program adı,
//     puan türü ve 2025 sıra/taban YÖKATLAS'tan gelir (resmi, kesin).
//   - Geçmiş yıllar (2022-2024) ve 2025 kontenjan/yerleşen bizim eski veriden
//     korunur; eski satır YÖKATLAS satırına (aynı üni+şehir+etiket kovası içinde)
//     2025 sırasına EN YAKIN olana eşlenerek bağlanır.
//   - Eski veride olup YÖKATLAS 2026'da olmayan program SİLİNİR (loglanır).
//   - YÖKATLAS'ta olup bizde olmayan program EKLENİR (yalnızca 2025 verisiyle).
//
// Varsayılan: KURU çalıştırma (yazmaz). Yazmak için:  node rebuild.mjs --write

import fs from 'fs'
const WRITE = process.argv.includes('--write')
const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]
const yok = JSON.parse(fs.readFileSync('yokatlas-2026.json', 'utf8'))
const TARGETS_FILE = process.argv.find(a => a.startsWith('--targets='))?.split('=')[1] || 'targets46.json'
const targets = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'))
const DEP = '../app/public/data/departments/'

// --- normalize ---
const fold = s => (s || '').toLocaleUpperCase('tr').replace(/[ÇĞİIÖŞÜÂÎÛ]/g, c => ({ 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'I': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' }[c])).replace(/[^A-Z0-9]/g, '')
const stripCity = s => String(s).replace(/\s*\([^)]*\)\s*$/, '')
const uniKeys = [...new Set(yok.map(x => fold(stripCity(x.uni))))].sort((a, b) => b.length - a.length)
function canonUni(name) { const k = fold(stripCity(name)); if (uniKeys.includes(k)) return k; return uniKeys.find(u => k.startsWith(u) && u.length >= 8) || k }
function tags(str) {
  const p = ' ' + String(str).toLocaleLowerCase('tr') + ' '; const t = []
  if (/i̇ngilizce|ingilizce/.test(p)) t.push('ing'); else if (/almanca/.test(p)) t.push('alm'); else if (/fransızca/.test(p)) t.push('fra'); else if (/arapça/.test(p)) t.push('ara')
  if (/%\s*50|50\s*i̇ndirimli|50\s*indirimli/.test(p)) t.push('i50'); else if (/%\s*25|25\s*i̇ndirimli|25\s*indirimli/.test(p)) t.push('i25'); else if (/burslu/.test(p)) t.push('brs'); else if (/ücretli/.test(p)) t.push('ucr')
  if (/uzaktan/.test(p)) t.push('uzk'); if (/i̇kinci|ikinci/.test(p)) t.push('io'); if (/açıköğretim|acikogretim/.test(p)) t.push('ao'); if (/kktc/.test(p)) t.push('kktc')
  return t.sort().join('+') || 'std'
}
// Anahtar şehir İÇERMEZ: aynı programın şehri iki kaynakta farklı yazılabiliyor
// (ilçe/il, KKTC vb.) ve bu sahte sil+ekle üretiyordu. Çok kampüslü çakışmalar
// kova içinde "2025 sırasına en yakın" eşlemeyle çözülüyor.
const key = (uni, city, prog) => canonUni(uni) + '#' + tags(prog)
// gevşek anahtar: yalnızca üni + burs kademesi (dil/kampüs etiketini yok sayar).
// Geçmiş yılı taşımak için ikinci tur eşlemede kullanılır.
function fundOf(str) {
  const p = ' ' + String(str).toLocaleLowerCase('tr') + ' '
  if (/%\s*50|50\s*i̇ndirimli|50\s*indirimli/.test(p)) return 'i50'
  if (/%\s*25|25\s*i̇ndirimli|25\s*indirimli/.test(p)) return 'i25'
  if (/burslu/.test(p)) return 'brs'
  if (/ücretli/.test(p)) return 'ucr'
  return 'std'
}
const looseKey = (uni, prog) => canonUni(uni) + '#' + fundOf(prog)

// --- biçimleme ---
const trNum = n => Number(n).toLocaleString('tr-TR')
const trScore = n => Number(n).toFixed(5).replace('.', ',')
const sektor = t => {
  if (t === 'DEVLET') return 'Devlet'
  if (t === 'VAKIF') return 'Vakıf'
  if (t === 'KKTC') return 'KKTC'
  if (/YURTDISI|YURT DIŞI/.test(t || '')) return /VAKIF|ÖZEL/.test(t) ? 'Vakıf' : 'Devlet'
  return t
}
function cleanUni(uni, il, uniTur) {
  // sondaki "(ŞEHİR)" ekini at: il ile eşleşiyorsa ya da yurt dışı kurumsa
  // (yurt dışı üniversitelerde parantez ülkeyi/şehri belirtir, ör. "(BAKÜ-AZERBAYCAN)")
  const m = String(uni).match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (m && (fold(m[2]) === fold(il) || /YURTDISI|YURT DIŞI/.test(uniTur || ''))) return m[1].trim()
  return String(uni).trim()
}
function trTitle(s) {
  return String(s).toLocaleLowerCase('tr').replace(/(^|[\s\-\/(])([a-zçğıöşü])/g, (m, a, b) => a + b.toLocaleUpperCase('tr'))
}
function faculty(fak, il) {
  if (!fak) return null
  const m = String(fak).match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  const base = (m && fold(m[2]) === fold(il)) ? m[1].trim() : String(fak).trim()
  return trTitle(base)
}
const parseRank = s => (s && /^[\d.]+$/.test(String(s))) ? parseInt(String(s).replace(/\./g, '')) : null

// 2025 yıl kaydını kur (YÖKATLAS otoriter, eski kontenjan/yerleşen korunur)
function year2025(y, old2025) {
  const e = { year: 2025, quota: old2025?.quota ?? null, placed: old2025?.placed ?? null, rank: null, rankNumeric: null, score: null, scoreNumeric: null }
  if (y.bs != null && Number(y.bs) > 0) {
    e.rank = trNum(y.bs); e.rankNumeric = Number(y.bs)
    if (y.taban != null && Number(y.taban) > 0) { e.score = trScore(y.taban); e.scoreNumeric = Number(y.taban) }
    else if (old2025) { e.score = old2025.score; e.scoreNumeric = old2025.scoreNumeric }
  } else if (old2025) {
    // YÖKATLAS'ta 2025 sırası yok (dolmamış/yeni); eski değeri koru
    return { ...old2025, year: 2025 }
  }
  return e
}

function rebuildDept(grup, lvl, slug) {
  const path = DEP + slug + '.json'
  const file = JSON.parse(fs.readFileSync(path, 'utf8'))
  const yrows = yok.filter(x => x.grup === grup && x.tur === lvl)

  // eski satırları kovalara ayır
  const oldByKey = new Map()
  for (const r of file.rows) { const k = key(r.university, r.city, r.programRaw); if (!oldByKey.has(k)) oldByKey.set(k, []); oldByKey.get(k).push(r) }
  const usedOld = new Set()

  // en yakın kullanılmamış eski satırı bul (verilen aday listesinden)
  const pickClosest = (y, cands) => {
    let best = null, bestD = Infinity
    for (const r of cands) {
      if (usedOld.has(r)) continue
      const or = parseRank((r.years || []).find(v => v.year === 2025)?.rank)
      const d = (or != null && y.bs != null) ? Math.abs(or - y.bs) : 1e12
      if (d < bestD) { bestD = d; best = r }
    }
    return best
  }

  // eski satırları gevşek anahtara da indeksle (2. tur için)
  const oldByLoose = new Map()
  for (const r of file.rows) { const k = looseKey(r.university, r.programRaw); if (!oldByLoose.has(k)) oldByLoose.set(k, []); oldByLoose.get(k).push(r) }

  // YÖKATLAS satırları — 1. tur (sıkı) sonra 2. tur (gevşek) eşleme
  const matches = new Map() // y -> old|null
  for (const y of yrows) {
    const best = pickClosest(y, oldByKey.get(key(y.uni, y.il, y.birim)) || [])
    if (best) { usedOld.add(best); matches.set(y, best) } else matches.set(y, null)
  }
  for (const y of yrows) {
    if (matches.get(y)) continue
    const best = pickClosest(y, oldByLoose.get(looseKey(y.uni, y.birim)) || [])
    if (best) { usedOld.add(best); matches.set(y, best) }
  }

  const out = []
  let added = 0, merged = 0
  for (const y of yrows) {
    const old = matches.get(y) || null
    const old2025 = old ? (old.years || []).find(v => v.year === 2025) : null
    const hist = old ? (old.years || []).filter(v => v.year !== 2025) : []
    const years = [year2025(y, old2025), ...hist].sort((a, b) => b.year - a.year)
    out.push({
      university: cleanUni(y.uni, y.il, y.uniTur),
      faculty: faculty(y.fak, y.il),
      // KKTC üniversitelerinde il="KIBRIS" gelir. Gerçek yurt dışı (Bosna,
      // Kazakistan vb.) kurumlarda il boştur → haritanın yanındaki "Yurt Dışı"
      // düğmesiyle seçilebilsinler diye tek bir sentinel şehir veriyoruz.
      city: y.il || (/(YURTDISI|YURT DIŞI)/.test(y.uniTur || '') ? 'YURT DIŞI' : null),
      sector: sektor(y.uniTur),
      program: y.birim,
      programRaw: y.birim + ' (' + (y.sure || (lvl === 'ÖNLISANS' ? 2 : 4)) + ' Yıllık)',
      scoreType: y.puan || file.scoreType,
      years
    })
    if (old) merged++; else added++
  }

  // eşleşmeyen eski satırlar = silinecekler
  const dropped = file.rows.filter(r => !usedOld.has(r))
  return { file, path, out, added, merged, dropped, yokCount: yrows.length }
}

let T = { old: 0, neu: 0, added: 0, merged: 0, dropped: 0 }
const dropSamples = [], addSamples = []
for (const [grup, lvl, slug] of targets) {
  if (ONLY && slug !== ONLY) continue
  const R = rebuildDept(grup, lvl, slug)
  T.old += R.file.rows.length; T.neu += R.out.length; T.added += R.added; T.merged += R.merged; T.dropped += R.dropped.length
  console.log(`${grup} (${lvl === 'ÖNLISANS' ? '2y' : '4y'}): ${R.file.rows.length} -> ${R.out.length}  (eşlendi ${R.merged}, eklendi ${R.added}, silindi ${R.dropped.length})`)
  for (const d of R.dropped) if (dropSamples.length < 40) dropSamples.push(`  SİL: ${grup} | ${d.university} | ${d.programRaw}`)
  for (const o of R.out) if (o.years.every(y => y.year !== 2025 || y.rankNumeric == null) && addSamples.length < 20) { /* skip */ }
  if (WRITE) {
    R.file.rows = R.out
    R.file.warnings = (R.file.warnings || [])
    fs.writeFileSync(R.path, JSON.stringify(R.file, null, 2))
  }
}
console.log('\n=== TOPLAM ===')
console.log(`eski satır: ${T.old} -> yeni satır: ${T.neu}`)
console.log(`eşlenen(korunan): ${T.merged} | eklenen: ${T.added} | silinen: ${T.dropped}`)
console.log('\n--- SİLİNECEK örnekler (ilk 40) ---')
dropSamples.forEach(s => console.log(s))
console.log(WRITE ? '\n*** DOSYALAR YAZILDI ***' : '\n(kuru çalıştırma — dosya yazılmadı; --write ile yaz)')
