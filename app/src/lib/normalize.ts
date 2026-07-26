const FOLD: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  // Düzeltme işaretli harfler: harita verisi "Hakkâri" yazarken kazınan veri
  // "HAKKARİ" diyor. Eşlenmezse â silinip "hakkri" oluyor ve il hiç tutmuyordu.
  â: 'a', î: 'i', û: 'u'
}

// Turkish-aware fold to a plain ascii key so "İSTANBUL" (scraped, uppercase)
// and "İstanbul" (map data) compare equal regardless of case/dotted-I quirks.
export function cityKey(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .split('')
    .map(ch => FOLD[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]/g, '')
}

// Same rule as cityKey, named per docs/KILAVUZ_CONTRACT.md so kılavuz matchKeys
// ("<uni>||<program>") are produced with exactly the parser's normalisation.
export function normalizeKey(input: string | null | undefined): string {
  return input ? cityKey(input) : ''
}
