// parseKilavuz.js — ÖSYM 2026 Kontenjan Kılavuzu (Tablo 3 + Tablo 4) -> yapısal JSON
//
// Kullanım:
//   node scraper/parseKilavuz.js [--pdf <yol>] [--out <yol>] [--debug]
//
// Bağımlılık yok (Node 20+ ES module). Tek dış araç: pdftotext.
// Çıkarma komutu sözleşmedeki gibi:
//   pdftotext -enc UTF-8 -table -nodiag -f X -l Y <pdf> <out>
//
// Sözleşme: docs/KILAVUZ_CONTRACT.md
//
// ÖNEMLİ YAPISAL GÖZLEM
// ---------------------
// Kılavuzdaki bir tablo satırı birden çok metin satırı yüksekliğinde olabilir
// (uzun program adı, uzun koşul listesi, çok akreditasyonlu program...).
// Hücre içerikleri satır bloğunun içinde DİKEY OLARAK ORTALANIR. Bu yüzden bir
// hücrenin devamı program kodunun ALTINDA olduğu kadar ÜSTÜNDE de olabilir:
//
//     Deniz Ulaştırma İşletme Mühendisliği (İngilizce)      11, 22, 23, 24,   <- kodun ÜSTÜ
//   105510026  (UOLP-SUNY Maritime) (Ücretli)   4 SAY 10    144, 164, 193,    <- kod satırı
//                                                           309               <- kodun ALTI
//
// n satırlık bir hücre, H satır yüksekliğindeki blokta floor((H-n)/2)+1'inci
// satırda başlar; dolayısıyla BOŞ OLMAYAN HER HÜCRENİN kod satırında da içeriği
// vardır. Satır ataması bu değişmeze dayanır.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const DEBUG = argv.includes('--debug');

const PDF = arg('--pdf', path.resolve(REPO, '..', 'kontkilavuz_yktd21072026.pdf'));
const OUT_DIR = arg('--out', path.join(REPO, 'app', 'public', 'data', 'kilavuz'));
const CHUNK = 25;

// ---------------------------------------------------------------- 1) PDF -> metin

/** pdftotext ikilisini bul (PATH'te yoksa Git for Windows'un poppler/xpdf'i). */
function findPdftotext() {
  const cands = [
    process.env.PDFTOTEXT,
    'pdftotext',
    'C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe',
    'C:\\Program Files (x86)\\Git\\mingw64\\bin\\pdftotext.exe',
    '/usr/bin/pdftotext',
  ].filter(Boolean);
  for (const c of cands) {
    // xpdf sürümü "-v" için 99 ile çıkar; çıktıya bakarak doğruluyoruz
    try {
      const o = execFileSync(c, ['-v'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      if (/pdftotext version/i.test(o || '')) return c;
      return c;
    } catch (e) {
      const o = String((e && e.stdout) || '') + String((e && e.stderr) || '');
      if (/pdftotext version/i.test(o)) return c;
    }
  }
  throw new Error('pdftotext bulunamadı (poppler/xpdf kurulu mu?)');
}
const PDFTOTEXT = findPdftotext();

/**
 * pdftotext'i CHUNK sayfalık bloklar hâlinde çağırır, sayfa dizisi döndürür (pages[0] = s.1).
 * Sayfa sayısı bilinmediği için belge bitene kadar ilerler.
 */
function extractPages(pdf) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kilavuz-'));
  const pages = [];
  for (let first = 1; ; first += CHUNK) {
    const last = first + CHUNK - 1;
    const out = path.join(tmp, `p${first}_${last}.txt`);
    try {
      execFileSync(PDFTOTEXT, ['-enc', 'UTF-8', '-table', '-nodiag', '-f', String(first), '-l', String(last), pdf, out], { stdio: 'ignore' });
    } catch { break; }
    if (!fs.existsSync(out)) break;
    const txt = fs.readFileSync(out, 'utf8');
    fs.rmSync(out, { force: true });
    const parts = txt.split('\f');
    if (parts.length && parts[parts.length - 1] === '') parts.pop();
    if (parts.length === 0) break;
    for (const p of parts) pages.push(p);
    if (parts.length < CHUNK) break;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return pages;
}

// ---------------------------------------------------------------- 2) Yardımcılar

/** 2+ boşlukla ayrılmış grupları [başlangıç, metin] olarak döndürür. */
function groups(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === ' ') { i++; continue; }
    let j = i;
    while (j < s.length && !(s[j] === ' ' && s[j + 1] === ' ')) j++;
    out.push([i, s.slice(i, j).trim()]);
    i = j;
  }
  return out;
}

const HEADER_NUM_RE = /^KODU \(1\)/;
const DATA_RE = /^(\d{9})\s/;
const FOOTER_RE = /^2026-YKS\s+TERCİH\s+KILAVUZU/;
const LOWER_RE = /[a-zçğıöşü]/;

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

function normalizeKey(s) {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/î/g, 'i').replace(/â/g, 'a').replace(/û/g, 'u')
    .replace(/[^a-z0-9]/g, '');
}

