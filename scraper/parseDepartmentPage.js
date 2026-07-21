import * as cheerio from 'cheerio'

// Page layout (2024/2025 "…-taban-puanlari-ve-basari-siralamasi" set):
// one table, 8 columns, multi-year cells separated by <br>:
//   0 Üniversite (uni | faculty | (CITY) (Sector))
//   1 Bölüm (program | qualifiers)
//   2 Puan Türü (SAY/EA/SÖZ/DİL/TYT)
//   3 Yıl        (2025|2024|2023|2022)
//   4 Kontenjan  5 Yerleşen  6 Başarı Sırası  7 Taban Puan  (each aligned to col 3)

const CITY_SECTOR_RE = /\(([^)]+?)\)\s*\(\s*(Vakıf|Devlet)\s*\)/iu
const SECTOR_ONLY_RE = /\(\s*(Vakıf|Devlet)\s*\)/iu
const YEAR_RE = /^(19|20)\d{2}$/

function cellLines($, el) {
  const html = $(el).html() || ''
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n')
  const $$ = cheerio.load(`<div>${withBreaks}</div>`)
  return $$('div')
    .text()
    .replace(/ /g, ' ')
    .split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function parseUniversityCell(lines) {
  const fullText = lines.join(' ').replace(/\s+/g, ' ').trim()
  let city = null
  let sector = null

  const cs = fullText.match(CITY_SECTOR_RE)
  if (cs) {
    city = cs[1].trim().toUpperCase()
    sector = cs[2].trim()
  } else {
    const so = fullText.match(SECTOR_ONLY_RE)
    if (so) sector = so[1].trim()
  }

  // Strip the trailing "(CITY) (Sector)" / "(Sector)" chunk to get name+faculty.
  const nameFaculty = fullText.replace(/\(([^)]+?)\)\s*\(\s*(Vakıf|Devlet)\s*\)\s*$/iu, '')
    .replace(/\(\s*(Vakıf|Devlet)\s*\)\s*$/iu, '')
    .trim()

  const university = (lines[0] || nameFaculty).replace(/\s+/g, ' ').trim()
  const faculty = nameFaculty.slice(university.length).trim() || null
  return { university, faculty, city, sector }
}

function parseProgramCell(lines) {
  const raw = lines.join(' ').replace(/\s+/g, ' ').trim()
  const name = (lines[0] || raw).replace(/\s+/g, ' ').trim()
  // Keep language / scholarship qualifiers, drop the "(N Yıllık)" duration tag.
  const quals = raw
    .slice(name.length)
    .replace(/\(\s*\d\s*Y[ıi]ll[ıi]k\s*\)/giu, '')
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const program = (name + (quals ? ' ' + quals : '')).replace(/\s+/g, ' ').trim()
  return { program: program || raw, programRaw: raw }
}

function toNumeric(str) {
  if (!str) return null
  if (/dolmad[ıi]|—|^-+$|kez bu y[ıi]l|yok/iu.test(str)) return null
  const cleaned = str.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function parseDepartmentPage(html, { name, slug, level, scoreType: listScoreType, url }) {
  const $ = cheerio.load(html)
  const warnings = []
  const rows = []

  const table = $('table').filter((_, t) => /üniversite/iu.test($(t).find('tr').first().text())).first()
  if (table.length === 0) {
    return { name, slug, level, scoreType: listScoreType, url, rows, warnings: ['Sıralama tablosu bulunamadı'] }
  }

  const trs = table.find('tr')

  // Column order varies between page templates (e.g. "Taban Puanı" and
  // "Başarı Sırası" are swapped on some pages), so map columns by header text.
  const headerCells = $(trs.get(0)).find('td,th')
  // year:-1 means "no dedicated Yıl column" (compact variant where years are
  // embedded inline in the Sıralama column, e.g. "250.752 (2023)").
  const col = { uni: 0, program: 1, scoreType: 2, year: -1, quota: 4, placed: 5, rank: 6, score: 7 }
  headerCells.each((i, th) => {
    const t = $(th).text().replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr')
    if (/üniversite/.test(t)) col.uni = i
    else if (/bölüm/.test(t)) col.program = i
    else if (/puan türü/.test(t)) col.scoreType = i
    else if (/^yıl/.test(t)) col.year = i
    else if (/kont/.test(t)) col.quota = i
    else if (/yer\b|yerleş/.test(t)) col.placed = i
    else if (/taban pua/.test(t)) col.score = i
    else if (/başarı sıra|sıralama/.test(t)) col.rank = i
  })

  trs.slice(1).each((_, tr) => {
    const cells = $(tr).find('td')
    if (cells.length < 7) return

    const uni = parseUniversityCell(cellLines($, cells.get(col.uni)))
    const prog = parseProgramCell(cellLines($, cells.get(col.program)))
    const scoreType = (cellLines($, cells.get(col.scoreType))[0] || listScoreType || '').toUpperCase()

    const quotaLines = cellLines($, cells.get(col.quota))
    const placedLines = cellLines($, cells.get(col.placed))
    const rankLinesRaw = cellLines($, cells.get(col.rank))
    const scoreLines = cellLines($, cells.get(col.score))

    let yearLines
    let rankLines
    if (col.year >= 0) {
      yearLines = cellLines($, cells.get(col.year)).filter(l => YEAR_RE.test(l))
      rankLines = rankLinesRaw
    } else {
      // Derive years from "(YYYY)" tags inside the Sıralama column.
      yearLines = rankLinesRaw.map(l => (l.match(/\((\d{4})\)/) || [])[1]).filter(Boolean)
      rankLines = rankLinesRaw.map(l => l.replace(/\s*\(\d{4}\)\s*/, '').trim())
    }
    if (yearLines.length === 0) return

    const years = yearLines.map((y, i) => ({
      year: Number(y),
      quota: quotaLines[i] ?? null,
      placed: placedLines[i] ?? null,
      rank: rankLines[i] ?? null,
      rankNumeric: toNumeric(rankLines[i]),
      score: scoreLines[i] ?? null,
      scoreNumeric: toNumeric(scoreLines[i])
    })).filter(y => y.quota || y.placed || y.rank || y.score)

    if (years.length === 0) return

    rows.push({
      university: uni.university,
      faculty: uni.faculty,
      city: uni.city,
      sector: uni.sector,
      program: prog.program,
      programRaw: prog.programRaw,
      scoreType,
      years
    })
  })

  const missingCity = rows.filter(r => !r.city).length
  if (rows.length > 0 && missingCity === rows.length) {
    warnings.push('Hiçbir satırda il bilgisi yok')
  } else if (missingCity > 0) {
    warnings.push(`${missingCity}/${rows.length} satırda il yok`)
  }
  if (rows.length === 0) warnings.push('Tabloda veri satırı bulunamadı')

  return { name, slug, level, scoreType: listScoreType, url, rows, warnings }
}
