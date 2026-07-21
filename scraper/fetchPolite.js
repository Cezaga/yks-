import { Agent } from 'undici'

// The site serves an incomplete TLS chain (UNABLE_TO_VERIFY_LEAF_SIGNATURE).
// For a read-only scrape of public data this is acceptable; we relax leaf
// verification only for our own requests via this dispatcher.
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetches a URL with a timeout, retrying on failure/5xx with exponential backoff.
 * Kept deliberately slow/low-concurrency — this site runs on weak hosting and
 * returns intermittent 504s; hammering it makes things worse for everyone.
 */
export async function fetchPolite(url, { retries = 3, timeoutMs = 20000, backoffMs = [3000, 10000, 30000] } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal, dispatcher: insecureAgent })
      clearTimeout(timer)
      if (res.status >= 500) {
        throw new Error(`HTTP ${res.status}`)
      }
      if (res.status === 404) {
        return { ok: false, status: 404, html: null }
      }
      const html = await res.text()
      return { ok: true, status: res.status, html }
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      if (attempt < retries) {
        await sleep(backoffMs[attempt] ?? backoffMs[backoffMs.length - 1])
      }
    }
  }
  return { ok: false, status: null, html: null, error: lastError }
}

export { sleep }
