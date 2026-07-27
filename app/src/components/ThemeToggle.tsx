import { cycleThemePref, useThemePref, type ThemePref } from '../lib/theme'
import './ThemeToggle.css'

const LABEL: Record<ThemePref, string> = {
  system: 'Cihaz ayarı',
  light: 'Açık tema',
  dark: 'Koyu tema'
}

const NEXT: Record<ThemePref, ThemePref> = {
  system: 'light',
  light: 'dark',
  dark: 'system'
}

function Icon({ pref }: { pref: ThemePref }) {
  if (pref === 'light') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="3.6" />
        <path d="M10 1.8v2.1M10 16.1v2.1M18.2 10h-2.1M3.9 10H1.8M15.8 4.2l-1.5 1.5M5.7 14.3l-1.5 1.5M15.8 15.8l-1.5-1.5M5.7 5.7L4.2 4.2" />
      </svg>
    )
  }
  if (pref === 'dark') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.2" y="3.6" width="15.6" height="10.4" rx="1.6" />
      <path d="M6.6 17h6.8" />
    </svg>
  )
}

export default function ThemeToggle() {
  const pref = useThemePref()
  // Ekran okuyucuya ve ipucu balonuna "şu an X, basınca Y olur" diyoruz;
  // tek düğmede üç durum dönerken bu olmazsa ne olacağı tahmin edilemiyor.
  const title = `${LABEL[pref]} · tıkla: ${LABEL[NEXT[pref]]}`

  return (
    <button type="button" className="theme-toggle" onClick={cycleThemePref} title={title} aria-label={title}>
      <Icon pref={pref} />
      <span className="theme-toggle-text">{LABEL[pref]}</span>
    </button>
  )
}
