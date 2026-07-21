import { useMemo } from 'react'
import type { YearEntry } from '../types'
import type { SortDir, GroupMode } from './ResultsControls'

export const BASE_YEAR = 2025
const PAST_YEARS = [2024, 2023, 2022]

export interface ProgramRow {
  key: string
  departmentName: string
  university: string
  faculty: string | null
  city: string
  program: string
  scoreType: string
  funding: string
  byYear: Map<number, YearEntry>
  baseRank: number | null
}

export interface RankRange {
  min: string
  max: string
}

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

function HeadCols() {
  return (
    <>
      <th>İl</th>
      <th>Üniversite</th>
      <th>Bölüm</th>
      <th>Ücret</th>
      <th>{BASE_YEAR} Sıra</th>
      <th>{BASE_YEAR} Puan</th>
      {PAST_YEARS.map(y => (
        <th key={y}>{y} Sıra</th>
      ))}
    </>
  )
}

function RowCells({ row }: { row: ProgramRow }) {
  const base = row.byYear.get(BASE_YEAR)
  return (
    <>
      <td>{row.city}</td>
      <td>
        {row.university}
        {row.faculty && <div className="results-faculty">{row.faculty}</div>}
      </td>
      <td>{row.program}</td>
      <td>{row.funding}</td>
      <td className="rt-primary">{base?.rank ?? '—'}</td>
      <td>{base?.score ?? '—'}</td>
      {PAST_YEARS.map(y => (
        <td key={y} className="rt-past">
          {row.byYear.get(y)?.rank ?? '—'}
        </td>
      ))}
    </>
  )
}

function Table({ rows }: { rows: ProgramRow[] }) {
  return (
    <div className="results-table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <HeadCols />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key}>
              <RowCells row={r} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FieldSection({ label, rows, range, onRangeChange, sortDir, groupMode }: FieldSectionProps) {
  const visible = useMemo(() => sortRows(applyRange(rows, range), sortDir), [rows, range, sortDir])

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
              <Table rows={cityRows} />
            </div>
          ))}
        </div>
      ) : (
        <Table rows={visible} />
      )}
    </section>
  )
}
