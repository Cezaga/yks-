import { useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// Tercih listesi ("sepet").
//
// Bileşen ağacının derinliğinde (App -> ResultsTable -> FieldSection -> satır)
// prop geçirmemek için modül düzeyinde küçük bir store + useSyncExternalStore.
// localStorage'a yazılır, sayfa yenilense de kaybolmaz.
// ---------------------------------------------------------------------------

export interface Tercih {
  /** Oturumlar arası sabit kimlik (satır indeksine bağlı DEĞİL). */
  key: string
  city: string
  university: string
  faculty: string | null
  program: string
  programRaw: string
  scoreType: string
  funding: string
  /** 2025 başarı sırası — listede göstermek için. */
  rank: string | null
  /** ÖSYM program kodu (varsa). */
  kod?: number | null
}

const STORAGE_KEY = 'yks.tercihler.v1'
/** ÖSYM merkezi yerleştirmede en fazla 24 tercih yapılabiliyor. */
export const MAX_TERCIH = 24

export function tercihKey(r: {
  university: string
  programRaw: string
  scoreType: string
  city: string
}): string {
  return [r.city, r.university, r.programRaw, r.scoreType].join('||')
}

let state: Tercih[] = load()
const listeners = new Set<() => void>()

function load(): Tercih[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(x => x && typeof x.key === 'string')
  } catch {
    return []
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // kota dolu / gizli mod: sessizce geç, uygulama çalışmaya devam etsin
  }
}

function emit() {
  persist()
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const getSnapshot = () => state
// SSR yok ama useSyncExternalStore imzası için sabit referans gerekiyor.
const EMPTY: Tercih[] = []
const getServerSnapshot = () => EMPTY

export function useTercihler(): Tercih[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function isEkli(key: string): boolean {
  return state.some(t => t.key === key)
}

/** Ekliyse çıkarır, değilse ekler. Sınıra ulaşıldıysa false döner. */
export function toggleTercih(t: Tercih): boolean {
  const i = state.findIndex(x => x.key === t.key)
  if (i >= 0) {
    state = state.filter(x => x.key !== t.key)
    emit()
    return true
  }
  if (state.length >= MAX_TERCIH) return false
  state = [...state, t]
  emit()
  return true
}

export function removeTercih(key: string) {
  state = state.filter(x => x.key !== key)
  emit()
}

export function moveTercih(key: string, dir: -1 | 1) {
  const i = state.findIndex(x => x.key === key)
  if (i < 0) return
  const j = i + dir
  if (j < 0 || j >= state.length) return
  const next = [...state]
  ;[next[i], next[j]] = [next[j], next[i]]
  state = next
  emit()
}

export function clearTercihler() {
  state = []
  emit()
}

/** Paylaşılan bağlantıdan gelen listeyi yükler (mevcut listenin yerine geçer). */
export function replaceTercihler(list: Tercih[]) {
  state = list.slice(0, MAX_TERCIH)
  emit()
}

export function getTercihler(): Tercih[] {
  return state
}
