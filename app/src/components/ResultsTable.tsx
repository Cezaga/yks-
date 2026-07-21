import { useMemo, useState } from 'react'
import type { DepartmentData } from '../types'
import { cityKey } from '../lib/normalize'
import { deriveFunding, deriveNationality, deriveLanguage, SCORE_FIELDS } from '../lib/classify'
import type { ResultsOptions } from './ResultsControls'
import FieldSection, { BASE_YEAR, type ProgramRow, type RankRange } from './FieldSection'
import './ResultsTable.css'

export { BASE_YEAR }

interface ResultsTableProps {
  departments: DepartmentData[]
  selectedCityNames: string[]
  options: ResultsOptions
}

function buildRows(departments: DepartmentData[], cityKeys: Set<string>): ProgramRow[] {
  const out: ProgramRow[] = []
  let idx = 0
  for (const dept of departments) {
    for (const row of dept.rows) {
      if (!row.city || !cityKeys.has(cityKey(row.city))) continue
      const byYear = new Map<number, (typeof row.years)[number]>()
      for (const y of row.years) byYear.set(y.year, y)
      const base = byYear.get(BASE_YEAR)
      out.push({
        // idx keeps React keys unique — same uni can offer one program under
        // several quotas that collapse to the same display name.
        key: `${dept.slug}||${row.university}||${row.program}||${row.scoreType}||${idx++}`,
        departmentName: dept.name,
        university: row.university,
        faculty: row.faculty,
        city: row.city,
        program: row.program,
        scoreType: (row.scoreType || '').toUpperCase(),
        funding: deriveFunding(row.sector, row.programRaw),
        nationality: deriveNationality(row.programRaw),
        language: deriveLanguage(row.programRaw),
        byYear,
        baseRank: base?.rankNumeric ?? null
      })
    }
  }
  return out
}

export default function ResultsTable({ departments, selectedCityNames, options }: ResultsTableProps) {
  const cityKeys = useMemo(() => new Set(selectedCityNames.map(cityKey)), [selectedCityNames])
  const [ranges, setRanges] = useState<Record<string, RankRange>>({})

  const patchRange = (field: string, patch: Partial<RankRange>) =>
    setRanges(prev => ({ ...prev, [field]: { ...{ min: '', max: '' }, ...prev[field], ...patch } }))

  const allRows = useMemo(() => buildRows(departments, cityKeys), [departments, cityKeys])

  const filtered = useMemo(() => {
    const fundingSet = new Set(options.funding)
    const langSet = new Set(options.languages)
    return allRows.filter(r => {
      if (fundingSet.size > 0 && !fundingSet.has(r.funding as never)) return false
      if (options.nationality !== 'hepsi' && r.nationality !== options.nationality) return false
      if (langSet.size > 0 && !langSet.has(r.language as never)) return false
      return true
    })
  }, [allRows, options.funding, options.nationality, options.languages])

  // Group by score-type field so SAY / EA / SÖZ / DİL / TYT never mix in one list.
  const byField = useMemo(() => {
    const map = new Map<string, ProgramRow[]>()
    for (const r of filtered) {
      const arr = map.get(r.scoreType) ?? []
      arr.push(r)
      map.set(r.scoreType, arr)
    }
    return map
  }, [filtered])

  if (departments.length === 0) {
    return <p className="results-hint">Sonuçları görmek için sol taraftan il, sağ taraftan bölüm seçip "Onayla"ya basın.</p>
  }
  if (filtered.length === 0) {
    return <p className="results-hint">Seçilen kriterlere uyan sonuç bulunamadı.</p>
  }

  // Known fields first (fixed order), then any unexpected codes.
  const orderedCodes = [
    ...SCORE_FIELDS.map(f => f.code).filter(c => byField.has(c)),
    ...[...byField.keys()].filter(c => !SCORE_FIELDS.some(f => f.code === c))
  ]

  return (
    <div className="results-fields">
      {orderedCodes.map(code => {
        const label = SCORE_FIELDS.find(f => f.code === code)?.label ?? code
        return (
          <FieldSection
            key={code}
            label={label}
            rows={byField.get(code) ?? []}
            range={ranges[code] ?? { min: '', max: '' }}
            onRangeChange={patch => patchRange(code, patch)}
            sortDir={options.sortDir}
            groupMode={options.groupMode}
          />
        )
      })}
    </div>
  )
}
