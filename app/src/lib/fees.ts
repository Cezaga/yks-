import { normalizeKey } from './normalize'
import { universityVariants } from './kilavuz'

// ---------------------------------------------------------------------------
// Vakıf ve KKTC yükseköğretim kurumlarının 2026-2027 öğrenim ücretleri.
// Kaynak: ÖSYM kılavuzu s.697-788  ->  scraper/parseUcretler.js -> fees.json
//
// ÖSYM iki biçimde veriyor:
//   - program bazlı  ("Bilgisayar Mühendisliği | 1.800.000,00")
//   - kurum bazlı    ("Lisans Programları | 1.295.000,00")  -> 18 üniversite
// Bu yüzden önce programa, bulunamazsa kurumun genel kaydına düşüyoruz.
//
// Ücret "ücretli" (tam) fiyattır; burslu/indirimli programlarda kurum indirim
// uygular. Bu yüzden arayüzde ham rakam değil, bağlamıyla gösterilmeli.
// ---------------------------------------------------------------------------

export type FeeLevel = 'lisans' | 'onlisans' | 'hazirlik'

export interface FeeRecord {
  kind: 'vakif' | 'kktc'
  university: string
  level: FeeLevel | null
  program: string
  feeText: string | null
  fee: number | null
  note: string
}

interface UniFees {
  byProgram: Map<string, FeeRecord[]>
  generic: Map<string, FeeRecord> // level -> kurum geneli kayıt
}

export interface FeeData {
  byUniversity: Map<string, UniFees>
  available: boolean
}

export const EMPTY_FEES: FeeData = { byUniversity: new Map(), available: false }

const GENERIC_RE = /^(lisans|onlisans|onlisansveyalisans)programlari/

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    const head = text.trimStart()[0]
    if (head !== '{' && head !== '[') return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

let cached: Promise<FeeData> | null = null

export function loadFees(): Promise<FeeData> {
  if (!cached) {
    cached = (async (): Promise<FeeData> => {
      const raw = await fetchJson<FeeRecord[]>('/data/kilavuz/fees.json')
      if (!Array.isArray(raw) || raw.length === 0) return EMPTY_FEES

      const byUniversity = new Map<string, UniFees>()
      for (const r of raw) {
        if (!r || typeof r.university !== 'string' || typeof r.program !== 'string') continue
        const uniKey = normalizeKey(r.university)
        if (!uniKey) continue
        let entry = byUniversity.get(uniKey)
        if (!entry) {
          entry = { byProgram: new Map(), generic: new Map() }
          byUniversity.set(uniKey, entry)
        }
        const progKey = normalizeKey(r.program)
        if (GENERIC_RE.test(progKey) && r.level) {
          if (!entry.generic.has(r.level)) entry.generic.set(r.level, r)
        }
        const arr = entry.byProgram.get(progKey)
        if (arr) arr.push(r)
        else entry.byProgram.set(progKey, [r])
      }
      return { byUniversity, available: true }
    })().catch(() => EMPTY_FEES)
  }
  return cached
}

export interface FeeMatch {
  record: FeeRecord
  /** true ise kurumun geneli için verilen ücret (programa özel kayıt yok). */
  generic: boolean
}

/**
 * Devlet üniversiteleri için ücret yoktur (null döner).
 * Program bazlı kayıt yoksa kurumun genel kaydına düşer; o da yoksa null.
 */
export function findFee(
  data: FeeData,
  input: { university: string; program: string; level: FeeLevel | null }
): FeeMatch | null {
  if (data.byUniversity.size === 0) return null

  let entry: UniFees | undefined
  for (const variant of universityVariants(input.university)) {
    entry = data.byUniversity.get(normalizeKey(variant))
    if (entry) break
  }
  if (!entry) return null

  // Parantezli nitelikleri ("(İngilizce)", "(Burslu)") atarak da dene:
  // ücret tablosu programı sade adıyla listeliyor.
  const bare = input.program.replace(/\([^)]*\)/g, ' ')
  for (const candidate of [input.program, bare]) {
    const hits = entry.byProgram.get(normalizeKey(candidate))
    if (!hits || hits.length === 0) continue
    const sameLevel = input.level ? hits.filter(h => h.level === input.level) : []
    const chosen = sameLevel[0] ?? hits[0]
    if (chosen.fee != null) return { record: chosen, generic: false }
  }

  if (input.level) {
    const g = entry.generic.get(input.level)
    if (g && g.fee != null) return { record: g, generic: true }
  }
  return null
}

export function formatFee(fee: number | null): string {
  if (fee == null) return '—'
  return fee.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'
}
