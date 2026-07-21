import type { DepartmentData, DepartmentIndexEntry } from '../types'

let indexPromise: Promise<DepartmentIndexEntry[]> | null = null
const departmentCache = new Map<string, Promise<DepartmentData>>()

export function loadIndex(): Promise<DepartmentIndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/data/index.json').then(res => {
      if (!res.ok) throw new Error(`index.json yüklenemedi (${res.status})`)
      return res.json()
    })
  }
  return indexPromise
}

export function loadDepartment(slug: string): Promise<DepartmentData> {
  let promise = departmentCache.get(slug)
  if (!promise) {
    promise = fetch(`/data/departments/${slug}.json`).then(res => {
      if (!res.ok) throw new Error(`${slug}.json yüklenemedi (${res.status})`)
      return res.json()
    })
    departmentCache.set(slug, promise)
  }
  return promise
}
