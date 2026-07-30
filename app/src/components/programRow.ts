import type { YearEntry } from '../types'

export const BASE_YEAR = 2025

export interface ProgramRow {
  key: string
  departmentName: string
  university: string
  faculty: string | null
  city: string
  program: string
  /** Ham program adı: "(İngilizce)", "(Burslu)", "(KKTC Uyruklu)" nitelikleri dahil. */
  programRaw: string
  scoreType: string
  funding: string
  nationality: string
  language: string
  byYear: Map<number, YearEntry>
  baseRank: number | null
  /** Programın YÖKATLAS sayfası (varsa). */
  yokUrl: string | null
}

export interface RankRange {
  min: string
  max: string
}
