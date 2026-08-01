import { useEffect, useMemo, useState } from 'react'
import TurkeyMap from './components/TurkeyMap'
import CitySearch from './components/CitySearch'
import DepartmentPicker from './components/DepartmentPicker'
import ResultsTable from './components/ResultsTable'
import ResultsControls, { type ResultsOptions } from './components/ResultsControls'
import TercihListesi from './components/TercihListesi'
import ThemeToggle from './components/ThemeToggle'
import turkeyCities from './data/turkeyCities'
import { loadDepartment, loadIndex } from './lib/dataLoader'
import { readTercihlerFromUrl } from './lib/share'
import { replaceTercihler } from './lib/tercihler'
import type { DepartmentData, DepartmentIndexEntry } from './types'
import './App.css'

const cityByPlate = new Map(turkeyCities.map(c => [c.plate, c.city]))

function App() {
  const [index, setIndex] = useState<DepartmentIndexEntry[]>([])
  const [indexError, setIndexError] = useState<string | null>(null)

  const [selectedPlates, setSelectedPlates] = useState<Set<string>>(new Set())
  const [selectedDepts, setSelectedDepts] = useState<DepartmentIndexEntry[]>([])

  const [results, setResults] = useState<DepartmentData[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [options, setOptions] = useState<ResultsOptions>({
    groupMode: 'genel',
    sortDir: 'asc',
    funding: [],
    nationality: 'hepsi',
    languages: []
  })
  const patchOptions = (patch: Partial<ResultsOptions> | ((prev: ResultsOptions) => Partial<ResultsOptions>)) =>
    setOptions(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  // Paylaşılan bağlantıdaki tercih listesini yükler (async — gzip çözme).
  const applyShared = async () => {
    const list = await readTercihlerFromUrl()
    if (list && list.length) replaceTercihler(list)
  }

  useEffect(() => {
    applyShared()
    loadIndex()
      .then(setIndex)
      .catch(err => setIndexError(err.message))
  }, [])

  // Site zaten açıkken paylaşım bağlantısı yapıştırılırsa yalnızca hash değişir,
  // sayfa yeniden yüklenmez. Bu durumda da tercih listesini uygula.
  useEffect(() => {
    const onHashChange = () => applyShared()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const togglePlate = (plate: string) => {
    setSelectedPlates(prev => {
      const next = new Set(prev)
      if (next.has(plate)) next.delete(plate)
      else next.add(plate)
      return next
    })
  }

  const selectedCityNames = useMemo(
    () => [...selectedPlates].map(p => cityByPlate.get(p) ?? p),
    [selectedPlates]
  )

  const addDept = (dept: DepartmentIndexEntry) => {
    setSelectedDepts(prev => (prev.some(d => d.slug === dept.slug) ? prev : [...prev, dept]))
  }
  const removeDept = (slug: string) => {
    setSelectedDepts(prev => prev.filter(d => d.slug !== slug))
  }

  const addPackage = (pkg: { slugs: string[] }) => {
    const bySlug = new Map(index.map(d => [d.slug, d]))
    const toAdd = pkg.slugs.map(s => bySlug.get(s)).filter((d): d is DepartmentIndexEntry => Boolean(d))
    setSelectedDepts(prev => {
      const have = new Set(prev.map(d => d.slug))
      return [...prev, ...toAdd.filter(d => !have.has(d.slug))]
    })
  }

  const selectAllDepts = () => setSelectedDepts(index.slice())
  const clearDepts = () => setSelectedDepts([])

  // Bir puan türündeki (SAY/EA/SÖZ/DİL) tüm bölümleri seçime ekler.
  const selectDeptsByScore = (code: string) =>
    addPackage({ slugs: index.filter(d => d.scoreType === code).map(d => d.slug) })

  // Tüm şehirler = 81 il + KKTC (Kıbrıs) + YD (yurt dışı); hepsi turkeyCities'te.
  const selectAllCities = () => setSelectedPlates(new Set(turkeyCities.map(c => c.plate)))
  const clearCities = () => setSelectedPlates(new Set())

  const handleConfirm = async () => {
    if (selectedPlates.size === 0 || selectedDepts.length === 0) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await Promise.all(selectedDepts.map(d => loadDepartment(d.slug)))
      setResults(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const hazir = selectedPlates.size > 0 && selectedDepts.length > 0

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <a className="app-brand" href="#">
            <span className="app-brand-mark" aria-hidden="true">
              YKS
            </span>
            <span className="app-brand-text">
              <strong>Tercih Aracı</strong>
              <span>Üniversite bölüm sıralamaları</span>
            </span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div className="app-body">
        <div className="app-intro">
          <h1>Nereye, hangi sırayla girebilirsin?</h1>
          <p>
            İl ve bölüm seç; 2025 başarı sıralamalarını yan yana gör, tercih listeni kur, bağlantıyla
            arkadaşlarına gönder.
          </p>
        </div>

        {indexError && (
          <div className="app-banner app-banner-error">
            Bölüm listesi yüklenemedi: {indexError}. Scraper henüz çalıştırılmamış olabilir
            (<code>scraper/run.js</code>).
          </div>
        )}

        <main className="app-main">
          <section className="app-panel">
            <header className="app-panel-head">
              <span className="app-step" aria-hidden="true">
                1
              </span>
              <div>
                <h2>İl seç</h2>
                <p>Haritadan tıkla ya da yazarak ara.</p>
              </div>
              {selectedPlates.size > 0 && <span className="app-panel-count">{selectedPlates.size} il</span>}
            </header>
            <CitySearch selectedPlates={selectedPlates} onToggle={togglePlate} />
            <TurkeyMap selected={selectedPlates} onToggle={togglePlate} />
            <div className="map-extra">
              <button
                type="button"
                className="map-extra-btn is-primary"
                onClick={selectAllCities}
                title="81 il + Kıbrıs + yurt dışını birden seçer"
              >
                Tüm şehirler
              </button>
              <button
                type="button"
                className={`map-extra-btn${selectedPlates.has('YD') ? ' is-active' : ''}`}
                onClick={() => togglePlate('YD')}
                aria-pressed={selectedPlates.has('YD')}
              >
                🌍 Yurt dışı
              </button>
              {selectedPlates.size > 0 && (
                <button type="button" className="map-extra-clear" onClick={clearCities}>
                  Temizle
                </button>
              )}
              <span className="map-extra-hint">Kıbrıs haritada güneyde.</span>
            </div>
            <div className="selected-cities">
              {selectedCityNames.length === 0 && <p className="app-empty">Henüz il seçmediniz.</p>}
              {selectedPlates.size > 20 ? (
                <p className="department-picker-summary">
                  <strong>{selectedPlates.size}</strong> şehir seçili (Kıbrıs ve yurt dışı dahil).
                </p>
              ) : (
                [...selectedPlates].map(plate => (
                  <span key={plate} className="chip">
                    {cityByPlate.get(plate)}
                    <button type="button" onClick={() => togglePlate(plate)} aria-label="kaldır">
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="app-panel">
            <header className="app-panel-head">
              <span className="app-step" aria-hidden="true">
                2
              </span>
              <div>
                <h2>Bölüm seç</h2>
                <p>Hazır paketlerden birine bas ya da tek tek ara.</p>
              </div>
              {selectedDepts.length > 0 && (
                <span className="app-panel-count">{selectedDepts.length} bölüm</span>
              )}
            </header>
            <DepartmentPicker
              index={index}
              selected={selectedDepts}
              onAdd={addDept}
              onRemove={removeDept}
              onAddPackage={addPackage}
              onSelectAll={selectAllDepts}
              onClearAll={clearDepts}
              onSelectByScore={selectDeptsByScore}
            />
          </section>
        </main>

        <div className="app-confirm-row">
          <button
            type="button"
            className="app-confirm-button"
            disabled={!hazir || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Yükleniyor…' : 'Sıralamaları getir'}
          </button>
          {!hazir && !loading && (
            <p className="app-confirm-hint">
              {selectedPlates.size === 0 && selectedDepts.length === 0
                ? 'Devam etmek için en az bir il ve bir bölüm seçin.'
                : selectedPlates.size === 0
                  ? 'Bir il seçmen kaldı.'
                  : 'Bir bölüm seçmen kaldı.'}
            </p>
          )}
        </div>

        {loadError && <div className="app-banner app-banner-error">{loadError}</div>}

        <section className="app-results">
          <TercihListesi />
          {results.length > 0 && <ResultsControls options={options} onChange={patchOptions} />}
          <ResultsTable departments={results} selectedCityNames={selectedCityNames} options={options} />
        </section>
      </div>
    </div>
  )
}

export default App
