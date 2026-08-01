import { useEffect, useRef, useState } from 'react'
import {
  MAX_TERCIH,
  clearTercihler,
  moveTercih,
  removeTercih,
  useTercihler
} from '../lib/tercihler'
import { buildShareUrl } from '../lib/share'
import { exportCSV, exportExcel, exportPDF, exportWord } from '../lib/export'
import './TercihListesi.css'

export default function TercihListesi() {
  const list = useTercihler()
  const [durum, setDurum] = useState<string | null>(null)
  const [indirAcik, setIndirAcik] = useState(false)
  const indirRef = useRef<HTMLDivElement>(null)

  // Menü dışına tıklayınca / Esc ile kapan.
  useEffect(() => {
    if (!indirAcik) return
    const onDown = (e: MouseEvent) => {
      if (indirRef.current && !indirRef.current.contains(e.target as Node)) setIndirAcik(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIndirAcik(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [indirAcik])

  if (list.length === 0) return null

  const bildir = (msg: string) => {
    setDurum(msg)
    window.setTimeout(() => setDurum(null), 2500)
  }

  const indir = (fn: () => void, msg: string) => {
    setIndirAcik(false)
    fn()
    bildir(msg)
  }

  const kopyala = async () => {
    const text = list
      .map((t, i) => `${i + 1}. ${t.university} — ${t.programRaw} (${t.city}, ${t.scoreType})`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      bildir('Liste panoya kopyalandı.')
    } catch {
      bildir('Kopyalanamadı (tarayıcı izin vermedi).')
    }
  }

  const paylas = async () => {
    const url = await buildShareUrl(list)
    try {
      await navigator.clipboard.writeText(url)
      bildir('Paylaşım bağlantısı kopyalandı.')
    } catch {
      bildir('Bağlantı oluşturuldu ama panoya kopyalanamadı.')
    }
  }

  return (
    <section className="tercih-panel" id="tercih-listesi">
      <header className="tercih-head">
        <h2>
          Tercih Listem <span className="tercih-count">{list.length}/{MAX_TERCIH}</span>
        </h2>
        <div className="tercih-actions">
          <button type="button" onClick={paylas}>Paylaş</button>
          <button type="button" onClick={kopyala}>Kopyala</button>
          <div className="tercih-indir" ref={indirRef}>
            <button
              type="button"
              className="tercih-indir-btn"
              onClick={() => setIndirAcik(o => !o)}
              aria-haspopup="menu"
              aria-expanded={indirAcik}
            >
              İndir ▾
            </button>
            {indirAcik && (
              <div className="tercih-indir-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => indir(exportPDF, 'Yazdır penceresinden "PDF olarak kaydet"i seç.')}>
                  <span className="tercih-indir-ico">📄</span> PDF <em>(yazdır / kaydet)</em>
                </button>
                <button type="button" role="menuitem" onClick={() => indir(() => exportExcel(list), 'Excel dosyası indirildi.')}>
                  <span className="tercih-indir-ico">📊</span> Excel <em>(.xls)</em>
                </button>
                <button type="button" role="menuitem" onClick={() => indir(() => exportWord(list), 'Word dosyası indirildi.')}>
                  <span className="tercih-indir-ico">📝</span> Word <em>(.doc)</em>
                </button>
                <button type="button" role="menuitem" onClick={() => indir(() => exportCSV(list), 'CSV dosyası indirildi.')}>
                  <span className="tercih-indir-ico">📋</span> CSV <em>(.csv)</em>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="tercih-clear"
            onClick={() => {
              if (confirm('Tercih listesi tamamen silinsin mi?')) clearTercihler()
            }}
          >
            Temizle
          </button>
        </div>
      </header>

      <ol className="tercih-list">
        {list.map((t, i) => (
          <li key={t.key}>
            <span className="tercih-no">{i + 1}</span>
            <div className="tercih-bilgi">
              <strong>{t.programRaw}</strong>
              <span className="tercih-alt">
                {t.university} · {t.city} · {t.scoreType} · {t.funding}
                {t.rank ? ` · 2025 sıra: ${t.rank}` : ''}
              </span>
            </div>
            <div className="tercih-kontrol">
              <button
                type="button"
                onClick={() => moveTercih(t.key, -1)}
                disabled={i === 0}
                aria-label="Yukarı taşı"
                title="Yukarı taşı"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveTercih(t.key, 1)}
                disabled={i === list.length - 1}
                aria-label="Aşağı taşı"
                title="Aşağı taşı"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeTercih(t.key)}
                aria-label="Listeden çıkar"
                title="Listeden çıkar"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ol>
      {durum && <p className="tercih-durum">{durum}</p>}
      <p className="tercih-not">
        Liste tarayıcında saklanır; sayfayı kapatsan da durur. Sıralama, ÖSYM tercih formundaki
        sıranı temsil eder. "Paylaş" listeni açan kısa bir bağlantı üretir.
      </p>
    </section>
  )
}
