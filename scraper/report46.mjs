import fs from 'fs'
const yok = JSON.parse(fs.readFileSync('yokatlas-2026.json', 'utf8'))
const DEP = '../app/public/data/departments/'

const targets = [
  ['Elektrik-Elektronik Mühendisliği', 'LISANS', 'elektrik-elektronik-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İnşaat Mühendisliği', 'LISANS', 'insaat-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Makine Mühendisliği', 'LISANS', 'makine-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Gemi İnşaatı ve Gemi Makineleri Mühendisliği', 'LISANS', 'gemi-insaati-ve-gemi-makineleri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Gemi Makineleri İşletme Mühendisliği', 'LISANS', 'gemi-makineleri-isletme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Gemi ve Deniz Teknolojisi Mühendisliği', 'LISANS', 'gemi-ve-deniz-teknolojisi-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Bilgisayar Mühendisliği', 'LISANS', 'bilgisayar-muhendisligi-2024-basari-siralamasi-ve-taban-puanlari'],
  ['Endüstri Mühendisliği', 'LISANS', 'endustri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Hemşirelik', 'LISANS', 'hemsirelik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Deniz Ulaştırma İşletme Mühendisliği', 'LISANS', 'deniz-ulastirma-isletme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Deniz Ulaştırma ve İşletme', 'ÖNLISANS', 'deniz-ulastirma-ve-isletme-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İşletme Mühendisliği', 'LISANS', 'isletme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Mekatronik Mühendisliği', 'LISANS', 'mekatronik-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Mimarlık', 'LISANS', 'mimarlik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İstatistik', 'LISANS', 'istatistik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Fizyoterapi', 'ÖNLISANS', 'fizyoterapi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Diyaliz', 'ÖNLISANS', 'diyaliz-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Anestezi', 'ÖNLISANS', 'anestezi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Fizyoterapi ve Rehabilitasyon', 'LISANS', 'fizyoterapi-ve-rehabilitasyon-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Matematik', 'LISANS', 'matematik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Sınıf Öğretmenliği', 'LISANS', 'sinif-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İlköğretim Matematik Öğretmenliği', 'LISANS', 'ilkogretim-matematik-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Matematik Öğretmenliği', 'LISANS', 'matematik-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İngilizce Öğretmenliği', 'LISANS', 'ingilizce-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Okul Öncesi Öğretmenliği', 'LISANS', 'okul-oncesi-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Türkçe Öğretmenliği', 'LISANS', 'turkce-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Fen Bilgisi Öğretmenliği', 'LISANS', 'fen-bilgisi-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Sosyal Bilgiler Öğretmenliği', 'LISANS', 'sosyal-bilgiler-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Özel Eğitim Öğretmenliği', 'LISANS', 'ozel-egitim-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Psikolojik Danışmanlık ve Rehberlik Öğretmenliği', 'LISANS', 'psikolojik-danismanlik-ve-rehberlik-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Beden Eğitimi ve Spor Öğretmenliği', 'LISANS', 'beden-egitimi-ve-spor-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Ekonomi', 'LISANS', 'ekonomi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Ekonomi ve Finans', 'LISANS', 'ekonomi-ve-finans-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Politika ve Ekonomi', 'LISANS', 'politika-ve-ekonomi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Bankacılık ve Finans', 'LISANS', 'bankacilik-ve-finans-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Finans ve Bankacılık', 'LISANS', 'finans-ve-bankacilik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Muhasebe ve Finans Yönetimi', 'LISANS', 'muhasebe-ve-finans-yonetimi-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İktisadi ve İdari Bilimler Programları', 'LISANS', 'iktisadi-ve-idari-bilimler-programlari-2024-taban-puanlari-ve-basari-siralamasi'],
  ['İktisat', 'LISANS', 'iktisat-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Psikoloji', 'LISANS', 'psikoloji-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Bankacılık ve Sigortacılık', 'LISANS', 'bankacilik-ve-sigortacilik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Bankacılık ve Sigortacılık', 'ÖNLISANS', 'bankacilik-ve-sigortacilik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Sigortacılık', 'LISANS', 'sigortacilik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Bankacılık', 'LISANS', 'bankacilik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Uluslararası Finans ve Bankacılık', 'LISANS', 'uluslararasi-finans-ve-bankacilik-2024-taban-puanlari-ve-basari-siralamasi'],
  ['Açık Deniz Sondaj Teknolojisi', 'ÖNLISANS', 'acik-deniz-sondaj-teknolojisi-2024-taban-puanlari-ve-basari-siralamasi']
]

