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

// Nationality quota: most programs are TC (unmarked); some are marked KKTC.
export type Nationality = 'TC' | 'KKTC'

export function deriveNationality(programRaw: string): Nationality {
  return /kktc/i.test(programRaw) ? 'KKTC' : 'TC'
}

// Instruction language derived from the program qualifier.
export type Language = 'Türkçe' | 'İngilizce' | 'Almanca' | 'Fransızca' | 'Arapça'

export function deriveLanguage(programRaw: string): Language {
  const p = programRaw.toLocaleLowerCase('tr')
  if (/i̇ngilizce|ingilizce/.test(p)) return 'İngilizce'
  if (/almanca/.test(p)) return 'Almanca'
  if (/fransızca/.test(p)) return 'Fransızca'
  if (/arapça/.test(p)) return 'Arapça'
  return 'Türkçe'
}

export const LANGUAGE_OPTIONS: Language[] = ['Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'Arapça']

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