function toInt(v) {
  const t = norm(v);
  if (!t || t === '...' || t === '----' || t === '*') return null;
  const c = t.replace(/[.\s]/g, '');
  if (!/^\d+$/.test(c)) return null;
  return Number(c);
}

function toFloat(v) {
  const t = norm(v);
  if (!t || t === '...' || t === '----') return null;
  const c = t.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(c)) return null;
  return Number(c);
}

function toText(v) {
  const t = norm(v);
  if (!t || t === '...' || t === '----') return null;
  return t;
}

function parseConditionCodes(raw) {
  const t = norm(raw);
  if (!t) return [];
  const nums = t.match(/\d+/g);
  return nums ? [...new Set(nums.map(Number))] : [];
}

function unbalancedClose(s) {
  const o = (s.match(/\(/g) || []).length;
  const c = (s.match(/\)/g) || []).length;
  return c > o;
}

// ---------------------------------------------------------------- 3) Sayfa sınırlarını bul

/**
 * Sayfaları tarar; hangi sayfa Tablo 3 / Tablo 4 VERİ sayfası tespit eder.
 * Kriter: sayfada "TABLO-3."/"TABLO-4." başlığı VE "KODU (1)" sütun numarası satırı var.
 */
function findTablePages(pages) {
  const info = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const lines = p.split('\n');
    const ni = lines.findIndex((l) => HEADER_NUM_RE.test(l));
    if (ni < 0) continue;
    const isT3 = /TABLO-3\./.test(p);
    const isT4 = /TABLO-4\./.test(p);
    if (!isT3 && !isT4) continue;
    info.push({ page: i + 1, level: isT4 ? 'lisans' : 'onlisans', numIdx: ni });
  }
  return info;
}

/** Bölüm ayırıcı sayfaları üzerinden her tablo sayfasının varsayılan türü. */
function sectionDefaults(pages, tablePages) {
  const marks = [];
  for (let i = 0; i < pages.length; i++) {
    const t = norm(pages[i]);
    if (/^TABLO [34]\s+DEVLET ÜNİVERSİTELERİ/.test(t)) marks.push({ page: i + 1, kind: 'Devlet' });
    else if (/^TABLO [34]\s+VAKIF, KKTC VE DİĞER/.test(t)) marks.push({ page: i + 1, kind: 'Diger' });
  }
  const map = new Map();
  for (const tp of tablePages) {
    let kind = 'Devlet';
    for (const m of marks) if (m.page < tp.page) kind = m.kind;
    map.set(tp.page, kind);
  }
  return map;
}

// ---------------------------------------------------------------- 4) Sütun düzeni

const COLS_T3 = {
  3: 'duration', 4: 'scoreType', 5: 'genel', 6: 'okulBirincisi', 7: 'sehitGazi', 8: 'kadin34',
  9: 'conditions', 10: 'rank', 11: 'score', 12: 'tyc', 13: 'akreditasyon',
};
const COLS_T4 = {
  3: 'duration', 4: 'scoreType', 5: 'genel', 6: 'okulBirincisi', 7: 'meb', 8: 'sehitGazi', 9: 'kadin34',
  10: 'conditions', 11: 'rank', 12: 'score', 13: 'prof', 14: 'docent', 15: 'drOgrUyesi',
  16: 'grv', 17: 'tyc', 18: 'akreditasyon', 19: 'tusTT1', 20: 'tusTT2', 21: 'tusKTP',
  22: 'dus', 23: 'abAyp', 24: 'kpss',
};

/** "KODU (1) ... (3) (4) ..." satırından sütun no -> x konumu. */
function anchorsFromNumLine(numLine) {
  const a = {};
  for (const [at, txt] of groups(numLine)) {
    const m = txt.match(/\((\d+)\)/);
    if (m) a[Number(m[1])] = at;
  }
  return a;
}

/** Satırı sütun aralıklarına böler. */
function sliceCells(line, anchors, colNos) {
  const cells = {};
  for (let i = 0; i < colNos.length; i++) {
    const c = colNos[i];
    const from = anchors[c];
    const to = i + 1 < colNos.length ? anchors[colNos[i + 1]] : Math.max(line.length, anchors[c]);
    cells[c] = from == null ? '' : norm(line.slice(from, to));
  }
  return cells;
}

// ---------------------------------------------------------------- 5) Başlık sınıflandırma

const UNIV_TAIL_RE = /\((Devlet|Vakıf)\s+Üniversitesi\)\s*\*?$/;
const KKTC_TAIL_RE = /\(KKTC[-\s][^)]*\)\s*\*?$/;
const ABROAD_TAIL_RE = /\([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9\s.'’-]*-\s*[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s.'’-]*\)\s*\*?$/;
const UOLP_TAIL_RE = /\(UOLP-[^)]*\)\s*\*?$/;
// Dikkat: "Programları" burada YOK — gerçek program adlarında geçiyor
// (ör. "Mühendislik ve Doğa Bilimleri Programları (İngilizce)").
const HEADER_KEYWORD_RE = /(ÜNİVERSİTESİ|ÜNİVERSİTESI|FAKÜLTES[İI]|Fakültesi|YÜKSEKOKUL|Yüksekokul|ENSTİTÜS|Enstitü|KONSERVATUVAR|Konservatuvar|AKADEMİS|Akademisi|KAMPUSU|Kampüsü|YERLEŞKES|BÖLÜMÜ|Bölümü|OKULU|Okulu)/;

