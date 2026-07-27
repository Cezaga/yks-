import { useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// Tema tercihi.
//
// Varsayılan "sistem": cihazın açık/koyu ayarı ne ise o. Kullanıcı düğmeyle
// sabitlerse <html data-theme="light|dark"> yazılır ve CSS'te cihaz ayarını
// ezer (bkz. styles/tokens.css).
//
// İlk boyamadan önce uygulanması gerekiyor, yoksa koyu tema bekleyen kişi bir
// kare beyaz görüyor. Bu yüzden asıl yazma işini index.html'deki küçük satır
// içi betik yapıyor; burada yalnızca sonraki değişiklikleri yönetiyoruz.
// ---------------------------------------------------------------------------

export type ThemePref = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'yks.theme'

const listeners = new Set<() => void>()

function read(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* gizli sekme / depolama kapalı */
  }
  return 'system'
}

let current: ThemePref = typeof window === 'undefined' ? 'system' : read()

function apply(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function setThemePref(pref: ThemePref) {
  current = pref
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* yazamazsak da tema oturum boyunca çalışır */
  }
  apply(pref)
  listeners.forEach(l => l())
}

/** Sırayla sistem → açık → koyu → sistem. */
export function cycleThemePref() {
  setThemePref(current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system')
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 'system' as ThemePref
  )
}

/** Tercih "sistem" iken fiilen hangi temanın geçerli olduğunu söyler. */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