const fold = s => (s || '').toLocaleUpperCase('tr').replace(/[ÇĞİIÖŞÜÂÎÛ]/g, c => ({ 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'I': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' }[c])).replace(/[^A-Z0-9]/g, '')
const stripCity = s => String(s).replace(/\s*\([^)]*\)\s*$/, '')
const uniKeys = [...new Set(yok.map(x => fold(stripCity(x.uni))))].sort((a, b) => b.length - a.length)
function canonUni(name) {
  const k = fold(stripCity(name))
  if (uniKeys.includes(k)) return k
  const pre = uniKeys.find(u => k.startsWith(u) && u.length >= 8)
  return pre || k
}
function tags(str) {
  const p = ' ' + String(str).toLocaleLowerCase('tr') + ' '
  const t = []
  if (/i̇ngilizce|ingilizce/.test(p)) t.push('ing')
  else if (/almanca/.test(p)) t.push('alm')
  else if (/fransızca/.test(p)) t.push('fra')
  else if (/arapça/.test(p)) t.push('ara')
  if (/%\s*50|50\s*i̇ndirimli|50\s*indirimli/.test(p)) t.push('i50')
  else if (/%\s*25|25\s*i̇ndirimli|25\s*indirimli/.test(p)) t.push('i25')
  else if (/burslu/.test(p)) t.push('brs')
  else if (/ücretli/.test(p)) t.push('ucr')
  if (/uzaktan/.test(p)) t.push('uzk')
  if (/i̇kinci|ikinci/.test(p)) t.push('io')
  if (/açıköğretim|acikogretim/.test(p)) t.push('ao')
  if (/kktc/.test(p)) t.push('kktc')
  if (/uolp/.test(p)) t.push('uolp')
  return t.sort().join('+') || 'std'
}
const parseRank = s => (s && /^[\d.]+$/.test(String(s))) ? parseInt(String(s).replace(/\./g, '')) : null

const T = { dept: 0, ourRows: 0, yokRows: 0, matched: 0, rankDiff: 0, rankBig: 0, missing: 0, extra: 0, poll: 0 }
const lines = []
for (const [grup, lvl, slug] of targets) {
  let our
  try { our = JSON.parse(fs.readFileSync(DEP + slug + '.json', 'utf8')) } catch (e) { console.log('DOSYA YOK: ' + slug); continue }
  const yr = yok.filter(x => x.grup === grup && x.tur === lvl)
  const ymap = new Map()
  for (const x of yr) { const k = canonUni(x.uni) + '##' + tags(x.birim); if (!ymap.has(k)) ymap.set(k, []); ymap.get(k).push(x) }
  const omap = new Map()
  let poll = 0
  for (const r of our.rows) {
    const cu = canonUni(r.university)
    if (cu !== fold(stripCity(r.university))) poll++
    const k = cu + '##' + tags(r.programRaw); if (!omap.has(k)) omap.set(k, []); omap.get(k).push(r)
  }
  let matched = 0, rankDiff = 0, rankBig = 0, extra = 0, missing = 0
  for (const [k, orows] of omap) {
    const y = ymap.get(k)
    if (!y) { extra++; continue }
    matched++
    const oy = (orows[0].years || []).find(y => y.year === 2025)
    const our2025 = parseRank(oy && oy.rank)
    const yb = y[0].bs || null
    if (our2025 != null && yb != null && our2025 !== yb) { rankDiff++; if (Math.abs(our2025 - yb) > Math.max(50, yb * 0.02)) rankBig++ }
  }
  for (const [k] of ymap) if (!omap.has(k)) missing++
  lines.push(`${grup} (${lvl === 'ÖNLISANS' ? '2y' : '4y'}) | ${our.rows.length}/${yr.length} | eş ${matched} | sıraFrk ${rankDiff}(önemli ${rankBig}) | eksik ${missing} | fazla ${extra} | kirli ${poll}`)
  T.dept++; T.ourRows += our.rows.length; T.yokRows += yr.length; T.matched += matched; T.rankDiff += rankDiff; T.rankBig += rankBig; T.missing += missing; T.extra += extra; T.poll += poll
}
lines.forEach(l => console.log(l))
console.log('\n=== TOPLAM (' + T.dept + ' bolum) ===')
console.log('bizdeki satir: ' + T.ourRows + ' | YOKATLAS satir: ' + T.yokRows)
console.log('eslesen: ' + T.matched + ' | sira farki: ' + T.rankDiff + ' (onemli: ' + T.rankBig + ')')
console.log('YOKATLAS ta olup bizde YOK (eksik): ' + T.missing)
console.log('bizde olup YOKATLAS ta yok (fazla/kapanmis): ' + T.extra)
console.log('universite adina fakulte yapismis satir: ' + T.poll)