// Bir başlık metni "tamam" mı? (satır sarma birleştirmesini burada kesiyoruz)
// Üniversite başlığı daima tür/şehir kuyruğuyla biter: "(Devlet Üniversitesi)",
// "(KKTC-GİRNE)", "(TÜRKİSTAN-KAZAKİSTAN)*" ...
// Fakülte/MYO başlığı daima bir kurum sonu sözcüğüyle (ve isteğe bağlı "(ŞEHİR)") biter.
const FAC_END_RE = new RegExp(
  '(' +
    'FAKÜLTES[İI]|Fakültesi|' +
    'YÜKSEKOKULU|YÜKSEK\\s?OKULU|Yüksekokulu|Yüksek\\s?Okulu|' +
    'ENSTİTÜSÜ|Enstitüsü|' +
    'KONSERVATUVARI|Konservatuvarı|' +
    'AKADEMİSİ|Akademisi|' +
    'OKULU|Okulu|BÖLÜMÜ|Bölümü|MERKEZİ|Merkezi|' +
    'KAMPÜSÜ|KAMPUSU|Kampüsü|YERLEŞKESİ|Yerleşkesi|' +
    'PROGRAMLARI|BİRİMİ' +
  ')' +
  '(\\s*\\([^()]*\\))?\\s*\\*?$'
);

function parensBalanced(s) {
  const o = (s.match(/\(/g) || []).length;
  const c = (s.match(/\)/g) || []).length;
  return o === c;
}

function isUniversityHeader(text) {
  const t = norm(text);
  if (UNIV_TAIL_RE.test(t)) return true;
  if (UOLP_TAIL_RE.test(t)) return true;
  if (KKTC_TAIL_RE.test(t) && /ÜNİVERSİTES|KAMPUS|YERLEŞKE|ENSTİTÜS|AKADEMİ/.test(t)) return true;
  if (ABROAD_TAIL_RE.test(t) && /ÜNİVERSİTES|UNIVERSITY|ENSTİTÜS|AKADEMİ/.test(t)) return true;
  return false;
}

/** Üniversite başlığından ad / şehir / tür ayrıştır. */
function parseUniversityHeader(text) {
  let t = norm(text);
  let type = null, city = null, m;
  if ((m = t.match(UNIV_TAIL_RE))) {
    type = /Vakıf/.test(m[1]) ? 'Vakıf' : 'Devlet';
    t = norm(t.slice(0, m.index));
  } else if ((m = t.match(UOLP_TAIL_RE))) {
    type = 'Devlet';
    t = norm(t.slice(0, m.index));
  } else if ((m = t.match(KKTC_TAIL_RE))) {
    type = 'KKTC';
    city = m[0].replace(/^\(|\)\s*\*?$/g, '').trim();
    t = norm(t.slice(0, m.index));
  } else if ((m = t.match(ABROAD_TAIL_RE))) {
    type = 'Yurtdışı';
    city = m[0].replace(/^\(|\)\s*\*?$/g, '').trim();
    t = norm(t.slice(0, m.index));
  }
  if (!city) {
    const cm = t.match(/\(([^()]+)\)\s*\*?$/);
    if (cm) { city = norm(cm[1]); t = norm(t.slice(0, cm.index)); }
  }
  if (city) city = city.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
  return { name: norm(t.replace(/\*+$/, '')), city, type };
}

/** Başlık bloğu tamamlandı mı? (tamamlandıysa sonraki satır YENİ başlıktır) */
function headerComplete(text) {
  const t = norm(text);
  if (!t) return false;
  if (!parensBalanced(t)) return false;   // "... (Devlet" -> devam ediyor
  if (isUniversityHeader(t)) return true;
  if (FAC_END_RE.test(t)) return true;
  return false;
}

// ------------------------------------------------------- 5b) Şehir çıkarımı (city)
//
// ÖSYM, üniversite adı ZATEN il adıyla başlıyorsa başlıkta parantezli ili YAZMIYOR:
//   "AKDENİZ ÜNİVERSİTESİ (ANTALYA) (Devlet Üniversitesi)"   -> şehir var
//   "ANKARA ÜNİVERSİTESİ (Devlet Üniversitesi)"              -> şehir YOK (adında)
// Bu yüzden şehri adın ilk token(lar)ından türetiyoruz. Uydurma yok: yalnızca
// 81 il adıyla TAM token eşleşmesi kabul edilir.

