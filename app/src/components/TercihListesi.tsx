import {
  MAX_TERCIH,
  clearTercihler,
  moveTercih,
  removeTercih,
  useTercihler
} from '../lib/tercihler'
import './TercihListesi.css'

export default function TercihListesi() {
  const list = useTercihler()
  if (list.length === 0) return null

  const yazdir = () => window.print()

  const kopyala = async () => {
    const text = list
      .map((t, i) => `${i + 1}. ${t.university} — ${t.programRaw} (${t.city}, ${t.scoreType})`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // pano izni yoksa sessizce geç
    }
  }

  return (
    <section className="tercih-panel" id="tercih-listesi">
      <header className="tercih-head">
        <h2>
          Tercih Listem <span className="tercih-count">{list.length}/{MAX_TERCIH}</span>
        </h2>
        <div className="tercih-actions">
          <button type="button" onClick={kopyala}>Kopyala</button>
          <button type="button" onClick={yazdir}>Yazdır</button>
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
      <p className="tercih-not">
        Liste tarayıcında saklanır; sayfayı kapatsan da durur. Sıralama, ÖSYM tercih formundaki
        sıranı temsil eder.
      </p>
    </section>
  )
}
