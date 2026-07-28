// YÖKATLAS resmi API'sinden tüm program listesini (2026 kılavuz + 2025 yerleşme
// sonuçları) indirir, ihtiyacımız olan alanlara indirger ve diske yazar.
import fs from 'fs'
;(async () => {
  const r = await fetch('https://yokatlas.yok.gov.tr/api/tercih-kilavuz/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  if (!r.ok) throw new Error('status ' + r.status)
  const j = await r.json()
  const arr = j.content || j.data || j
  const slim = arr.map(x => ({
    grupId: x.birimGrupId,
    grup: x.birimGrupAdi,
    kod: x.kilavuzKodu,
    uni: x.universiteAdi,
    uniTur: x.universiteTuru, // DEVLET / VAKIF / KKTC
    il: x.ilAdi,
    ilce: x.ilceAdi,
    fak: x.fymkAdi,
    birim: x.birimAdi, // tam program adı (İngilizce/Burslu ekleriyle)
    puan: x.puanTuru, // SAY/EA/SÖZ/DİL/TYT
    tur: x.birimTuruAdi, // LISANS / ONLISANS
    dil: x.ogrenimDiliAdi,
    burs: x.bursOraniAdi,
    ogretim: x.ogrenimTuruAdi, // Örgün / İkinci / Uzaktan
    sure: x.ogrenimSuresi,
    kontenjan: x.kontenjan,
    bs: x.basariSirasi, // 2025 başarı sırası
    taban: x.minPuan // 2025 taban puan
  }))
  fs.writeFileSync('yokatlas-2026.json', JSON.stringify(slim))
  // Özet
  const groups = {}
  for (const x of slim) groups[x.grup] = (groups[x.grup] || 0) + 1
  console.log('toplam kayit:', slim.length)
  console.log('grup sayisi:', Object.keys(groups).length)
  console.log('dosya KB:', Math.round(fs.statSync('yokatlas-2026.json').size / 1024))
  console.log('puan turleri:', [...new Set(slim.map(x => x.puan))].join(','))
  console.log('birim turleri:', [...new Set(slim.map(x => x.tur))].join(','))
})().catch(e => { console.error('HATA', e.message); process.exit(1) })
