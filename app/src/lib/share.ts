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

/** Yükü sıkıştırılmış base64 metne çevirir (URL değil). */
async function encodePayload(tercihler: Tercih[]): Promise<{ data: string; compressed: boolean }> {
  const json = JSON.stringify(buildPayload(tercihler))
  if (hasCompression) {
    try {
      return { data: base64UrlEncode(await gzip(json)), compressed: true }
    } catch {
      /* düz yola düş */
    }
  }
  return { data: base64UrlEncode(new TextEncoder().encode(json)), compressed: false }
}

/** Kendi kendine yeten (uzun ama her koşulda çalışan) bağlantı. */
function selfContainedUrl(data: string, compressed: boolean): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${compressed ? 'tz' : 'tj'}=${data}`
}

/**
 * Kısa paylaşım bağlantısı üretir.
 *   1) Veriyi /api/s'e kaydetmeyi dener -> `.../#s=ab3x9k` (~35 karakter).
 *   2) Backend yoksa/başarısızsa kendi kendine yeten `#tz=` bağlantısına düşer.
 */
export async function buildShareUrl(tercihler: Tercih[]): Promise<string> {
  const { data, compressed } = await encodePayload(tercihler)
  try {
    const res = await fetch('/api/s', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: (compressed ? 'z' : 'j') + data })
    })
    const ct = res.headers.get('content-type') || ''
    if (res.ok && ct.includes('application/json')) {
      const out = (await res.json()) as { id?: string }
      if (out.id && /^[a-z0-9]+$/i.test(out.id)) {
        const { origin, pathname } = window.location
        return `${origin}${pathname}#s=${out.id}`
      }
    }
  } catch {
    /* backend yok (ör. localhost) veya erişilemez -> uzun bağlantı */
  }
  return selfContainedUrl(data, compressed)
}

// "z<base64>" / "j<base64>" (veya eski, öneksiz) metinden tercih listesi çözer.
async function decodeData(data: string): Promise<Tercih[] | null> {
  const marker = data[0]
  const body = marker === 'z' || marker === 'j' ? data.slice(1) : data
  const compressed = marker !== 'j' // önek yoksa gzip varsay (eski #tz=)
  let json: string | null = null
  try {
    json = compressed
      ? await gunzip(base64UrlDecode(body))
      : new TextDecoder().decode(base64UrlDecode(body))
  } catch {
    return null
  }
  if (!json) return null
  try {
    return readPayload(JSON.parse(json))
  } catch {
    return null
  }
}

/** Sayfa açılışında/hash değişiminde paylaşılan tercih listesini okur. */
export async function readTercihlerFromUrl(): Promise<Tercih[] | null> {
  const hash = window.location.hash
  const short = hash.match(/[#&]s=([A-Za-z0-9]+)/)
  const zipped = hash.match(/[#&]tz=([A-Za-z0-9\-_]+)/)
  const plain = hash.match(/[#&]tj=([A-Za-z0-9\-_]+)/)
  if (!short && !zipped && !plain) return null

  let list: Tercih[] | null = null

  if (short) {
    try {
      const res = await fetch(`/api/s?id=${encodeURIComponent(short[1])}`)
      const ct = res.headers.get('content-type') || ''
      if (res.ok && ct.includes('application/json')) {
        const out = (await res.json()) as { data?: string }
        if (out.data) list = await decodeData(out.data)
      }
    } catch {
      list = null
    }
  } else if (zipped) {
    list = await decodeData('z' + zipped[1])
  } else if (plain) {
    list = await decodeData('j' + plain[1])
  }

  // Adres çubuğu temiz kalsın; geri tuşu paylaşılan hâle dönmesin.
  history.replaceState(null, '', window.location.pathname + window.location.search)
  return list
}
