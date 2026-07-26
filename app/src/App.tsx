import { useEffect, useMemo, useState } from 'react'
import TurkeyMap from './components/TurkeyMap'
import CitySearch from './components/CitySearch'
import DepartmentPicker from './components/DepartmentPicker'
import ResultsTable from './components/ResultsTable'
import ResultsControls, { type ResultsOptions } from './components/ResultsControls'
import TercihListesi from './components/TercihListesi'
import turkeyCities from './data/turkeyCities'
import { loadDepartment, loadIndex } from './lib/dataLoader'
import { readStateFromUrl } from './lib/share'
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

  // Paylaşılan bağlantıdaki durumu uygular. index henüz gelmediyse bölümler
  // atlanır; o yüzden index geldikten sonra da bir kez çağrılır.
  const applyShared = (
    shared: ReturnType<typeof readStateFromUrl>,
    idx: DepartmentIndexEntry[]
  ) => {
    if (!shared) return
    if (shared.plates.length) setSelectedPlates(new Set(shared.plates))
    if (shared.tercihler.length) replaceTercihler(shared.tercihler)
    if (shared.deptSlugs.length && idx.length) {
      const bySlug = new Map(idx.map(d => [d.slug, d]))
      const restored = shared.deptSlugs
        .map(s => bySlug.get(s))
        .filter((d): d is DepartmentIndexEntry => Boolean(d))
      if (restored.length) setSelectedDepts(restored)
    }
  }

  useEffect(() => {
    const shared = readStateFromUrl()
    applyShared(shared, [])

    loadIndex()
      .then(idx => {
        setIndex(idx)
        applyShared(shared, idx)
      })
      .catch(err => setIndexError(err.message))
  }, [])

  // Site zaten açıkken paylaşım bağlantısı yapıştırılırsa yalnızca hash değişir,
  // sayfa yeniden yüklenmez. Bu durumda da durumu uygula.
  useEffect(() => {
    const onHashChange = () => applyShared(readStateFromUrl(), index)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [index])

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Türkiye Üniversite Bölüm Sıralamaları</h1>
        <p>Haritadan il, sağdan bölüm seçip Onayla'ya basın.</p>
      </header>

      {indexError && (
        <div className="app-banner app-banner-error">
          Bölüm listesi yüklenemedi: {indexError}. Scraper henüz çalıştırılmamış olabilir
          (<code>scraper/run.js</code>).
        </div>
      )}

      <main className="app-main">
        <section className="app-panel">
          <h2>İller</h2>
          <CitySearch selectedPlates={selectedPlates} onToggle={togglePlate} />
          <TurkeyMap selected={selectedPlates} onToggle={togglePlate} />
          <div className="selected-cities">
            {selectedCityNames.length === 0 && (
              <p className="results-hint">Haritadan bir veya daha fazla il seçin.</p>
            )}
            {[...selectedPlates].map(plate => (
              <span key={plate} className="department-picker-chip">
                {cityByPlate.get(plate)}
                <button type="button" onClick={() => togglePlate(plate)} aria-label="kaldır">
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="app-panel">
          <h2>Bölümler</h2>
          <DepartmentPicker
            index={index}
            selected={selectedDepts}
            onAdd={addDept}
            onRemove={removeDept}
            onAddPackage={addPackage}
          />
        </section>
      </main>

      <div className="app-confirm-row">
        <button
          type="button"
          className="app-confirm-button"
          disabled={selectedPlates.size === 0 || selectedDepts.length === 0 || loading}
          onClick={handleConfirm}
        >
          {loading ? 'Yükleniyor...' : 'Onayla'}
        </button>
      </div>

      {loadError && <div className="app-banner app-banner-error">{loadError}</div>}

      <section className="app-results">
        <TercihListesi plates={[...selectedPlates]} deptSlugs={selectedDepts.map(d => d.slug)} />
        {results.length > 0 && (
          <ResultsControls options={options} onChange={patchOptions} />
        )}
        <ResultsTable departments={results} selectedCityNames={selectedCityNames} options={options} />
      </section>
    </div>
  )
}

export default App