const IL_LIST = [
  'ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AĞRI', 'AKSARAY', 'AMASYA', 'ANKARA', 'ANTALYA',
  'ARDAHAN', 'ARTVİN', 'AYDIN', 'BALIKESİR', 'BARTIN', 'BATMAN', 'BAYBURT', 'BİLECİK',
  'BİNGÖL', 'BİTLİS', 'BOLU', 'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM', 'DENİZLİ',
  'DİYARBAKIR', 'DÜZCE', 'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP',
  'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'IĞDIR', 'ISPARTA', 'İSTANBUL', 'İZMİR',
  'KAHRAMANMARAŞ', 'KARABÜK', 'KARAMAN', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRIKKALE',
  'KIRKLARELİ', 'KIRŞEHİR', 'KİLİS', 'KOCAELİ', 'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA',
  'MARDİN', 'MERSİN', 'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE', 'ORDU', 'OSMANİYE', 'RİZE',
  'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 'SİVAS', 'ŞANLIURFA', 'ŞIRNAK', 'TEKİRDAĞ',
  'TOKAT', 'TRABZON', 'TUNCELİ', 'UŞAK', 'VAN', 'YALOVA', 'YOZGAT', 'ZONGULDAK',
];
const IL_SET = new Set(IL_LIST);

/** Adın başındaki il adı (en uzun token eşleşmesi). Yoksa null. */
function cityFromNamePrefix(name) {
  const toks = norm(name).split(' ');
  // "AFYONKARAHİSAR", "KAHRAMANMARAŞ" gibi tek tokenlar; iki tokenlı il adı yok.
  if (toks.length && IL_SET.has(toks[0].replace(/[^A-ZÇĞİÖŞÜ]/g, ''))) {
    return toks[0].replace(/[^A-ZÇĞİÖŞÜ]/g, '');
  }
  return null;
}

/** Fakülte/MYO adının sonundaki "(ANKARA)" gibi parantez. Yoksa null. */
function cityFromFaculty(faculty) {
  if (!faculty) return null;
  const m = norm(faculty).match(/\(([^()]+)\)\s*\*?$/);
  if (!m) return null;
  const t = m[1].trim().toLocaleUpperCase('tr-TR');
  return IL_SET.has(t) ? t : null;
}

// PDF'te ili hiç yazılmayan, adı da il adıyla başlamayan kurumlar.
// (Kaynak: kurumların resmî yerleşke ili — uydurma değil, bilinen olgu.)
const CITY_MANUAL = {
  'GEBZE TEKNİK ÜNİVERSİTESİ': 'KOCAELİ',
  'TÜRK-JAPON BİLİM VE TEKNOLOJİ ÜNİVERSİTESİ': 'İSTANBUL',
  // Sağlık Bilimleri Üniversitesi (Hamidiye yerleşkesi) — İstanbul.
  // Gülhane yerleşkesi Ankara; o kayıtlar fakülte parantezinden çözülüyor.
  'İÇİŞLERİ BAKANLIĞI VE MİLLİ SAVUNMA BAKANLIĞI ADINA SAĞLIK BİLİMLERİ ÜNİVERSİTESİNDE EĞİTİM ALACAKLAR': 'İSTANBUL',
};

// ---------------------------------------------------------------- 6) Ana ayrıştırıcı

const NAME = 'N'; // program adı / başlık sütunu için sanal sütun anahtarı

