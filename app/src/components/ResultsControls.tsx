import {
  FUNDING_OPTIONS,
  LANGUAGE_OPTIONS,
  type Funding,
  type Language,
  type Nationality
} from '../lib/classify'
import './ResultsControls.css'

export type GroupMode = 'genel' | 'sehir'
export type SortDir = 'asc' | 'desc'
export type NationalityFilter = 'hepsi' | Nationality

export interface ResultsOptions {
  groupMode: GroupMode
  sortDir: SortDir
  funding: Funding[]
  nationality: NationalityFilter
  languages: Language[]
}

interface ResultsControlsProps {
  options: ResultsOptions
  onChange: (patch: Partial<ResultsOptions> | ((prev: ResultsOptions) => Partial<ResultsOptions>)) => void
}

export default function ResultsControls({ options, onChange }: ResultsControlsProps) {
  // Functional updates so two quick chip clicks don't clobber each other via a
  // stale `options` closure (each click reads the freshest selection).
  const toggleFunding = (f: Funding) => {
    onChange(prev => {
      const set = new Set(prev.funding)
      set.has(f) ? set.delete(f) : set.add(f)
      return { funding: [...set] }
    })
  }
  const toggleLanguage = (l: Language) => {
    onChange(prev => {
      const set = new Set(prev.languages)
      set.has(l) ? set.delete(l) : set.add(l)
      return { languages: [...set] }
    })
  }

  return (
    <div className="results-controls">
      <div className="rc-group">
        <span className="rc-label">Görünüm</span>
        <div className="rc-segment">
          <button
            type="button"
            className={options.groupMode === 'genel' ? 'is-active' : ''}
            onClick={() => onChange({ groupMode: 'genel' })}
          >
            Genel sıralama
          </button>
          <button
            type="button"
            className={options.groupMode === 'sehir' ? 'is-active' : ''}
            onClick={() => onChange({ groupMode: 'sehir' })}
          >
            Şehir şehir
          </button>
        </div>
      </div>

      <div className="rc-group">
        <span className="rc-label">Sıra yönü (2025)</span>
        <div className="rc-segment">
          <button
            type="button"
            className={options.sortDir === 'asc' ? 'is-active' : ''}
            onClick={() => onChange({ sortDir: 'asc' })}
          >
            Düşükten yükseğe
          </button>
          <button
            type="button"
            className={options.sortDir === 'desc' ? 'is-active' : ''}
            onClick={() => onChange({ sortDir: 'desc' })}
          >
            Yüksekten düşüğe
          </button>
        </div>
      </div>

      <div className="rc-group">
        <span className="rc-label">Uyruk</span>
        <div className="rc-segment">
          {(['hepsi', 'TC', 'KKTC'] as NationalityFilter[]).map(n => (
            <button
              key={n}
              type="button"
              className={options.nationality === n ? 'is-active' : ''}
              onClick={() => onChange({ nationality: n })}
            >
              {n === 'hepsi' ? 'Hepsi' : n === 'TC' ? 'T.C. Uyruklu' : 'KKTC Uyruklu'}
            </button>
          ))}
        </div>
      </div>

      <div className="rc-group">
        <span className="rc-label">Ücret türü</span>
        <div className="rc-chips">
          {FUNDING_OPTIONS.map(f => (
            <button
              key={f}
              type="button"
              className={`rc-chip${options.funding.includes(f) ? ' is-active' : ''}`}
              onClick={() => toggleFunding(f)}
            >
              {f}
            </button>
          ))}
          {options.funding.length > 0 && (
            <button type="button" className="rc-clear" onClick={() => onChange({ funding: [] })}>
              tümü
            </button>
          )}
        </div>
      </div>

      <div className="rc-group">
        <span className="rc-label">Öğretim dili</span>
        <div className="rc-chips">
          {LANGUAGE_OPTIONS.map(l => (
            <button
              key={l}
              type="button"
              className={`rc-chip${options.languages.includes(l) ? ' is-active' : ''}`}
              onClick={() => toggleLanguage(l)}
            >
              {l}
            </button>
          ))}
          {options.languages.length > 0 && (
            <button type="button" className="rc-clear" onClick={() => onChange({ languages: [] })}>
              tümü
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
