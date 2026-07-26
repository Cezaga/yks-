import { normalizeKey } from './normalize'

// ---------------------------------------------------------------------------
// 2026 ÖSYM kılavuz verisi.
//
// Şema: docs/KILAVUZ_CONTRACT.md
//   app/public/data/kilavuz/lookup.json      — KOMPAKT program kayıtları (~2.8 MB) ← önce bu
//   app/public/data/kilavuz/programs.json    — tam program kayıtları (~12 MB), yedek
//   app/public/data/kilavuz/conditions.json  — { "144": "açıklama" }
//   app/public/data/kilavuz/byKey.json       — matchKey -> code[] (UI'de gerekmez;
//                                              matchKey aynı kuralla burada üretiliyor)
//
// Bu dosyalar başka bir ajan tarafından üretiliyor ve HENÜZ OLMAYABİLİR.
// Bu yüzden her şey "yumuşak": 404 / bozuk JSON / html fallback → boş veri.
// Uygulama hiçbir koşulda patlamaz, sadece kılavuz bölümü gizlenir.
// ---------------------------------------------------------------------------

export interface KilavuzQuota2026 {
  genel: number | null
  okulBirincisi: number | null
  meb: number | null
  sehitGazi: number | null
  kadin34: number | null
}

export interface KilavuzStaff {
  prof: number | null
  docent: number | null
  drOgrUyesi: number | null
}

export interface KilavuzProgram {
  code: string
  university: string
  city: string | null
  universityType: string | null
  faculty: string | null
  program: string
  level: string | null
  duration: number | null
  scoreType: string | null
  quota2026: KilavuzQuota2026 | null
  conditionCodes: (number | string)[]
  y2025: { rank: number | null; score: number | null } | null
  staff: KilavuzStaff | null
  accreditation: string | null
  kpss: number | null
  matchKey: string
}

export interface KilavuzData {
  /** matchKey -> kayıtlar (aynı anahtarda burslu/ücretli/İngilizce varyantları olabilir) */
  byKey: Map<string, KilavuzProgram[]>
  /** koşul kodu (string) -> açıklama metni */
  conditions: Record<string, string>
  programCount: number
  /** programs.json gerçekten okunabildi mi */
  available: boolean
}

export const EMPTY_KILAVUZ: KilavuzData = {
  byKey: new Map(),
  conditions: {},
  programCount: 0,
  available: false
}

const BASE = '/data/kilavuz'

/** Asla throw etmez; dosya yoksa / JSON değilse null döner. */
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    const head = text.trimStart()[0]
    // Dev sunucusu bilinmeyen yolda index.html döndürürse JSON.parse patlamasın.
    if (head !== '{' && head !== '[') return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return null
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function normalizeProgram(raw: unknown): KilavuzProgram | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const code = asString(r.code) ?? (asNumber(r.code) != null ? String(r.code) : null)
  const program = asString(r.program)
  const university = asString(r.university)
  if (!code || !program || !university) return null

  const q = (r.quota2026 ?? null) as Record<string, unknown> | null
  const s = (r.staff ?? null) as Record<string, unknown> | null
  const y = (r.y2025 ?? null) as Record<string, unknown> | null

  const codes = Array.isArray(r.conditionCodes)
    ? (r.conditionCodes.filter(c => typeof c === 'number' || typeof c === 'string') as (number | string)[])
    : []

  return {
    code,
    university,
    city: asString(r.city),
    universityType: asString(r.universityType),
    faculty: asString(r.faculty),
    program,
    level: asString(r.level),
    duration: asNumber(r.duration),
    scoreType: asString(r.scoreType),
    quota2026: q
      ? {
          genel: asNumber(q.genel),
          okulBirincisi: asNumber(q.okulBirincisi),
          meb: asNumber(q.meb),
          sehitGazi: asNumber(q.sehitGazi),
          kadin34: asNumber(q.kadin34)
        }
      : null,
    conditionCodes: codes,
    y2025: y ? { rank: asNumber(y.rank), score: asNumber(y.score) } : null,
    staff: s
      ? { prof: asNumber(s.prof), docent: asNumber(s.docent), drOgrUyesi: asNumber(s.drOgrUyesi) }
      : null,
    accreditation: asString(r.accreditation),
    kpss: asNumber(r.kpss),
    matchKey: asString(r.matchKey) ?? `${normalizeKey(university)}||${normalizeKey(program)}`
  }
}

