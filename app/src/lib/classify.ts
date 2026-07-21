// Funding category derived from university sector + program text.
export type Funding = 'Devlet' | 'Burslu' | 'İndirimli' | 'Ücretli'

export function deriveFunding(sector: string | null, programRaw: string): Funding {
  if (sector === 'Devlet') return 'Devlet'
  const p = programRaw.toLocaleLowerCase('tr')
  if (/burslu/.test(p)) return 'Burslu' // covers "Tam Burslu"
  if (/i̇ndirimli|indirimli|%\s?\d+/.test(p)) return 'İndirimli'
  if (/ücretli/.test(p)) return 'Ücretli'
  return 'Ücretli' // private program with no explicit tag = full fee
}

export const FUNDING_OPTIONS: Funding[] = ['Devlet', 'Burslu', 'İndirimli', 'Ücretli']

// Score-type fields, in display order, with Turkish section labels.
export const SCORE_FIELDS: { code: string; label: string }[] = [
  { code: 'SAY', label: 'Sayısal (SAY)' },
  { code: 'EA', label: 'Eşit Ağırlık (EA)' },
  { code: 'SÖZ', label: 'Sözel (SÖZ)' },
  { code: 'DİL', label: 'Dil (DİL)' },
  { code: 'TYT', label: 'TYT (2 Yıllık)' }
]

export function fieldLabel(code: string): string {
  return SCORE_FIELDS.find(f => f.code === code)?.label ?? code
}
