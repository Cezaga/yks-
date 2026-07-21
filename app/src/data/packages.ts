// Hazır bölüm paketleri: tek tıkla birden çok bölümü seçmek için.
// AYT = 4 yıllık (lisans), TYT = 2 yıllık (önlisans), ozel = kişisel paket.
export type PackageCategory = 'ozel' | 'ayt' | 'tyt'

export interface DepartmentPackage {
  id: string
  category: PackageCategory
  name: string
  slugs: string[]
}

export const PACKAGE_CATEGORY_LABELS: Record<PackageCategory, string> = {
  ozel: 'Özel Paket',
  ayt: 'AYT Paketleri (4 Yıllık)',
  tyt: 'TYT Paketleri (2 Yıllık)'
}

export const PACKAGES: DepartmentPackage[] = [
  {
    id: 'yusuf',
    category: 'ozel',
    name: 'Yusuf Özel Paket',
    slugs: [
      'elektrik-elektronik-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'insaat-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'makine-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'gemi-insaati-ve-gemi-makineleri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'gemi-makineleri-isletme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'gemi-ve-deniz-teknolojisi-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'bilgisayar-muhendisligi-2024-basari-siralamasi-ve-taban-puanlari',
      'endustri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'hemsirelik-2024-taban-puanlari-ve-basari-siralamasi',
      'deniz-ulastirma-isletme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'deniz-ulastirma-ve-isletme-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'isletme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'mekatronik-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'mimarlik-2024-taban-puanlari-ve-basari-siralamasi',
      'istatistik-2024-taban-puanlari-ve-basari-siralamasi',
      'fizyoterapi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'ayt-muh',
    category: 'ayt',
    name: 'Sayısal Mühendislik',
    slugs: [
      'bilgisayar-muhendisligi-2024-basari-siralamasi-ve-taban-puanlari',
      'elektrik-elektronik-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'makine-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'endustri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'insaat-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'mekatronik-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'yazilim-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'kimya-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'biyomedikal-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'cevre-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'gida-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'otomotiv-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'metalurji-ve-malzeme-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'havacilik-ve-uzay-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'ayt-bilisim',
    category: 'ayt',
    name: 'Bilişim & Yazılım',
    slugs: [
      'bilgisayar-muhendisligi-2024-basari-siralamasi-ve-taban-puanlari',
      'yazilim-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'bilgisayar-bilimleri-2024-taban-puanlari-ve-basari-siralamasi',
      'yapay-zeka-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'yapay-zeka-ve-veri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'bilisim-sistemleri-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'yonetim-bilisim-sistemleri-2024-taban-puanlari-ve-basari-siralamasi',
      'bilgisayar-teknolojisi-ve-bilisim-sistemleri-2024-taban-puanlari-ve-basari-siralamasi',
      'dijital-oyun-tasarimi-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'ayt-saglik',
    category: 'ayt',
    name: 'Tıp & Sağlık',
    slugs: [
      'tip-fakultesi-2024-basari-siralama-ve-taban-puanlari',
      'dis-hekimligi-2024-taban-puanlari-ve-basari-siralamasi',
      'eczacilik-2024-taban-puanlari-ve-basari-siralamasi',
      'hemsirelik-2024-taban-puanlari-ve-basari-siralamasi',
      'fizyoterapi-ve-rehabilitasyon-2024-taban-puanlari-ve-basari-siralamasi',
      'beslenme-ve-diyetetik-2024-basari-siralamasi-ve-taban-puanlari',
      'ebelik-2024-taban-puanlari-ve-basari-siralamasi',
      'odyoloji-2024-taban-puanlari-ve-basari-siralamasi',
      'veteriner-2024-taban-puanlari-ve-basari-siralamasi',
      'dil-ve-konusma-terapisi-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'ayt-hukuk',
    category: 'ayt',
    name: 'Hukuk & İşletme',
    slugs: [
      'hukuk-2024-taban-puanlari-ve-basari-siralamasi',
      'isletme-2024-taban-puanlari-ve-basari-siralamasi',
      'iktisat-2024-taban-puanlari-ve-basari-siralamasi',
      'ekonomi-2024-taban-puanlari-ve-basari-siralamasi',
      'maliye-2024-taban-puanlari-ve-basari-siralamasi',
      'uluslararasi-iliskiler-2024-taban-puanlari-ve-basari-siralamasi',
      'siyaset-bilimi-ve-kamu-yonetimi-2024-taban-puanlari-ve-basari-siralamasi',
      'psikoloji-2024-taban-puanlari-ve-basari-siralamasi',
      'uluslararasi-ticaret-ve-isletmecilik-2024-taban-puanlari-ve-basari-siralamasi',
      'calisma-ekonomisi-ve-endustri-iliskileri-2024-taban-puanlari-ve-basari-siralamasi',
      'yonetim-bilisim-sistemleri-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'ayt-ogretmen',
    category: 'ayt',
    name: 'Öğretmenlik',
    slugs: [
      'sinif-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'ilkogretim-matematik-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'matematik-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'ingilizce-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'okul-oncesi-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'turkce-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'fen-bilgisi-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'sosyal-bilgiler-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'ozel-egitim-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'psikolojik-danismanlik-ve-rehberlik-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi',
      'beden-egitimi-ve-spor-ogretmenligi-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'ayt-mimari',
    category: 'ayt',
    name: 'Mimarlık & Tasarım',
    slugs: [
      'mimarlik-2024-taban-puanlari-ve-basari-siralamasi',
      'ic-mimarlik-2024-taban-puanlari-ve-basari-siralamasi',
      'ic-mimarlik-ve-cevre-tasarimi-2024-taban-puanlari-ve-basari-siralamasi',
      'peyzaj-mimarligi-2024-taban-puanlari-ve-basari-siralamasi',
      'kentsel-tasarim-ve-peyzaj-mimarligi-2024-taban-puanlari-ve-basari-siralamasi',
      'endustriyel-tasarim-2024-taban-puanlari-ve-basari-siralamasi',
      'endustriyel-tasarim-muhendisligi-2024-taban-puanlari-ve-basari-siralamasi',
      'grafik-tasarimi-2024-taban-puanlari-ve-basari-siralamasi',
      'gorsel-iletisim-tasarimi-2024-taban-puanlari-ve-basari-siralamasi',
      'moda-tasarimi-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'tyt-saglik',
    category: 'tyt',
    name: 'Sağlık Önlisans',
    slugs: [
      'anestezi-2024-taban-puanlari-ve-basari-siralamasi',
      'ameliyathane-hizmetleri-2024-taban-puanlari-ve-basari-siralamasi',
      'ilk-ve-acil-yardim-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'tibbi-goruntuleme-teknikleri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'agiz-ve-dis-sagligi-2024-taban-puanlari-ve-basari-siralamasi',
      'diyaliz-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'eczane-hizmetleri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'fizyoterapi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'optisyenlik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'yasli-bakimi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'cocuk-gelisimi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'odyometri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'patoloji-laboratuvar-teknikleri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'radyoterapi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'tyt-teknik',
    category: 'tyt',
    name: 'Teknik Önlisans',
    slugs: [
      'bilgisayar-programciligi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'elektrik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'elektronik-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'makine-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'mekatronik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'insaat-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'otomotiv-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'harita-ve-kadastro-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'iklimlendirme-ve-sogutma-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'biyomedikal-cihaz-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'mimari-restorasyon-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'kaynak-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'tyt-isletme',
    category: 'tyt',
    name: 'İşletme & Yönetim Önlisans',
    slugs: [
      'isletme-yonetimi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'muhasebe-ve-vergi-uygulamalari-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'bankacilik-ve-sigortacilik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'insan-kaynaklari-yonetimi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'lojistik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'dis-ticaret-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'halkla-iliskiler-ve-tanitim-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'pazarlama-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'maliye-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'e-ticaret-ve-pazarlama-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'emlak-yonetimi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'tyt-bilisim',
    category: 'tyt',
    name: 'Bilişim Önlisans',
    slugs: [
      'bilgisayar-programciligi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'web-tasarimi-ve-kodlama-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'internet-ve-ag-teknolojileri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'siber-guvenlik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'bilisim-guvenligi-teknolojisi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'cografi-bilgi-sistemleri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'siber-guvenlik-analistligi-ve-operatorlugu-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  },
  {
    id: 'tyt-sosyal',
    category: 'tyt',
    name: 'Sosyal & Hizmet Önlisans',
    slugs: [
      'sosyal-hizmetler-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'sosyal-guvenlik-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'buro-yonetimi-ve-yonetici-asistanligi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'cocuk-gelisimi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'sivil-hava-ulastirma-isletmeciligi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'sivil-havacilik-kabin-hizmetleri-2-yillik-2024-taban-puanlari-ve-basari-siralamasi',
      'turizm-ve-otel-isletmeciligi-2-yillik-2024-taban-puanlari-ve-basari-siralamasi'
    ]
  }
]