// --- kompakt lookup.json çözücü --------------------------------------------
//
// { v:1, fields:[...], unis:["AD|ŞEHİR|TÜR", ...], facs:[...], rows:[[...], ...] }
// Alan sırası scraper/parseKilavuz.js içindeki LOOKUP alan listesiyle aynıdır.

interface LookupFile {
  v?: unknown
  unis?: unknown
  facs?: unknown
  rows?: unknown
}

function decodeLookup(raw: unknown): unknown[] | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const f = raw as LookupFile
  if (!Array.isArray(f.rows) || !Array.isArray(f.unis) || !Array.isArray(f.facs)) return null

  const unis = f.unis.map(u => {
    const [name = '', city = '', type = ''] = String(u).split('|')
    return { name, city, type }
  })
  const facs = f.facs.map(x => String(x))

  const out: unknown[] = []
  for (const row of f.rows) {
    if (!Array.isArray(row)) continue
    const u = unis[Number(row[1])]
    if (!u || !u.name) continue
    out.push({
      code: row[0],
      university: u.name,
      city: u.city || null,
      universityType: u.type || null,
      faculty: facs[Number(row[2])] ?? null,
      program: row[3],
      level: row[4] === 1 ? 'lisans' : 'onlisans',
      duration: row[5],
      scoreType: row[6],
      quota2026: {
        genel: row[7],
        okulBirincisi: row[8],
        meb: row[9],
        sehitGazi: row[10],
        kadin34: row[11]
      },
      conditionCodes: Array.isArray(row[12]) ? row[12] : [],
      y2025: { rank: row[13], score: row[14] },
      staff:
        row[15] == null && row[16] == null && row[17] == null
          ? null
          : { prof: row[15], docent: row[16], drOgrUyesi: row[17] },
      accreditation: row[18],
      kpss: row[19]
    })
  }
  return out.length ? out : null
}

function push(map: Map<string, KilavuzProgram[]>, key: string, p: KilavuzProgram) {
  if (!key || key === '||') return
  const arr = map.get(key)
  if (!arr) {
    map.set(key, [p])
    return
  }
  if (!arr.some(x => x.code === p.code)) arr.push(p)
}

let cached: Promise<KilavuzData> | null = null

/** Kılavuz verisini bir kere yükler (lazy). Hata durumunda EMPTY_KILAVUZ döner. */
export function loadKilavuz(): Promise<KilavuzData> {
  if (!cached) {
    cached = (async (): Promise<KilavuzData> => {
      // Önce kompakt lookup.json; yoksa tam programs.json.
      const [lookupRaw, conditionsRaw] = await Promise.all([
        fetchJson<unknown>(`${BASE}/lookup.json`),
        fetchJson<unknown>(`${BASE}/conditions.json`)
      ])

      let list: unknown[] = decodeLookup(lookupRaw) ?? []
      if (list.length === 0) {
        const programsRaw = await fetchJson<unknown>(`${BASE}/programs.json`)
        list = Array.isArray(programsRaw)
          ? programsRaw
          : Array.isArray((programsRaw as { programs?: unknown[] } | null)?.programs)
            ? ((programsRaw as { programs: unknown[] }).programs)
            : []
      }

      if (list.length === 0) return EMPTY_KILAVUZ

      const byKey = new Map<string, KilavuzProgram[]>()
      let programCount = 0

      for (const raw of list) {
        const p = normalizeProgram(raw)
        if (!p) continue
        programCount++
        push(byKey, p.matchKey, p)
        // Ek anahtar: parantezli nitelikler ("(İngilizce)", "(Burslu)") atılmış hâli,
        // uygulama tarafındaki sade `program` alanıyla da eşleşsin.
        const bare = p.program.replace(/\([^)]*\)/g, ' ')
        push(byKey, `${normalizeKey(p.university)}||${normalizeKey(bare)}`, p)
      }

      const conditions: Record<string, string> = {}
      if (conditionsRaw && typeof conditionsRaw === 'object' && !Array.isArray(conditionsRaw)) {
        for (const [k, v] of Object.entries(conditionsRaw as Record<string, unknown>)) {
          if (typeof v === 'string') conditions[String(k).trim()] = v
        }
      }

      return { byKey, conditions, programCount, available: true }
    })().catch(() => EMPTY_KILAVUZ)
  }
  return cached
}

