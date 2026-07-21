// Hazır bölüm paketleri: tek tıkla birden çok bölümü seçmek için.
export interface DepartmentPackage {
  id: string
  name: string
  slugs: string[]
}

export const PACKAGES: DepartmentPackage[] = [
  {
    id: 'yusuf',
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
  }
]
