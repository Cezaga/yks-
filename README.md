# YKS Bölüm Sıralamaları

basarisiralamalari.com'dan çekilen üniversite bölüm taban puanları / başarı
sıralamaları verisiyle çalışan, Türkiye haritası üzerinden il + bölüm seçip
sonuçları karşılaştıran web uygulaması.

## Yapı

- `app/` — Vite + React (TypeScript) tek sayfa uygulama.
  - Sol: tıklanabilir Türkiye haritası (çoklu il seçimi).
  - Sağ: bölüm arama + çoklu seçim.
  - **Onayla** → seçili illerdeki seçili bölümlerin satırları tabloda listelenir.
  - Veri `app/public/data/` altından okunur (offline çalışır).
- `scraper/` — Node.js veri çekici (cheerio).

## Uygulamayı çalıştırma

```sh
cd app
npm install
npm run dev
```

## Veriyi yeniden çekme

Veri `app/public/data/` altında hazırdır (576 bölüm, ~20.840 satır, 81 il,
2020-2026 yılları). Güncellemek için:

```sh
cd scraper
node run.js            # eksikleri çeker (mevcut dosyaları atlar)
node run.js --force    # her şeyi yeniden çeker
```

Çıktı doğrudan `app/public/data/departments/<slug>.json` ve `index.json`
olarak yazılır. Başarısız sayfalar `scraper/failed.log`'a düşer.

### Notlar
- Site zaman zaman ağır liste sayfalarında 500/504 döndürüyor. İki liste
  sayfasının bölüm linkleri tarayıcıdan çıkarılıp `scraper/links_4.json` /
  `links_2.json` olarak kaydedildi; `getDepartmentLinks.js` önce bu dosyaları
  kullanır (yoksa canlı liste sayfasını çeker). Yeni bölümler eklendiğinde bu
  link dosyaları güncellenmelidir.
- Sitenin TLS sertifika zinciri eksik; `fetchPolite.js` bu host için leaf
  doğrulamasını gevşetir (yalnızca okuma amaçlı public veri).
- İl bilgisi kaynakta bazı özel üniversite satırlarında bulunmuyor (~%8);
  bu satırlar il filtresinde görünmez.