// --- eşleştirme ------------------------------------------------------------

export interface KilavuzLookupInput {
  university: string
  program: string
  programRaw: string
  faculty?: string | null
  scoreType?: string | null
}

// Kazınmış veride `university` alanı bazen fakülte + il + tür ile kirli geliyor:
//   "İZMİR KAVRAM MESLEK YÜKSEKOKULU İzmir Kavram Meslek Yüksekokulu (İZMİR) (Vakıf)"
// Kılavuz tarafı ise temiz ("İZMİR KAVRAM MESLEK YÜKSEKOKULU"). En spesifikten
// en sadeye doğru varyant üretip ilk eşleşen varyantta duruyoruz.
const INST_END = /(ÜNİVERSİTESİ|YÜKSEKOKULU|ENSTİTÜSÜ|KONSERVATUVARI|AKADEMİSİ|FAKÜLTESİ)/i

function universityVariants(raw: string): string[] {
  const out: string[] = []
  const add = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim()
    if (t && !out.includes(t)) out.push(t)
  }
  add(raw)
  const noParens = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  add(noParens)
  const m = noParens.match(INST_END)
  if (m && m.index != null) add(noParens.slice(0, m.index + m[0].length))
  return out
}

/** Sıra: en spesifik anahtardan en sadeye. */
export function matchKeyCandidates(input: KilavuzLookupInput): string[] {
  const out: string[] = []
  for (const uniRaw of universityVariants(input.university)) {
    const uni = normalizeKey(uniRaw)
    if (!uni) continue
    for (const p of [input.programRaw, input.program, input.programRaw.replace(/\([^)]*\)/g, ' ')]) {
      const key = `${uni}||${normalizeKey(p)}`
      if (key !== `${uni}||` && !out.includes(key)) out.push(key)
    }
  }
  return out
}

// --- ZORUNLU nitelik uyumu -------------------------------------------------
//
// Ücret/dil/öğretim-biçimi nitelikleri AYRI programlardır: "(Ücretli)" satırına
// "(Burslu)" kaydının kontenjanını göstermek düpedüz yanlış veridir. Bu yüzden
// bunlar puanlanmaz — uyuşmayan aday tamamen elenir.
const FUNDING = ['burslu', 'ucretli', 'indirimli']
const LANG = ['ingilizce', 'almanca', 'fransizca', 'arapca', 'rusca', 'cince', 'japonca', 'farsca', 'italyanca', 'ispanyolca']
const MODE = ['mtok', 'kktc', 'acikogretim', 'uzaktanogretim', 'ikinciogretim']

interface Signature {
  funding: string[]
  lang: string[]
  mode: string[]
  pct: string | null
}

function signature(text: string): Signature {
  const t = normalizeKey(text)
  return {
    funding: FUNDING.filter(f => t.includes(f)),
    lang: LANG.filter(l => t.includes(l)),
    mode: MODE.filter(m => t.includes(m)),
    pct: (text.match(/%\s?(\d+)/) ?? [])[1] ?? null
  }
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))

