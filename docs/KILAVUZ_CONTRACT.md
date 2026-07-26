# Kılavuz Veri Sözleşmesi (ÖSYM 2026 Kontenjan Kılavuzu)

Bu dosya, kılavuz verisini üreten ve tüketen tüm taraflar için **bağlayıcı şemadır**.
UI bu şemaya göre yazılır, parser bu şemayı üretir. Değişiklik olursa burası güncellenir.

## Kaynak

- PDF: `C:\Users\yusuf\OneDrive\Masaüstü\kontkilavuz_yktd21072026.pdf` (**793 sayfa**)
- Çıkarma komutu (doğrulandı, temiz UTF-8 + hizalı sütun verir):
  ```sh
  pdftotext -enc UTF-8 -table -nodiag -f <ilk> -l <son> <pdf> <cikti.txt>
  ```
  `-table` sütunları hizalar, `-nodiag` diyagonal filigranı atar. İkisi de zorunlu.

## Üretilen dosyalar

| Dosya | Boyut | İçerik |
|---|---|---|
| `app/public/data/kilavuz/programs.json` | ~12.3 MB | ÖSYM program kaydı listesi (aşağıdaki şema) — tam arşiv |
| `app/public/data/kilavuz/lookup.json` | ~2.8 MB | Aynı kayıtların **kompakt** hâli — **UI bunu indirir** |
| `app/public/data/kilavuz/conditions.json` | ~0.15 MB | `{ "144": "Bu programa ... koşulu vardır." }` kod→metin |
| `app/public/data/kilavuz/byKey.json` | ~1.3 MB | Eşleştirme indeksi: `matchKey` → `code[]` (aynı anahtarda birden çok program olabilir; 888 anahtar çoklu). UI bunu indirmez, `matchKey`'i aynı kuralla kendisi üretir. |

### `lookup.json` biçimi

```jsonc
{
  "v": 1,
  "fields": ["code","uni","fac","program","lisans","duration","scoreType",
             "genel","okulBirincisi","meb","sehitGazi","kadin34","conditionCodes",
             "rank","score","prof","docent","drOgrUyesi","accreditation","kpss"],
  "unis": ["AKDENİZ ÜNİVERSİTESİ|ANTALYA|Devlet", ...],   // "AD|ŞEHİR|TÜR", boş alan = null
  "facs": ["MÜHENDİSLİK FAKÜLTESİ", ...],
  "rows": [["100810311", 4, 17, "Elektrik-Elektronik Mühendisliği", 1, 4, "SAY",
            40, 1, null, null, null, [144], 260237, 314.48803, 4, 2, 3, "FEDEK", null], ...]
}
```
`uni`/`fac` alanları `unis`/`facs` dizilerine indekstir (`-1` = null). `lisans`: 1 = lisans, 0 = önlisans.
Çözücü: `app/src/lib/kilavuz.ts` içindeki `decodeLookup`. `programs.json` yedek yoldur.

## Program kaydı şeması

```jsonc
{
  "code": "100810311",              // ÖSYM program kodu (string, baştaki 0'lar korunur)
  "university": "AKDENİZ ÜNİVERSİTESİ",
  "city": "ANTALYA",                // başlıktaki parantez; KKTC ise "KKTC-LEFKOŞA" gibi
  "universityType": "Devlet",       // "Devlet" | "Vakıf" | "KKTC" | "Yurtdışı"
  "faculty": "MÜHENDİSLİK FAKÜLTESİ",
  "program": "Elektrik-Elektronik Mühendisliği",
  "level": "lisans",                // "lisans" (Tablo 4) | "onlisans" (Tablo 3)
  "duration": 4,                    // ÖĞR. SÜRE
  "scoreType": "SAY",               // SAY | EA | SÖZ | DİL | TYT
  "quota2026": {
    "genel": 40,                    // GENEL KONT.
    "okulBirincisi": 1,             // OK.BİR KONT.
    "meb": null,                    // MEB (varsa)
    "sehitGazi": null,              // ŞEHİT GAZİ YAK. KONT.
    "kadin34": null                 // 34 YAŞ ÜSTÜ KADIN KONT.
  },
  "conditionCodes": [144],          // ÖZEL KOŞUL VE AÇIKLAMALAR sütunundaki sayılar
  "y2025": { "rank": 260237, "score": 314.48803 },  // "..." / "----" ise null
  "staff": { "prof": 4, "docent": 2, "drOgrUyesi": 3 },  // sadece lisans; yoksa null
  "accreditation": "FEDEK",         // yoksa null
  "kpss": 68.370581,                // yoksa null
  "matchKey": "akdenizuniversitesi||elektrikelektronikmuhendisligi",
  "extra": { "tyc": null, "grv": null, "tusTT1": null, "tusTT2": null,
             "tusKTP": null, "dus": null, "abAyp": null }   // sadece programs.json'da;
                                                           // önlisansta yalnız { tyc }
}
```

