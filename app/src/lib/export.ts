import type { Tercih } from './tercihler'

// ---------------------------------------------------------------------------
// Tercih listesini dosyaya aktarma. Harici kütüphane YOK:
//   - CSV  : UTF-8 BOM + noktalı virgül → Excel'de Türkçe düzgün açılır.
//   - Excel: HTML tablo (.xls, ms-excel MIME) — Excel HTML tabloyu açar.
//   - Word : HTML (.doc, msword MIME) — Word HTML'i açar.
//   - PDF  : tarayıcının yazdır penceresi (kullanıcı "PDF olarak kaydet" der);
//            @media print yalnızca tercih listesini basar. Türkçe font sorunu yok.
// ---------------------------------------------------------------------------

const HEADERS = ['#', 'Üniversite', 'Bölüm', 'Şehir', 'Puan Türü', 'Ücret', '2025 Sıra']

function rowData(list: Tercih[]): string[][] {
  return list.map((t, i) => [
    String(i + 1),
    t.university,
    t.programRaw,
    t.city,
    t.scoreType,
    t.funding,
    t.rank ?? '—'
  ])
}

function triggerDownload(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function exportCSV(list: Tercih[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [HEADERS, ...rowData(list)].map(r => r.map(esc).join(';'))
  triggerDownload('tercih-listem.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8')
}

function tableHtml(list: Tercih[]): string {
  const head = HEADERS.map(
    h => `<th style="background:#eef2ff;border:1px solid #b9c6f0;padding:6px 9px;text-align:left">${escHtml(h)}</th>`
  ).join('')
  const body = rowData(list)
    .map(
      r =>
        `<tr>${r
          .map(
            (c, i) =>
              `<td style="border:1px solid #b9c6f0;padding:6px 9px;${i === 0 || i === 6 ? 'text-align:center;' : ''}">${escHtml(c)}</td>`
          )
          .join('')}</tr>`
    )
    .join('')
  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function officeDoc(list: Tercih[]): string {
  return `﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2 style="font-family:Arial,sans-serif">Tercih Listem</h2>${tableHtml(list)}</body></html>`
}

export function exportExcel(list: Tercih[]) {
  triggerDownload('tercih-listem.xls', officeDoc(list), 'application/vnd.ms-excel')
}

export function exportWord(list: Tercih[]) {
  triggerDownload('tercih-listem.doc', officeDoc(list), 'application/msword')
}

export function exportPDF() {
  // Yazdır penceresi; kullanıcı hedef olarak "PDF olarak kaydet"i seçer.
  window.print()
}
