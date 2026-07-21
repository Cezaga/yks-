export type Level = '4yillik' | '2yillik'

export interface YearEntry {
  year: number
  quota: string | null
  placed: string | null
  rank: string | null
  rankNumeric: number | null
  score: string | null
  scoreNumeric: number | null
}

export interface RankingRow {
  university: string
  faculty: string | null
  city: string | null
  sector: string | null
  program: string
  programRaw: string
  scoreType: string
  years: YearEntry[]
}

export interface DepartmentData {
  name: string
  slug: string
  level: Level
  scoreType: string | null
  url: string
  rows: RankingRow[]
  warnings: string[]
}

export interface DepartmentIndexEntry {
  name: string
  slug: string
  level: Level
  scoreType: string | null
}
