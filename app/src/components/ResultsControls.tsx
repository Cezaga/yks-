import { FUNDING_OPTIONS, type Funding } from '../lib/classify'
import './ResultsControls.css'

export type GroupMode = 'genel' | 'sehir'
export type SortDir = 'asc' | 'desc'

export interface ResultsOptions {
  groupMode: GroupMode
  sortDir: SortDir
  funding: Funding[]
}

interface ResultsControlsProps {
  options: ResultsOptions
  onChange: (patch: Partial<ResultsOptions>) => void
}

export default function ResultsControls({ options, onChange }: ResultsControlsProps) {
  const toggleFunding = (f: Funding) => {
    const set = new Set(options.funding)
    if (set.has(f)) set.delete(f)
    else set.add(f)
    onChange({ funding: [...set] })
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
    </div>
  )
}
