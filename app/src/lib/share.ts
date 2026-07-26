import type { Tercih } from './tercihler'

// ---------------------------------------------------------------------------
// Durumu paylaşılabilir bağlantıya gömer / geri okur.
//
// URL hash'ine base64url kodlanmış kompakt JSON yazılır. Hash sunucuya
// gitmez, tamamen istemci tarafında kalır.
//
// Boyut için iki önlem:
//   - Bölüm slug'larının neredeyse tamamındaki uzun ek atılır (bkz. SUFFIX).
//   - Tercihlerde tekrar eden üniversite adları sözlüğe alınır.
// ---------------------------------------------------------------------------

const SUFFIX = '-2024-taban-puanlari-ve-basari-siralamasi'
const SUFFIX_ALT = '-2024-basari-siralamasi-ve-taban-puanlari'

export interface ShareState {
  plates: string[]
  deptSlugs: string[]
  tercihler: Tercih[]
}

const packSlug = (s: string) =>
  s.endsWith(SUFFIX) ? '1' + s.slice(0, -SUFFIX.length)
  : s.endsWith(SUFFIX_ALT) ? '2' + s.slice(0, -SUFFIX_ALT.length)
  : '0' + s

const unpackSlug = (s: string) =>
  s.startsWith('1') ? s.slice(1) + SUFFIX
  : s.startsWith('2') ? s.slice(1) + SUFFIX_ALT
  : s.slice(1)

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function encodeState(state: ShareState): string {
  // Üniversite adlarını sözlükle tekilleştir.
  const unis: string[] = []
  const uniIdx = (name: string) => {
    let i = unis.indexOf(name)
    if (i < 0) { unis.push(name); i = unis.length - 1 }
    return i
  }

  const payload = {
    v: 1,
    c: state.plates,
    d: state.deptSlugs.map(packSlug),
    u: unis, // aşağıdaki map doldururken büyüyecek (referans aynı)
    t: state.tercihler.map(t => [
      t.city,
      uniIdx(t.university),
      t.programRaw,
      t.scoreType,
      t.funding,
      t.rank ?? '',
      t.faculty ?? '',
      t.program
    ])
  }
  return toBase64Url(JSON.stringify(payload))
}

export function decodeState(encoded: string): ShareState | null {
  const json = fromBase64Url(encoded)
  if (!json) return null
  try {
    const p = JSON.parse(json)
    if (!p || p.v !== 1) return null
    const unis: string[] = Array.isArray(p.u) ? p.u.map(String) : []
    const tercihler: Tercih[] = Array.isArray(p.t)
      ? p.t
          .filter((r: unknown) => Array.isArray(r) && r.length >= 6)
          .map((r: (string | number)[]) => {
            const city = String(r[0])
            const university = unis[Number(r[1])] ?? ''
            const programRaw = String(r[2])
            const scoreType = String(r[3])
            return {
              key: [city, university, programRaw, scoreType].join('||'),
              city,
              university,
              programRaw,
              scoreType,
              funding: String(r[4] ?? ''),
              rank: r[5] ? String(r[5]) : null,
              faculty: r[6] ? String(r[6]) : null,
              program: String(r[7] ?? programRaw)
            }
          })
          .filter((t: Tercih) => t.university && t.programRaw)
      : []
    return {
      plates: Array.isArray(p.c) ? p.c.map(String) : [],
      deptSlugs: Array.isArray(p.d) ? p.d.map((s: string) => unpackSlug(String(s))) : [],
      tercihler
    }
  } catch {
    return null
  }
}

/** Paylaşılabilir tam adres. */
export function buildShareUrl(state: ShareState): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#p=${encodeState(state)}`
}

/** Sayfa açılışında hash'teki durumu okur ve hash'i temizler. */
export function readStateFromUrl(): ShareState | null {
  const hash = window.location.hash
  const m = hash.match(/[#&]p=([A-Za-z0-9\-_]+)/)
  if (!m) return null
  const state = decodeState(m[1])
  if (state) {
    // Adres çubuğu temiz kalsın; geri tuşu paylaşılan hâle dönmesin.
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  return state
}
