import type { Tercih } from './tercihler'

// ---------------------------------------------------------------------------
// Tercih listesini paylaşılabilir bağlantıya gömer / geri okur.
//
// Paylaşımın ASIL amacı tercih listesidir; arama kutusundaki il/bölüm seçimi
// paylaşıma dahil edilmez (linki gereksiz şişiriyordu — 46 bölüm ~10.000 karakter).
//
// Boyut için üç önlem:
//   1) yalnızca tercih listesi paylaşılır (arama durumu değil),
//   2) tekrar eden üniversite adları sözlüğe alınır,
//   3) tüm yük gzip ile sıkıştırılır (CompressionStream).  ~24 tercih ≈ 500 karakter.
// Sıkıştırma yoksa (çok eski tarayıcı) düz JSON'a düşer.
// ---------------------------------------------------------------------------

interface Payload {
  v: 2
  u: string[] // üniversite sözlüğü
  // [city, uniIndex, programRaw, scoreType, funding, rank]
  t: [string, number, string, string, string, string][]
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

const hasCompression = typeof CompressionStream !== 'undefined'

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Response(text).body!.pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}

function buildPayload(tercihler: Tercih[]): Payload {
  const u: string[] = []
  const uniIdx = (name: string) => {
    let i = u.indexOf(name)
    if (i < 0) { u.push(name); i = u.length - 1 }
    return i
  }
  return {
    v: 2,
    u,
    t: tercihler.map(t => [t.city, uniIdx(t.university), t.programRaw, t.scoreType, t.funding, t.rank ?? ''])
  }
}

function readPayload(p: unknown): Tercih[] {
  if (!p || typeof p !== 'object') return []
  const pl = p as Partial<Payload>
  if (pl.v !== 2 || !Array.isArray(pl.u) || !Array.isArray(pl.t)) return []
  const unis = pl.u.map(String)
  return pl.t
    .filter(r => Array.isArray(r) && r.length >= 4)
    .map(r => {
      const city = String(r[0])
      const university = unis[Number(r[1])] ?? ''
      const programRaw = String(r[2])
      const scoreType = String(r[3])
      return {
        key: [city, university, programRaw, scoreType].join('||'),
        city,
        university,
        faculty: null,
        program: programRaw.replace(/\s*\(\s*\d\s*Y[ıi]ll[ıi]k\s*\)\s*/giu, ' ').replace(/\s+/g, ' ').trim(),
        programRaw,
        scoreType,
        funding: String(r[4] ?? ''),
        rank: r[5] ? String(r[5]) : null
      }
    })
    .filter(t => t.university && t.programRaw)
}

/** Tercih listesini paylaşılabilir tam adrese çevirir (async — sıkıştırma). */
export async function buildShareUrl(tercihler: Tercih[]): Promise<string> {
  const json = JSON.stringify(buildPayload(tercihler))
  const { origin, pathname } = window.location
  if (hasCompression) {
    try {
      const enc = base64UrlEncode(await gzip(json))
      return `${origin}${pathname}#tz=${enc}`
    } catch {
      /* sıkıştırma başarısızsa düz yola düş */
    }
  }
  return `${origin}${pathname}#tj=${base64UrlEncode(new TextEncoder().encode(json))}`
}

/** Sayfa açılışında/hash değişiminde paylaşılan tercih listesini okur. */
export async function readTercihlerFromUrl(): Promise<Tercih[] | null> {
  const hash = window.location.hash
  const zipped = hash.match(/[#&]tz=([A-Za-z0-9\-_]+)/)
  const plain = hash.match(/[#&]tj=([A-Za-z0-9\-_]+)/)
  if (!zipped && !plain) return null

  let json: string | null = null
  try {
    if (zipped) json = await gunzip(base64UrlDecode(zipped[1]))
    else if (plain) json = new TextDecoder().decode(base64UrlDecode(plain[1]))
  } catch {
    return null
  }
  if (!json) return null

  let list: Tercih[] = []
  try {
    list = readPayload(JSON.parse(json))
  } catch {
    return null
  }

  // Adres çubuğu temiz kalsın; geri tuşu paylaşılan hâle dönmesin.
  history.replaceState(null, '', window.location.pathname + window.location.search)
  return list
}