**Kurallar**
- Boş hücre → `null` (0 değil). `"..."` ve `"----"` → `null`.
- Sayılar `number`, `code` `string`.
- Türkçe karakterler korunur (ş, ğ, İ, ı, ö, ü, ç).
- **`city` (ÖNEMLİ):** ÖSYM, üniversite adı zaten il adıyla başlıyorsa başlıkta parantezli ili
  **yazmaz** (`ANKARA ÜNİVERSİTESİ (Devlet Üniversitesi)` — parantezli il yok;
  `AKDENİZ ÜNİVERSİTESİ (ANTALYA) (Devlet Üniversitesi)` — var). Bu yüzden `city` şu sırayla
  belirlenir: (1) başlıktaki parantez, (2) üniversite adının ilk token'ı 81 il adından biriyse o,
  (3) fakülte adının sonundaki `(ANKARA)` gibi parantez, (4) `CITY_MANUAL` sözlüğü
  (`GEBZE TEKNİK ÜNİVERSİTESİ`→KOCAELİ, `TÜRK-JAPON ...`→İSTANBUL, İçişleri/MSB-SBÜ→İSTANBUL).
  Hiçbiri tutmuyorsa `null` — **şehir uydurulmaz.** Şu an doluluk 21482/21482.
  Not: `city` kurumun ili; program başka yerleşkede olabilir (ör. `(Bursa Yerleşkesi)`).
- `matchKey`: `normalizeKey(university) + "||" + normalizeKey(program)`.
  `normalizeKey` = Türkçe küçültme → ç,ğ,ı,ö,ş,ü sadeleştirme → `[^a-z0-9]` sil.
  (Uygulamadaki `app/src/lib/normalize.ts` içindeki `cityKey` ile aynı mantık.)

## Tablo sütun düzenleri

**Tablo 4 (lisans):** PROGRAM KODU · PROGRAM ADI · ÖĞR.SÜRE · PUAN TÜRÜ · GENEL KONT ·
OK.BİR KONT · MEB · ŞEHİT GAZİ YAK · 34 YAŞ ÜSTÜ KADIN · ÖZEL KOŞUL VE AÇIKLAMALAR ·
2025 BAŞARI SIRASI · 2025 EN KÜÇÜK PUAN · P.DR SAYI · D.DR SAYI · DR.ÖĞR ÜYE SAYI ·
GRV · TYÇ · AKREDİTASYON · TUS TT1 · TUS TT2 · TUS KTP · DUS · AB AYP · KPSS

**Tablo 3 (önlisans):** PROGRAM KODU · PROGRAM ADI · ÖĞR.SÜRE · PUAN TÜRÜ · GENEL KONT ·
OK.BİR KONT · ŞEHİT GAZİ YAK · 34 YAŞ ÜSTÜ KADIN · ÖZEL KOŞUL VE AÇIKLAMALAR ·
2025 BAŞARI SIRASI · 2025 EN KÜÇÜK PUAN · TYÇ · AKREDİTASYON

**Bağlam satırları:** Üniversite ve fakülte adları kendi satırlarında gelir, veri satırı değildir.
- Üniversite: `AKDENİZ ÜNİVERSİTESİ (ANTALYA) (Devlet Üniversitesi)` — uzun adlar **alt satıra taşabilir**.
- Fakülte: `MÜHENDİSLİK FAKÜLTESİ`, `... MESLEK YÜKSEKOKULU`
- Bir program satırının üniversite/fakültesi, o satırdan önceki en son başlıktır.
- Koşul kodları uzunsa alt satıra taşar (ör. `1, 22, 24, 152,` / sonraki satır `153`) — birleştirilmeli.
- **Başlık satırlarını bölerken GENİŞLİK tahmini kullanılmaz** (yazı tipi oransal, tahmin yanlış
  sonuç veriyor). Bir başlık bloğu "tamamlandığında" biter: parantezler dengeli **ve**
  (üniversite kuyruğu `(Devlet/Vakıf Üniversitesi)`/`(KKTC-…)` **veya**
  `FAKÜLTESİ|YÜKSEKOKULU|ENSTİTÜSÜ|KONSERVATUVARI|…` gibi bir kurum sonu sözcüğü) ile bitiyor.
  Aksi hâlde bir sonraki satır aynı bloğa eklenir. (`headerComplete`)
- Bazı kurumlar başlıkta **iki kez** görünür: bir kez üniversite (`… (Vakıf Üniversitesi)`),
  bir kez fakülte olarak (ör. `İSTANBUL SAĞLIK VE SOSYAL BİLİMLER MESLEK YÜKSEKOKULU`). Normaldir.
- `ASBÜ-KUZEY KIBRIS YERLEŞKESİ`, `ODTÜ KUZEY KIBRIS KAMPUSU` gibi yerleşke başlıkları ayrı
  "üniversite" olarak kaydedilir (şehirleri farklı); altlarında fakülte başlığı yoktur → `faculty: null`.

## UI sözleşmesi

Sonuç tablosunda her satır **yalnızca sırayı** gösterir; tıklanınca altında detay kutusu açılır.
Detay kutusu kılavuz verisi varsa onu da gösterir (2026 kontenjanlar, koşullar, akreditasyon, ÖSYM kodu).
Kılavuz verisi bulunamayan satırlarda detay kutusu yalnızca mevcut yıl verilerini gösterir (bozulmaz).
