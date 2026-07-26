import { useMemo, useState } from 'react'
import type { SortDir, GroupMode } from './ResultsControls'
import { BASE_YEAR, type ProgramRow, type RankRange } from './programRow'
import ProgramDetails from './ProgramDetails'
import { MAX_TERCIH, tercihKey, toggleTercih, useTercihler } from '../lib/tercihler'

export { BASE_YEAR }
export type { ProgramRow, RankRange }

const COL_COUNT = 6

interface FieldSectionProps {
  label: string
  rows: ProgramRow[] // already filtered by city + funding, all same scoreType
  range: RankRange
  onRangeChange: (patch: Partial<RankRange>) => void
  sortDir: SortDir
  groupMode: GroupMode
}

function applyRange(rows: ProgramRow[], range: RankRange): ProgramRow[] {
  const min = range.min.trim() ? Number(range.min) : null
  const max = range.max.trim() ? Number(range.max) : null
  if (min == null && max == null) return rows
  return rows.filter(r => {
    if (r.baseRank == null) return false
    if (min != null && r.baseRank < min) return false
    if (max != null && r.baseRank > max) return false
    return true
  })
}

function sortRows(rows: ProgramRow[], sortDir: SortDir): ProgramRow[] {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (a.baseRank == null && b.baseRank == null) return 0
    if (a.baseRank == null) return 1
    if (b.baseRank == null) return -1
    return (a.baseRank - b.baseRank) * dir
  })
}

function detailId(key: string): string {
  return `pd-${key.replace(/[^a-zA-Z0-9_-]+/g, '-')}`
}

interface TableProps {
  rows: ProgramRow[]
  isOpen: (key: string) => boolean
  onToggle: (key: string) => void
}

function Table({ rows, isOpen, onToggle }: TableProps) {
  const tercihler = useTercihler()
  const ekliKeys = useMemo(() => new Set(tercihler.map(t => t.key)), [tercihler])

  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th className="rt-fav-col">
              <span className="rt-sr-only">Tercih</span>
            </th>
            <th>İl</th>
            <th>Üniversite</th>
            <th>Bölüm</th>
            <th>{BASE_YEAR} Sıra</th>
            <th className="rt-chevron-col">
              <span className="rt-sr-only">Detay</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const open = isOpen(r.key)
            const id = detailId(r.key)
            return [
              <tr
                key={r.key}
                className={`rt-row${open ? ' is-open' : ''}`}
                role="button"
                tabIndex={0}
                aria-expanded={open}
                aria-controls={id}
                onClick={() => onToggle(r.key)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault()
                    onToggle(r.key)
                  }
                }}
              >
                <td className="rt-fav-col">
                  {(() => {
                    const tk = tercihKey(r)
                    const ekli = ekliKeys.has(tk)
                    return (
                      <button
                        type="button"
                        className={`rt-fav${ekli ? ' is-ekli' : ''}`}
                        aria-label={ekli ? 'Tercih listesinden çıkar' : 'Tercih listeme ekle'}
                        title={ekli ? 'Tercih listesinden çıkar' : 'Tercih listeme ekle'}
                        onClick={e => {
                          e.stopPropagation() // satırın detayını açmasın
                          const ok = toggleTercih({
                            key: tk,
                            city: r.city,
                            university: r.university,
                            faculty: r.faculty,
                            program: r.program,
                            programRaw: r.programRaw,
                            scoreType: r.scoreType,
                            funding: r.funding,
                            rank: r.byYear.get(BASE_YEAR)?.rank ?? null
                          })
                          if (!ok) alert(`Tercih listesi dolu (en fazla ${MAX_TERCIH} tercih).`)
                        }}
                      >
                        {ekli ? '★' : '+'}
                      </button>
                    )
                  })()}
                </td>
                <td className="rt-city">{r.city}</td>
                <td className="rt-uni">{r.university}</td>
                <td className="rt-program">{r.program}</td>
                <td className="rt-primary">{r.byYear.get(BASE_YEAR)?.rank ?? '—'}</td>
                <td className="rt-chevron-col">
                  <span className="rt-chevron" aria-hidden="true">
                    ›
                  </span>
                </td>
              </tr>,
              open ? (
                <tr key={`${r.key}::detail`} className="rt-detail-row">
                  <td id={id} colSpan={COL_COUNT}>
                    <ProgramDetails row={r} />
                  </td>
                </tr>
              ) : null
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function FieldSection({ label, rows, range, onRangeChange, sortDir, groupMode }: FieldSectionProps) {
  const visible = useMemo(() => sortRows(applyRange(rows, range), sortDir), [rows, range, sortDir])

  // Birden fazla satır aynı anda açık kalabilir.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const isOpen = (key: string) => expanded.has(key)

  const cityGroups = useMemo(() => {
    const map = new Map<string, ProgramRow[]>()
    for (const r of visible) {
      const arr = map.get(r.city) ?? []
      arr.push(r)
      map.set(r.city, arr)
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...map.entries()].sort((a, b) => {
      const ba = Math.min(...a[1].map(r => r.baseRank ?? Infinity))
      const bb = Math.min(...b[1].map(r => r.baseRank ?? Infinity))
      return (ba - bb) * dir
    })
  }, [visible, sortDir])

  return (
    <section className="field-section">
      <header className="field-section-head">
        <h2>
          {label} <span className="field-count">{visible.length} program</span>
        </h2>
        <div className="rc-range">
          <span className="field-range-label">Sıra aralığı:</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="min"
            value={range.min}
            onChange={e => onRangeChange({ min: e.target.value })}
          />
          <span>–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="max"
            value={range.max}
            onChange={e => onRangeChange({ max: e.target.value })}
          />
          {(range.min || range.max) && (
            <button type="button" className="rc-clear" onClick={() => onRangeChange({ min: '', max: '' })}>
              temizle
            </button>
          )}
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="results-hint">Bu alanda seçilen kriterlere uyan sonuç yok.</p>
      ) : groupMode === 'sehir' ? (
        <div className="results-groups">
          {cityGroups.map(([city, cityRows]) => (
            <div key={city} className="results-city-box">
              <header className="results-city-head">
                <h3>{city}</h3>
                <span>{cityRows.length} program</span>
              </header>
              <Table rows={cityRows} isOpen={isOpen} onToggle={toggle} />
            </div>
          ))}
        </div>
      ) : (
        <Table rows={visible} isOpen={isOpen} onToggle={toggle} />
      )}
    </section>
  )
}
