import { useMemo, useState } from 'react'
import turkeyCities from '../data/turkeyCities'
import { cityKey } from '../lib/normalize'
import './DepartmentPicker.css'

interface CitySearchProps {
  selectedPlates: Set<string>
  onToggle: (plate: string) => void
}

// Alphabetical city list (81 il) for the type-to-add search.
const CITIES = [...turkeyCities].sort((a, b) => a.city.localeCompare(b.city, 'tr'))

export default function CitySearch({ selectedPlates, onToggle }: CitySearchProps) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    const key = cityKey(q)
    return CITIES.filter(c => !selectedPlates.has(c.plate) && cityKey(c.city).includes(key)).slice(0, 12)
  }, [query, selectedPlates])

  return (
    <div className="department-picker city-search">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Şehir yazarak ekle (ör. Ankara)..."
        className="department-picker-input"
      />
      {suggestions.length > 0 && (
        <ul className="department-picker-suggestions">
          {suggestions.map(c => (
            <li key={c.plate}>
              <button
                type="button"
                onClick={() => {
                  onToggle(c.plate)
                  setQuery('')
                }}
              >
                {c.city}
                <span className="department-picker-tag">{c.plate}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