function compatible(inputProgram: string, candidateProgram: string): boolean {
  const a = signature(inputProgram)
  const b = signature(candidateProgram)
  if (!sameSet(a.funding, b.funding)) return false
  if (!sameSet(a.lang, b.lang)) return false
  if (!sameSet(a.mode, b.mode)) return false
  if (a.pct && b.pct && a.pct !== b.pct) return false // %50 ile %25 ayrı program
  return true
}

export interface KilavuzMatch {
  program: KilavuzProgram
  /** Zorunlu uyumu geçen aday sayısı (1 ise tek ve net). */
  candidateCount: number
  /** true ise adaylar ayrıştırılamadı ama 2026 kontenjanları aynıydı. */
  ambiguousButEqual: boolean
}

/**
 * Eşleşme yoksa VEYA güvenle ayrıştırılamıyorsa null döner — çağıran taraf
 * kılavuz bölümünü göstermez. Yanlış kontenjan göstermek, göstermemekten kötüdür.
 */
export function findKilavuzProgram(data: KilavuzData, input: KilavuzLookupInput): KilavuzMatch | null {
  if (data.byKey.size === 0) return null

  // En spesifik üniversite varyantında bir şey bulunduysa daha sadelerine inmeyiz.
  const seen = new Map<string, KilavuzProgram>()
  for (const uniRaw of universityVariants(input.university)) {
    const uni = normalizeKey(uniRaw)
    if (!uni) continue
    for (const p of [input.programRaw, input.program, input.programRaw.replace(/\([^)]*\)/g, ' ')]) {
      for (const c of data.byKey.get(`${uni}||${normalizeKey(p)}`) ?? []) seen.set(c.code, c)
    }
    if (seen.size > 0) break
  }

  let cands = [...seen.values()]
  if (cands.length === 0) return null

  // 1) Ücret/dil/biçim niteliği uyuşmayanları ELE (puanlama değil, eleme).
  cands = cands.filter(c => compatible(input.programRaw, c.program))
  if (cands.length === 0) return null

  const single = (p: KilavuzProgram, count: number): KilavuzMatch => ({
    program: p,
    candidateCount: count,
    ambiguousButEqual: false
  })
  const found = cands.length
  if (cands.length === 1) return single(cands[0], found)

  // 2) Puan türü
  if (input.scoreType) {
    const byScore = cands.filter(c => c.scoreType && normalizeKey(c.scoreType) === normalizeKey(input.scoreType))
    if (byScore.length > 0) cands = byScore
  }
  if (cands.length === 1) return single(cands[0], found)

  // 3) Tam ad eşleşmesi
  const exact = cands.filter(c => normalizeKey(c.program) === normalizeKey(input.programRaw))
  if (exact.length === 1) return single(exact[0], found)
  if (exact.length > 1) cands = exact

  // 4) Fakülte
  if (input.faculty) {
    const byFaculty = cands.filter(c => c.faculty && normalizeKey(c.faculty) === normalizeKey(input.faculty))
    if (byFaculty.length === 1) return single(byFaculty[0], found)
    if (byFaculty.length > 1) cands = byFaculty
  }
  if (cands.length === 1) return single(cands[0], found)

  // 5) Hâlâ ayrışmadı: kontenjanlar aynıysa hangisini seçtiğimiz fark etmez.
  //    Farklıysa REDDET — yanlış sayı göstermeyiz. (Ör. kılavuzda ayrı yerleşke
  //    kayıtları var, bizim veride yerleşke bilgisi yok.)
  const quotas = new Set(cands.map(c => c.quota2026?.genel ?? null))
  if (quotas.size === 1) {
    return { program: cands[0], candidateCount: found, ambiguousButEqual: true }
  }
  return null
}

/** Koşul kodlarını `{ code, text }` listesine çevirir; metni yoksa text null. */
export function resolveConditions(
  data: KilavuzData,
  codes: (number | string)[]
): { code: string; text: string | null }[] {
  return codes.map(c => {
    const key = String(c).trim()
    return { code: key, text: data.conditions[key] ?? null }
  })
}
