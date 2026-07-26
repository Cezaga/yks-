// Kısa paylaşım bağlantısı deposu (Vercel serverless).
//
// Tercih listesi (sıkıştırılmış base64 metin) kaydedilir, 6 haneli kimlik döner.
// Böylece bağlantı `.../#s=ab3x9k` gibi ~35 karakter olur.
//
// Depo: Upstash Redis (Vercel KV) REST API. Ortam değişkenleri:
//   KV_REST_API_URL / KV_REST_API_TOKEN            (Vercel KV entegrasyonu)
//   veya UPSTASH_REDIS_REST_URL / ..._TOKEN        (Upstash marketplace)
//
// KV bağlı DEĞİLSE 503 döner; istemci o zaman kendi kendine yeten uzun
// bağlantıya (#tz=) düşer. Yani depo olmadan da uygulama çalışır.

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

const TTL_SECONDS = 60 * 60 * 24 * 180 // 180 gün
const MAX_DATA = 40000 // ~40 KB üst sınır (kötüye kullanımı önler)

async function redis(command) {
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return res.json()
}

function randomId() {
  // 6 karakter, a-z0-9 (~2 milyar kombinasyon)
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

export default async function handler(req, res) {
  if (!REST_URL || !REST_TOKEN) {
    return res.status(503).json({ error: 'storage not configured' })
  }

  try {
    if (req.method === 'POST') {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = {} }
      }
      const data = body && body.data
      if (typeof data !== 'string' || data.length === 0 || data.length > MAX_DATA) {
        return res.status(400).json({ error: 'bad data' })
      }
      // Çakışma olasılığı ihmal edilebilir; yine de birkaç kez dene.
      let id = randomId()
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await redis(['EXISTS', `t:${id}`])
        if (!existing.result) break
        id = randomId()
      }
      await redis(['SET', `t:${id}`, data, 'EX', String(TTL_SECONDS)])
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ id })
    }

    if (req.method === 'GET') {
      const id = req.query && req.query.id
      if (!id || !/^[a-z0-9]{1,12}$/i.test(id)) {
        return res.status(400).json({ error: 'bad id' })
      }
      const out = await redis(['GET', `t:${id}`])
      if (!out || out.result == null) return res.status(404).json({ error: 'not found' })
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.status(200).json({ data: out.result })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch {
    return res.status(500).json({ error: 'server error' })
  }
}
