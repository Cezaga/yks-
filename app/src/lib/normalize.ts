const FOLD: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u'
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
