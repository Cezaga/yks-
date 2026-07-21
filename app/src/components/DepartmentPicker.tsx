import { useMemo, useState } from 'react'
import type { DepartmentIndexEntry } from '../types'
import { cityKey } from '../lib/normalize'
import {
  PACKAGES,
  PACKAGE_CATEGORY_LABELS,
  type DepartmentPackage,
  type PackageCategory
} from '../data/packages'
import './DepartmentPicker.css'

interface DepartmentPickerProps {
  index: DepartmentIndexEntry[]
  selected: DepartmentIndexEntry[]
  onAdd: (dept: DepartmentIndexEntry) => void
  onRemove: (slug: string) => void
  onAddPackage: (pkg: DepartmentPackage) => void
}

export default function DepartmentPicker({ index, selected, onAdd, onRemove, onAddPackage }: DepartmentPickerProps) {
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

  // Packages surface when the search matches their name (or "paket"/"yusuf").
  const matchedPackages = useMemo(() => {
    const q = cityKey(query.trim())
    if (!q) return []
    return PACKAGES.filter(p => cityKey(p.name).includes(q) || 'paket'.includes(q))
  }, [query])

  return (
    <div className="department-picker">
      <div className="department-picker-packages">
        {(['ozel', 'ayt', 'tyt'] as PackageCategory[]).map(cat => {
          const list = PACKAGES.filter(p => p.category === cat)
          if (list.length === 0) return null
          return (
            <div key={cat} className="department-picker-package-group">
              <span className="department-picker-package-heading">{PACKAGE_CATEGORY_LABELS[cat]}</span>
              <div className="department-picker-package-row">
                {list.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`department-picker-package-btn is-${cat}`}
                    onClick={() => onAddPackage(p)}
                    title={`${p.slugs.length} bölümü birden ekler`}
                  >
                    ★ {p.name}
                    <span className="department-picker-tag">{p.slugs.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Bölüm ara (ör. Bilgisayar Mühendisliği)..."
        className="department-picker-input"
      />
      {(matchedPackages.length > 0 || suggestions.length > 0) && (
        <ul className="department-picker-suggestions">
          {matchedPackages.map(p => (
            <li key={`pkg-${p.id}`}>
              <button
                type="button"
                className="is-package"
                onClick={() => {
                  onAddPackage(p)
                  setQuery('')
                }}
              >
                ★ {p.name}
                <span className="department-picker-tag">{p.slugs.length} bölüm ekle</span>
              </button>
            </li>
          ))}
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
