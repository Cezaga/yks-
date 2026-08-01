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
  onSelectAll: () => void
  onClearAll: () => void
  onSelectByScore: (code: string) => void
}

// Puan türüne göre toplu seçim (TYT/2 yıllık hariç — kullanıcı AYT türlerini istedi).
const SCORE_GROUPS: { code: string; label: string }[] = [
  { code: 'SAY', label: 'Sayısal' },
  { code: 'EA', label: 'Eşit Ağırlık' },
  { code: 'SÖZ', label: 'Sözel' },
  { code: 'DİL', label: 'Dil' }
]

// Bu sayının üstünde tek tek chip göstermek yerine özet gösteriyoruz
// (653 chip listeyi kilitliyordu).
const CHIP_LIMIT = 20

export default function DepartmentPicker({
  index,
  selected,
  onAdd,
  onRemove,
  onAddPackage,
  onSelectAll,
  onClearAll,
  onSelectByScore
}: DepartmentPickerProps) {
  const scoreCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const d of index) if (d.scoreType) c[d.scoreType] = (c[d.scoreType] ?? 0) + 1
    return c
  }, [index])
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

  const allSelected = index.length > 0 && selected.length >= index.length

  return (
    <div className="department-picker">
      <div className="department-picker-selectall">
        <button
          type="button"
          className={`department-picker-all-btn${allSelected ? ' is-active' : ''}`}
          onClick={onSelectAll}
          disabled={allSelected}
          title="Tüm bölümleri birden seçer"
        >
          {allSelected ? `✓ Tüm bölümler seçili (${index.length})` : `Tüm bölümleri seç (${index.length})`}
        </button>
        {selected.length > 0 && (
          <button type="button" className="department-picker-clear-btn" onClick={onClearAll}>
            Seçimi temizle
          </button>
        )}
      </div>

      <div className="department-picker-scoretypes">
        {SCORE_GROUPS.map(g => (
          <button
            key={g.code}
            type="button"
            className="department-picker-score-btn"
            data-field={g.code}
            onClick={() => onSelectByScore(g.code)}
            title={`Tüm ${g.label} (${g.code}) bölümlerini seçime ekler`}
          >
            Tüm {g.label}
            <span className="department-picker-tag">{scoreCounts[g.code] ?? 0}</span>
          </button>
        ))}
      </div>

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
        {selected.length === 0 && <p className="app-empty">Henüz bölüm seçmediniz.</p>}
        {selected.length > CHIP_LIMIT ? (
          <p className="department-picker-summary">
            <strong>{selected.length}</strong> bölüm seçili. Tek tek yönetmek için "Seçimi temizle"yip
            arayabilirsin.
          </p>
        ) : (
          selected.map(d => (
            <span key={d.slug} className="chip">
              {d.name}
              <button type="button" onClick={() => onRemove(d.slug)} aria-label={`${d.name} kaldır`}>
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
