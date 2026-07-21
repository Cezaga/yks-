import { useMemo, useState } from 'react'
import type { DepartmentIndexEntry } from '../types'
import { cityKey } from '../lib/normalize'
import './DepartmentPicker.css'

interface DepartmentPickerProps {
  index: DepartmentIndexEntry[]
  selected: DepartmentIndexEntry[]
  onAdd: (dept: DepartmentIndexEntry) => void
  onRemove: (slug: string) => void
}

export default function DepartmentPicker({ index, selected, onAdd, onRemove }: DepartmentPickerProps) {
  const [query, setQuery] = useState('')
  const selectedSlugs = useMemo(() => new Set(selected.map(d => d.slug)), [selected])

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    const key = cityKey(q)
    return index
      .filter(d => !selectedSlugs.has(d.slug) && cityKey(d.name).includes(key))
      .slice(0, 30)
  }, [query, index, selectedSlugs])

  return (
    <div className="department-picker">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Bölüm ara (ör. Bilgisayar Mühendisliği)..."
        className="department-picker-input"
      />
      {suggestions.length > 0 && (
        <ul className="department-picker-suggestions">
          {suggestions.map(d => (
            <li key={d.slug}>
              <button
                type="button"
                onClick={() => {
                  onAdd(d)
                  setQuery('')
                }}
              >
                {d.name}
                <span className="department-picker-tag">
                  {d.level === '4yillik' ? '4 Yıllık' : '2 Yıllık'}
                  {d.scoreType ? ` · ${d.scoreType}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="department-picker-chips">
        {selected.length === 0 && <p className="department-picker-empty">Henüz bölüm seçmediniz.</p>}
        {selected.map(d => (
          <span key={d.slug} className="department-picker-chip">
            {d.name}
            <button type="button" onClick={() => onRemove(d.slug)} aria-label={`${d.name} kaldır`}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