function parse(pages) {
  const tablePages = findTablePages(pages);
  const secDefault = sectionDefaults(pages, tablePages);
  const records = [];
  const issues = [];
  const headerLog = [];
  const stats = { wrapByWidth: 0, wrapByPunct: 0, aboveLines: 0, belowLines: 0, headerLines: 0 };

  let ctxUni = null;
  let ctxFaculty = null;
  let prevSection = null;

  for (const tp of tablePages) {
    const section = tp.level + '|' + secDefault.get(tp.page);
    if (section !== prevSection) { ctxUni = null; ctxFaculty = null; prevSection = section; }

    const rawLines = pages[tp.page - 1].split('\n');
    const anchors = anchorsFromNumLine(rawLines[tp.numIdx]);
    const colMap = tp.level === 'lisans' ? COLS_T4 : COLS_T3;
    const colNos = Object.keys(colMap).map(Number).sort((a, b) => a - b);
    const missing = colNos.filter((c) => anchors[c] == null);
    if (missing.length) { issues.push(`s.${tp.page}: sütun çapası eksik: ${missing.join(',')}`); continue; }
    for (let i = 1; i < colNos.length; i++) {
      if (anchors[colNos[i]] <= anchors[colNos[i - 1]]) {
        issues.push(`s.${tp.page}: sütun çapaları artan değil (${colNos[i - 1]}->${colNos[i]})`);
      }
    }
    const a3 = anchors[3];

    // --- satırları ön işle
    const items = [];
    for (let i = tp.numIdx + 1; i < rawLines.length; i++) {
      const raw = rawLines[i];
      if (!raw.trim()) continue;
      const leftRaw = raw.slice(0, a3).replace(/\s+$/, '');
      const left = norm(leftRaw);
      if (FOOTER_RE.test(left)) continue;
      if (/^\*/.test(left)) continue; // sayfa altı dipnotu (ör. "*Uluslararası anlaşmalar ile ...")
      const dm = raw.match(DATA_RE);
      const cells = sliceCells(raw, anchors, colNos);
      const cols = new Set();
      for (const c of colNos) if (cells[c]) cols.add(c);
      const nameText = dm ? norm(raw.slice(dm[1].length, a3)) : left;
      if (nameText) cols.add(NAME);
      items.push({
        line: i,
        isCode: !!dm,
        code: dm ? dm[1] : null,
        name: nameText,
        endCol: leftRaw.length,
        cells,
        cols,
      });
    }

    // --- program adı devamı olabilir mi?
    // Kesin başlık: hiç küçük harf yok, parantez dengeli, "(" ile başlamıyor.
    const definitelyHeader = (it) =>
      !LOWER_RE.test(it.name) && !unbalancedClose(it.name) && !/^[(%]/.test(it.name);
    // Kesin devam: "(" / "%" / küçük harfle başlıyor ya da fazladan ")" içeriyor.
    const definitelyWrap = (it) => /^[(%]/.test(it.name) || /^[a-zçğıöşü]/.test(it.name) || unbalancedClose(it.name);
    // Genişlik testi: prev satırın sonuna next'in ilk sözcüğü sığar mıydı?
    const wrapsByWidth = (prev, next) => {
      const w = (next.name.split(' ')[0] || '').length;
      return prev.endCol + 1 + w > a3 - 1;
    };
    const canContinueName = (prev, next) => {
      if (HEADER_KEYWORD_RE.test(next.name) && !definitelyWrap(next)) return false;
      if (definitelyWrap(next)) { stats.wrapByPunct++; return true; }
      if (definitelyHeader(next)) return false;
      const ok = wrapsByWidth(prev, next);
      if (ok) stats.wrapByWidth++;
      return ok;
    };

    // --- satır bloklarını kur
    const rows = [];      // { item, extraLines: [{it, where}] }
    const headerRuns = [];// { afterRow: index, lines: [item] }
    const codeIdx = items.map((it, i) => (it.isCode ? i : -1)).filter((i) => i >= 0);

    const rowOf = new Map(); // items index -> row index
    for (const ci of codeIdx) {
      rows.push({ ci, item: items[ci], above: [], below: [] });
      rowOf.set(ci, rows.length - 1);
    }

    const runs = []; // ardışık kod-dışı satır blokları: {from, to, prevRow, nextRow}
    {
      let i = 0;
      let prevRow = -1;
      while (i < items.length) {
        if (items[i].isCode) { prevRow = rowOf.get(i); i++; continue; }
        const from = i;
        while (i < items.length && !items[i].isCode) i++;
        const nextRow = i < items.length ? rowOf.get(i) : -1;
        runs.push({ from, to: i - 1, prevRow, nextRow });
      }
    }

    for (const run of runs) {
      const runItems = items.slice(run.from, run.to + 1);
      let s = 0, e = runItems.length - 1;

      // (a) baştan ileri: önceki satırın ALT devamı
      if (run.prevRow >= 0) {
        const row = rows[run.prevRow];
        let openCols = row.item.cols;
        let lastLine = row.item;
        while (s <= e) {
          const it = runItems[s];
          let ok = it.cols.size > 0 && [...it.cols].every((c) => openCols.has(c));
          if (ok && it.cols.has(NAME)) ok = canContinueName(lastLine, it);
          if (!ok) break;
          row.below.push(it);
          openCols = it.cols;
          lastLine = it;
          s++;
        }
      }

      // (b) sondan geri: sonraki satırın ÜST devamı
      if (run.nextRow >= 0) {
        const row = rows[run.nextRow];
        let openCols = row.item.cols;
        let firstLine = row.item;
        // Kod satırının adı bir devam mı? (üstte ad devamı olabilmesi için gerekli)
        let nameOpen = definitelyWrap(row.item);
        while (e >= s) {
          const it = runItems[e];
          let ok = it.cols.size > 0 && [...it.cols].every((c) => openCols.has(c));
          // Üst devam için belirleyici sinyal: ALT satırın (kod satırının) adı
          // zaten bir devam parçası ("(Burslu)", "İndirimli)", küçük harfle
          // başlayan...). Genişlik testi burada güvenilmez (oransal yazı tipi).
          if (ok && it.cols.has(NAME)) {
            ok = nameOpen && !definitelyHeader(it) && !(HEADER_KEYWORD_RE.test(it.name) && !definitelyWrap(it));
          }
          if (!ok) break;
          row.above.unshift(it);
          openCols = it.cols;
          firstLine = it;
          nameOpen = definitelyWrap(it);
          e--;
        }
      }

      if (e >= s) headerRuns.push({ order: run.from, at: run.prevRow, lines: runItems.slice(s, e - s + 1 + s) });
      stats.headerLines += Math.max(0, e - s + 1);
    }

    // --- sayfa boyunca sırayla: başlık blokları ve satırları işle
    const events = [];
    for (const r of rows) events.push({ pos: r.ci, kind: 'row', row: r });
    for (const h of headerRuns) events.push({ pos: h.order + 0.5, kind: 'headers', lines: h.lines });
    events.sort((x, y) => x.pos - y.pos);

    for (const ev of events) {
      if (ev.kind === 'headers') {
        // başlık satırlarını sarma kuralına göre bloklara ayır
        let buf = null, bufLast = null;
        const flush = () => {
          if (!buf) return;
          const text = norm(buf);
          buf = null;
          if (!text) return;
          if (DEBUG) headerLog.push(`${tp.page}\t${isUniversityHeader(text) ? 'UNI' : 'FAK'}\t${text}`);
          if (isUniversityHeader(text)) {
            const u = parseUniversityHeader(text);
            ctxUni = { name: u.name, city: u.city, type: u.type || (secDefault.get(tp.page) === 'Devlet' ? 'Devlet' : null) };
            ctxFaculty = null;
          } else {
            ctxFaculty = text;
          }
        };
        for (const it of ev.lines) {
          if (!it.name) continue;
          const restCols = [...it.cols].filter((c) => c !== NAME);
          const rest = restCols.map((c) => it.cells[c]).join(' ').trim();
          if (rest && !/^YÖKA\s*K$/.test(rest)) { // filigran bazen "YÖKA K" diye bölüyor
            issues.push(`s.${tp.page}: başlık satırında beklenmedik veri: "${rest}" (${it.name})`);
          }
          // Başlık satırlarını GENİŞLİK tahminiyle değil, TAMAMLANMA testiyle böl.
          // (Genişlik testi burada yanlıştı: "BALIKESİR ÜNİVERSİTESİ (Devlet
          //  Üniversitesi)" + "ALTINOLUK MESLEK YÜKSEKOKULU" tek bloğa birleşiyor,
          //  üniversite bağlamı hiç kurulmuyordu.)
          if (buf == null) {
            buf = it.name;
          } else if (headerComplete(buf) && !definitelyWrap(it)) {
            flush();
            buf = it.name;
          } else {
            buf = norm(buf + ' ' + it.name);
          }
          bufLast = it;
        }
        flush();
        continue;
      }

      // --- veri satırı
      const r = ev.row;
      stats.aboveLines += r.above.length;
      stats.belowLines += r.below.length;
      const seq = [...r.above, r.item, ...r.below];
      const nameParts = [];
      const cellParts = Object.fromEntries(colNos.map((c) => [c, []]));
      for (const it of seq) {
        if (it.name) nameParts.push(it.name);
        for (const c of colNos) if (it.cells[c]) cellParts[c].push(it.cells[c]);
      }
      const cur = {
        page: tp.page,
        level: tp.level,
        code: r.item.code,
        name: norm(nameParts.join(' ')),
        cells: Object.fromEntries(colNos.map((c) => [c, cellParts[c].join(' ')])),
        colMap,
        uni: ctxUni,
        faculty: ctxFaculty,
        sectionDefault: secDefault.get(tp.page),
      };
      records.push(finalize(cur, issues));
    }
  }

  return { records, issues, headerLog, tablePages, stats };
}

// ---------------------------------------------------------------- 7) Kayıt -> sözleşme şeması

function finalize(cur, issues) {
  const inv = {};
  for (const [k, v] of Object.entries(cur.colMap)) inv[v] = Number(k);
  const g = (key) => (inv[key] == null ? '' : norm(cur.cells[inv[key]] || ''));

  const level = cur.level;
  const uni = cur.uni || { name: null, city: null, type: null };

  const rec = {
    code: cur.code,
    university: uni.name || null,
    city: uni.city ?? null,
    universityType: uni.type ?? (cur.sectionDefault === 'Devlet' ? 'Devlet' : null),
    faculty: cur.faculty ?? null,
    program: cur.name,
    level,
    duration: toInt(g('duration')),
    scoreType: toText(g('scoreType')),
    quota2026: {
      genel: toInt(g('genel')),
      okulBirincisi: toInt(g('okulBirincisi')),
      meb: level === 'lisans' ? toInt(g('meb')) : null,
      sehitGazi: toInt(g('sehitGazi')),
      kadin34: toInt(g('kadin34')),
    },
    conditionCodes: parseConditionCodes(g('conditions')),
    y2025: { rank: toInt(g('rank')), score: toFloat(g('score')) },
    staff: level === 'lisans'
      ? { prof: toInt(g('prof')), docent: toInt(g('docent')), drOgrUyesi: toInt(g('drOgrUyesi')) }
      : null,
    accreditation: toText(g('akreditasyon')),
    kpss: level === 'lisans' ? toFloat(g('kpss')) : null,
    matchKey: normalizeKey(uni.name) + '||' + normalizeKey(cur.name),
  };

  rec.extra = level === 'lisans'
    ? {
        tyc: toText(g('tyc')),
        grv: toText(g('grv')),
        tusTT1: toFloat(g('tusTT1')),
        tusTT2: toFloat(g('tusTT2')),
        tusKTP: toFloat(g('tusKTP')),
        dus: toFloat(g('dus')),
        abAyp: toFloat(g('abAyp')),
      }
    : { tyc: toText(g('tyc')) };

  // TYÇ ("*") ile AKREDİTASYON sütunları bitişik olduğu için akreditasyon adı
  // ikiye bölünebiliyor:  tyc="* MÜDE" + accreditation="K"  ->  "MÜDEK"
  //                       tyc="* ECZAK" + accreditation="DER" -> "ECZAKDER"
  //                       tyc="* MÜDEK" + accreditation=null  -> "MÜDEK"
  // TYÇ'nin gerçek değeri yalnızca yıldızdır; kalan her şey akreditasyona aittir.
  {
    const tycRaw = rec.extra.tyc;
    const m = typeof tycRaw === 'string' ? tycRaw.match(/^\*\s*(\S.*)$/) : null;
    if (m) {
      const head = m[1].trim();
      const tail = typeof rec.accreditation === 'string' ? rec.accreditation.trim() : '';
      const full = (head + tail).replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
      rec.accreditation = full || null;
      rec.extra.tyc = '*';
    }
  }

  rec._page = cur.page;

  if (!rec.university) issues.push(`kod ${cur.code}: üniversite bağlamı yok (s.${cur.page})`);
  if (!rec.program) issues.push(`kod ${cur.code}: program adı boş (s.${cur.page})`);
  return rec;
}

// ------------------------------------------------ 7b) Şehir doldurma (kayıtlar üzerinde)

function fillCities(records) {
  const before = records.filter((r) => r.city).length;

  // 1) Aynı üniversitenin başka bir görülüşünde şehir varsa oradan taşı.
  const dict = new Map();
  for (const r of records) {
    if (!r.university || !r.city) continue;
    const k = r.university;
    if (!dict.has(k)) dict.set(k, new Map());
    const c = dict.get(k);
    c.set(r.city, (c.get(r.city) || 0) + 1);
  }
  const uniCity = new Map();
  for (const [uni, counts] of dict) {
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    uniCity.set(uni, best[0]);
  }

  const src = { header: 0, dict: 0, prefix: 0, faculty: 0, manual: 0, none: 0 };
  const unresolved = new Map();
  for (const r of records) {
    if (r.city) {
      // aynı üniversite için tek biçim kullan (KKTC- X / KKTC-X gibi farkları gider)
      const canon = uniCity.get(r.university);
      if (canon) r.city = canon;
      src.header++;
      continue;
    }
    const uni = r.university || '';
    let c = uniCity.get(uni) || null;
    if (c) { r.city = c; src.dict++; continue; }
    c = cityFromNamePrefix(uni);
    if (c) { r.city = c; src.prefix++; continue; }
    c = cityFromFaculty(r.faculty);
    if (c) { r.city = c; src.faculty++; continue; }
    c = CITY_MANUAL[uni] || null;
    if (c) { r.city = c; src.manual++; continue; }
    src.none++;
    unresolved.set(uni, (unresolved.get(uni) || 0) + 1);
  }
  const after = records.filter((r) => r.city).length;
  return { before, after, total: records.length, src, unresolved: [...unresolved].sort((a, b) => b[1] - a[1]) };
}

// ---------------------------------------------------------------- 8) Koşul metinleri

function parseConditions(pages) {
  let start = -1, end = -1;
  for (let i = 0; i < pages.length; i++) {
    const t = norm(pages[i]);
    if (start < 0 && /TABLO 3 VE TABLO 4['’]TE YER ALAN YÜKSEKÖĞRETİM PROGRAMLARININ KOŞUL VE AÇIKLAMALARI/.test(t)) start = i;
    else if (start >= 0 && /TABLO-?5[.’']/.test(t)) { end = i; break; }
  }
  if (start < 0) return { conditions: {}, range: null };
  if (end < 0) end = pages.length;
  const out = {};
  let curKey = null, buf = [];
  const flush = () => { if (curKey) out[curKey] = norm(buf.join(' ')); curKey = null; buf = []; };
  for (let i = start; i < end; i++) {
    for (const rawLine of pages[i].split('\n')) {
      const l = norm(rawLine);
      if (!l) continue;
      if (FOOTER_RE.test(l)) continue;
      if (/^TABLO 3 VE TABLO 4/.test(l)) { flush(); continue; }
      if (/^KOŞUL VE AÇIKLAMALARI/.test(l) || /^\(\d+\. KISIM KOŞULLAR\)/.test(l)) continue;
      if (/^Bakınız\b/.test(l) || /^No$/.test(l) || /^Açıklama$/.test(l)) continue;
      const m = l.match(/^Bk\.\s*(\d{1,3})\s+(.*)$/);
      if (m) { flush(); curKey = m[1]; buf = [m[2]]; }
      else if (curKey) buf.push(l);
    }
  }
  flush();
  return { conditions: out, range: [start + 1, end] };
}

// ---------------------------------------------------------------- 9) Çalıştır

function main() {
  if (!fs.existsSync(PDF)) throw new Error('PDF bulunamadı: ' + PDF);
  console.error('PDF: ' + PDF);
  const pages = extractPages(PDF);
  console.error('Sayfa sayısı: ' + pages.length);

  const { records, issues, headerLog, tablePages, stats } = parse(pages);
  const cityReport = fillCities(records);

  const t3 = tablePages.filter((t) => t.level === 'onlisans').map((t) => t.page);
  const t4 = tablePages.filter((t) => t.level === 'lisans').map((t) => t.page);
  console.error(`Tablo 3 veri sayfaları: ${t3.length} (${t3[0]}..${t3[t3.length - 1]})`);
  console.error(`Tablo 4 veri sayfaları: ${t4.length} (${t4[0]}..${t4[t4.length - 1]})`);
  console.error(`Kayıt: ${records.length} (lisans ${records.filter((r) => r.level === 'lisans').length}, önlisans ${records.filter((r) => r.level === 'onlisans').length})`);
  console.error('İstatistik: ' + JSON.stringify(stats));
  console.error(`Üniversite (distinct): ${new Set(records.map((r) => r.university)).size}`);
  console.error(`Şehir: ${cityReport.after}/${cityReport.total} (${(100 * cityReport.after / cityReport.total).toFixed(1)}%) — başlıktan ${cityReport.src.header}, sözlükten ${cityReport.src.dict}, ad önekinden ${cityReport.src.prefix}, elle ${cityReport.src.manual}, fakülteden ${cityReport.src.faculty}, çözülemeyen ${cityReport.src.none}`);
  if (cityReport.unresolved.length) {
    console.error('Şehri çözülemeyen kurumlar:');
    for (const [u, n] of cityReport.unresolved) console.error(`  - ${u || '(boş)'} : ${n}`);
  }

  if (DEBUG) {
    fs.writeFileSync(path.join(os.tmpdir(), 'kilavuz-headers.tsv'), headerLog.join('\n'), 'utf8');
    console.error('Başlık günlüğü: ' + path.join(os.tmpdir(), 'kilavuz-headers.tsv'));
  }

  const { conditions, range } = parseConditions(pages);
  console.error(`Koşul metni: ${Object.keys(conditions).length} kayıt (sayfa ${range ? range.join('-') : '?'})`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const clean = records.map((r) => { const { _page, ...rest } = r; return rest; });
  fs.writeFileSync(path.join(OUT_DIR, 'programs.json'), JSON.stringify(clean), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'conditions.json'), JSON.stringify(conditions), 'utf8');

  const byKey = {};
  for (const r of clean) {
    if (!byKey[r.matchKey]) byKey[r.matchKey] = [];
    byKey[r.matchKey].push(r.code);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'byKey.json'), JSON.stringify(byKey), 'utf8');

  // lookup.json — uygulamanın ilk açılışta indirdiği KOMPAKT dosya.
  // programs.json ~12 MB; bu dosya ~2.8 MB. Üniversite/fakülte adları
  // sözlüğe alınır, satırlar dizi (tuple) olarak yazılır. Alan sırası LOOKUP_FIELDS.
  const uniList = [], uniIdx = new Map();
  const facList = [], facIdx = new Map();
  const intern = (arr, map, v) => {
    if (v == null) return -1;
    let i = map.get(v);
    if (i == null) { i = arr.length; arr.push(v); map.set(v, i); }
    return i;
  };
  const rows = clean.map((r) => [
    r.code,
    intern(uniList, uniIdx, [r.university || '', r.city || '', r.universityType || ''].join('|')),
    intern(facList, facIdx, r.faculty),
    r.program,
    r.level === 'lisans' ? 1 : 0,
    r.duration,
    r.scoreType,
    r.quota2026.genel,
    r.quota2026.okulBirincisi,
    r.quota2026.meb,
    r.quota2026.sehitGazi,
    r.quota2026.kadin34,
    r.conditionCodes,
    r.y2025.rank,
    r.y2025.score,
    r.staff ? r.staff.prof : null,
    r.staff ? r.staff.docent : null,
    r.staff ? r.staff.drOgrUyesi : null,
    r.accreditation,
    r.kpss,
  ]);
  const lookup = {
    v: 1,
    fields: ['code', 'uni', 'fac', 'program', 'lisans', 'duration', 'scoreType',
      'genel', 'okulBirincisi', 'meb', 'sehitGazi', 'kadin34', 'conditionCodes',
      'rank', 'score', 'prof', 'docent', 'drOgrUyesi', 'accreditation', 'kpss'],
    // "AD|ŞEHİR|TÜR" — boş alan = null
    unis: uniList,
    facs: facList,
    rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'lookup.json'), JSON.stringify(lookup), 'utf8');

  fs.writeFileSync(path.join(os.tmpdir(), 'kilavuz-programs-debug.json'), JSON.stringify(records), 'utf8');

  for (const f of ['programs.json', 'lookup.json', 'conditions.json', 'byKey.json']) {
    const sz = fs.statSync(path.join(OUT_DIR, f)).size;
    console.error(`  ${f}: ${(sz / 1048576).toFixed(2)} MB`);
  }

  if (issues.length) {
    console.error(`\nSORUNLAR (${issues.length}):`);
    for (const s of issues.slice(0, 40)) console.error('  - ' + s);
    if (issues.length > 40) console.error(`  ... +${issues.length - 40}`);
  }
  console.error('\nYazıldı: ' + OUT_DIR);
}

main();
