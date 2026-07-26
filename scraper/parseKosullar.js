#!/usr/bin/env node
/**
 * parseKosullar.js
 *
 * ÖSYM 2026 Kontenjan Kılavuzu'ndaki
 *   "TABLO 3 VE TABLO 4'TE YER ALAN YÜKSEKÖĞRETİM PROGRAMLARININ KOŞUL VE AÇIKLAMALARI"
 * bölümünü (1. Kısım + 2. Kısım) ayrıştırır.
 *
 * PDF sayfaları: 550-569 (1. Kısım 550-552, ayraç sayfa 553, 2. Kısım 554-569).
 * NOT: Tablo 5'in ayrı koşul listesi (s. ~600+) BU DOSYAYA DAHİL DEĞİLDİR.
 *
 * Çıktı: app/public/data/kilavuz/conditions.json  → { "1": "...", "144": "..." }
 *
 * Kullanım: node scraper/parseKosullar.js
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PDF =
  process.env.KILAVUZ_PDF ||
  'C:\\Users\\yusuf\\OneDrive\\Masaüstü\\kontkilavuz_yktd21072026.pdf';
const FIRST_PAGE = 550;
const LAST_PAGE = 569;

const OUT = path.resolve(
  __dirname,
  '..',
  'app',
  'public',
  'data',
  'kilavuz',
  'conditions.json'
);

// --- 1) PDF -> metin -------------------------------------------------------
function extractText() {
  const tmp = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'kosul-')),
    'kosullar.txt'
  );
  execFileSync(
    'pdftotext',
    [
      '-enc', 'UTF-8',
      '-table',
      '-nodiag',
      '-f', String(FIRST_PAGE),
      '-l', String(LAST_PAGE),
      PDF,
      tmp,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  );
  return fs.readFileSync(tmp, 'utf8');
}

// --- 2) Temizleme yardımcıları --------------------------------------------

// PDF'te bazı kelimeler "yu¨ru¨tu¨lecek" gibi taban harf + ayrı aksan olarak gelir.
function fixCombining(s) {
  return s
    .normalize('NFC')
    .replace(/([aeiouAEIOU])¨/g, (_, c) => {
      const map = { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' };
      return map[c] || c;
    })
    .replace(/([aeiouAEIOU])̈/g, (_, c) => {
      const map = { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' };
      return map[c] || c;
    })
    // Kaynakta kalan başıboş aksan (ör. "dördüncü¨") — ÖSYM dizgi hatası.
    .replace(/[¨̈]/g, '');
}

// Sayfa başlık/altlık ve tablo etiketi olan satırlar (içerik değil).
const JUNK = [
  /^TABLO\s*3\s*VE\s*TABLO\s*4/i,
  /^YÜKSEKÖĞRETİM PROGRAMLARININ/i,
  /^KOŞUL VE AÇIKLAMALARI$/i,
  /^\(\s*\d\.\s*KISIM\s*KOŞULLAR\s*\)$/i,
  /^Bakınız$/i,
  /^No$/i,
  /^Açıklama$/i,
  /^\d{1,4}$/, // sayfa numarası altlığı
];

function isJunk(line) {
  return JUNK.some((re) => re.test(line));
}

const BK_RE = /^Bk\.\s*(\d+)\s+(.*)$/;

/**
 * PDF KUSURU: 1. Kısım'da (s. 550) Bk. 16'dan sonra gelen "Temel Türkçe Hazırlık
 * Sınıfı" koşulunun "Bk. NN" etiketi PDF metin katmanında hiç yok (boş etiket
 * hücresi). Etiketsiz olduğu için ayrıştırıcı onu Bk. 16'nın devamı sanıyordu.
 * Kod numarası PDF'ten türetilemiyor; Tablo 3/4 program satırlarında 26-30
 * aralığındaki hiçbir kod kullanılmadığı için bu koşul hiçbir programa bağlı
 * değil → bloğu tamamen düşürüyoruz (16'yı kirletmesin).
 * Bu liste, bloğun İLK satırının başlangıcıyla eşleşir.
 */
const ORPHAN_STARTS = [
  'Bir yıl süre ile Temel Türkçe Hazırlık Sınıfı programı uygulanır.',
];

// --- 3) Ayrıştırma ---------------------------------------------------------
function parse(raw) {
  const pages = raw.split('\f');
  const lines = [];

  for (const page of pages) {
    const pageLines = page
      .split(/\r?\n/)
      .map((l) => fixCombining(l).replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    // Hiç "Bk. N" içermeyen sayfa = ayraç/kapak sayfası → tamamen atla.
    if (!pageLines.some((l) => BK_RE.test(l))) continue;

    // Bölüm başlığı taşıyan sayfalarda (1. ve 2. Kısım'ın ilk sayfası) başlıktan
    // sonra uzun bir giriş paragrafı gelir; ilk "Bk. N"e kadar her şeyi at.
    // Aksi halde bu paragraf bir önceki koşulun metnine yapışır.
    let use = pageLines;
    if (pageLines.some((l) => /^TABLO\s*3\s*VE\s*TABLO\s*4/i.test(l))) {
      use = pageLines.slice(pageLines.findIndex((l) => BK_RE.test(l)));
    }

    for (const l of use) {
      if (isJunk(l)) continue;
      lines.push(l);
    }
  }

  const entries = new Map(); // code -> array of line fragments
  const orphans = []; // "Bk. N" etiketi olmayan, ilk koşuldan sonraki bloklar
  let current = null;
  let started = false;

  for (const line of lines) {
    const m = BK_RE.exec(line);
    if (m) {
      started = true;
      const code = String(parseInt(m[1], 10));
      if (!entries.has(code)) entries.set(code, []);
      current = entries.get(code);
      if (m[2].trim()) current.push(m[2].trim());
      continue;
    }
    if (!started) continue; // bölüm başındaki açıklama paragrafı
    if (ORPHAN_STARTS.some((s) => line.startsWith(s))) {
      orphans.push(line);
      current = null; // blok bitene (sonraki "Bk. N") kadar hiçbir yere yazma
      continue;
    }
    if (current) current.push(line);
  }

  const out = {};
  for (const [code, parts] of entries) {
    out[code] = joinFragments(parts);
  }
  return { out, orphans };
}

// Satırları tek satırlık düzgün metne indir: satır sonu tirelemesini onar.
function joinFragments(parts) {
  let text = '';
  for (const part of parts) {
    if (!text) {
      text = part;
      continue;
    }
    // Kaynakta satır sonu heceleme YOK; sondaki "-" her zaman gerçek bir tiredir
    // (ör. "eğitim-" + "öğretim", "tuition-and-" + "fees"). Tireyi koru, boşluk ekleme.
    if (/-$/.test(text) && /^[\wÇĞİIÖŞÜçğıöşü]/.test(part)) {
      text = text + part;
    } else {
      text += ' ' + part;
    }
  }
  return text.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

// --- 4) Çalıştır -----------------------------------------------------------
function main() {
  const raw = extractText();
  const { out, orphans } = parse(raw);

  const codes = Object.keys(out)
    .map(Number)
    .sort((a, b) => a - b);

  const sorted = {};
  for (const c of codes) sorted[String(c)] = out[String(c)];

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

  // Rapor
  console.log(`Kod sayısı : ${codes.length}`);
  console.log(`Aralık     : ${codes[0]} .. ${codes[codes.length - 1]}`);
  const gaps = [];
  for (let i = 1; i < codes.length; i++) {
    const d = codes[i] - codes[i - 1];
    if (d > 10) gaps.push(`${codes[i - 1]}→${codes[i]} (${d - 1} eksik)`);
  }
  console.log(`Büyük boşluk: ${gaps.length ? gaps.join(', ') : 'yok'}`);
  if (orphans.length)
    console.log(`Etiketsiz (atılan) blok: ${orphans.length} — ${orphans[0].slice(0, 60)}...`);
  const short = codes.filter((c) => sorted[String(c)].length < 25);
  if (short.length) console.log(`Şüpheli kısa metinler: ${short.join(', ')}`);
  console.log(`Yazıldı    : ${OUT}`);
}

main();
