import { useEffect, useMemo, useState } from 'react'
import { BASE_YEAR, type ProgramRow } from './programRow'
import {
  EMPTY_KILAVUZ,
  findKilavuzProgram,
  loadKilavuz,
  resolveConditions,
  type KilavuzData
} from '../lib/kilavuz'
import { EMPTY_FEES, findFee, formatFee, loadFees, type FeeData, type FeeLevel } from '../lib/fees'

const DASH = '—'

function num(v: number | null | undefined): string {
  return v == null ? DASH : v.toLocaleString('tr-TR')
}

function txt(v: string | null | undefined): string {
  return v && v.trim() ? v : DASH
}

/**
 * Programın bulunduğu yeri Google Haritalar'da açan bağlantı.
 *
 * Koordinat tutmuyoruz; arama metnini Haritalar'a bırakıyoruz. Fakülte adı
 * varsa metne katılıyor — çok kampüslü üniversitelerde doğru yerleşkeye
 * düşmeyi belirgin şekilde artırıyor. İl her hâlükârda ekleniyor ki aynı adı
 * taşıyan başka bir kuruma gitmesin.
 */
function mapsUrl(row: ProgramRow): string {
  const parts = [row.university, row.faculty, row.city].filter(
    (p): p is string => Boolean(p && p.trim())
  )
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(' '))}`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pd-stat">
      <span className="pd-stat-label">{label}</span>
      <span className="pd-stat-value">{value}</span>
    </div>
  )
}

function KilavuzSection({ row, kilavuz }: { row: ProgramRow; kilavuz: KilavuzData }) {
  const match = useMemo(
    () =>
      findKilavuzProgram(kilavuz, {
        university: row.university,
        program: row.program,
        programRaw: row.programRaw,
        faculty: row.faculty,
        scoreType: row.scoreType
      }),
    [kilavuz, row]
  )

  // Kılavuz dosyaları henüz üretilmediyse bölümü hiç gösterme.
  if (!kilavuz.available) return null

  if (!match) {
    return (
      <section className="pd-block">
        <h4 className="pd-block-title">2026 Kılavuz Bilgileri</h4>
        <p className="pd-empty">Bu program için kılavuzda eşleşme bulunamadı.</p>
      </section>
    )
  }

  const p = match.program
  const q = p.quota2026
  const conditions = resolveConditions(kilavuz, p.conditionCodes)
  const staff = p.staff

  return (
    <section className="pd-block">
      <h4 className="pd-block-title">
        2026 Kılavuz Bilgileri
        {match.ambiguousButEqual && (
          <span className="pd-note"> (kılavuzda birden çok eş kayıt var, kontenjanları aynı)</span>
        )}
      </h4>

      <div className="pd-stats">
        <Stat label="ÖSYM program kodu" value={p.code} />
        <Stat label="2026 genel kontenjan" value={num(q?.genel)} />
        <Stat label="Okul birincisi kont." value={num(q?.okulBirincisi)} />
        <Stat label="Şehit-gazi yak. kont." value={num(q?.sehitGazi)} />
        <Stat label="34 yaş üstü kadın kont." value={num(q?.kadin34)} />
        {q?.meb != null && <Stat label="MEB kontenjanı" value={num(q.meb)} />}
        <Stat label="Akreditasyon" value={txt(p.accreditation)} />
        {p.duration != null && <Stat label="Öğrenim süresi" value={`${p.duration} yıl`} />}
        {p.kpss != null && <Stat label="KPSS" value={p.kpss.toLocaleString('tr-TR')} />}
      </div>

      {staff && (staff.prof != null || staff.docent != null || staff.drOgrUyesi != null) && (
        <div className="pd-stats">
          <Stat label="Profesör" value={num(staff.prof)} />
          <Stat label="Doçent" value={num(staff.docent)} />
          <Stat label="Dr. Öğr. Üyesi" value={num(staff.drOgrUyesi)} />
        </div>
      )}

      {conditions.length > 0 && (
        <div className="pd-conditions">
          <span className="pd-stat-label">Özel koşul ve açıklamalar</span>
          <ul>
            {conditions.map(c => (
              <li key={c.code}>
                <span className="pd-cond-code">{c.code}</span>
                <span>{c.text ?? 'Açıklama metni kılavuz verisinde bulunamadı.'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// "(4 Yıllık)" / "(2 Yıllık)" ekinden öğrenim düzeyini çıkarır.
function levelOf(row: ProgramRow): FeeLevel | null {
  const m = row.programRaw.match(/\((\d)\s*Y[ıi]ll[ıi]k\)/iu)
  if (!m) return null
  return m[1] === '2' ? 'onlisans' : 'lisans'
}

function FeeSection({ row, fees }: { row: ProgramRow; fees: FeeData }) {
  const level = levelOf(row)
  const match = useMemo(
    () => findFee(fees, { university: row.university, program: row.program, level }),
    [fees, row, level]
  )

  // Devlet üniversitelerinde öğrenim ücreti yoktur; veri yüklenmediyse de gösterme.
  if (row.funding === 'Devlet' || !fees.available || !match) return null

  const { record, generic } = match
  return (
    <section className="pd-block">
      <h4 className="pd-block-title">
        Öğrenim Ücreti (2026-2027)
        {generic && <span className="pd-note"> (kurum geneli için verilen ücret)</span>}
      </h4>
      <div className="pd-stats">
        <Stat label="Tam (ücretli) yıllık ücret" value={formatFee(record.fee)} />
        <Stat label="Kaynak kayıt" value={record.program} />
      </div>
      <p className="pd-empty">
        Bu, indirimsiz "ücretli" fiyattır.
        {row.funding !== 'Ücretli' && ` Bu program ${row.funding.toLocaleLowerCase('tr')} olduğu için üniversite indirim uygular.`}
        {record.note ? ` ${record.note}` : ''}
        {' '}
        <span className="pd-warn">
          (Fiyatlar kesin olmayabilir. Kendiniz sağlamasını yapmanız önerilir.)
        </span>
      </p>
    </section>
  )
}

export default function ProgramDetails({ row }: { row: ProgramRow }) {
  const [kilavuz, setKilavuz] = useState<KilavuzData>(EMPTY_KILAVUZ)
  const [fees, setFees] = useState<FeeData>(EMPTY_FEES)

  useEffect(() => {
    let alive = true
    loadKilavuz().then(data => {
      if (alive) setKilavuz(data)
    })
    loadFees().then(data => {
      if (alive) setFees(data)
    })
    return () => {
      alive = false
    }
  }, [])

  const base = row.byYear.get(BASE_YEAR)
  const pastYears = useMemo(
    () => [...row.byYear.values()].filter(y => y.year !== BASE_YEAR).sort((a, b) => b.year - a.year),
    [row]
  )

  return (
    <div className="program-details">
      <section className="pd-block">
        <h4 className="pd-block-title">{BASE_YEAR} Yılı Verileri</h4>
        <div className="pd-stats">
          <Stat label="Kontenjan" value={txt(base?.quota)} />
          <Stat label="Yerleşen" value={txt(base?.placed)} />
          <Stat label="Başarı sırası" value={txt(base?.rank)} />
          <Stat label="Taban puan" value={txt(base?.score)} />
        </div>
      </section>

      <section className="pd-block">
        <h4 className="pd-block-title">Geçmiş Yıllar</h4>
        {pastYears.length === 0 ? (
          <p className="pd-empty">Geçmiş yıl verisi yok.</p>
        ) : (
          <div className="pd-table-wrapper">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Yıl</th>
                  <th>Kontenjan</th>
                  <th>Yerleşen</th>
                  <th>Başarı sırası</th>
                  <th>Taban puan</th>
                </tr>
              </thead>
              <tbody>
                {pastYears.map(y => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td>{txt(y.quota)}</td>
                    <td>{txt(y.placed)}</td>
                    <td>{txt(y.rank)}</td>
                    <td>{txt(y.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pd-block">
        <h4 className="pd-block-title">Program Bilgileri</h4>
        <div className="pd-actions">
          <a className="pd-link" href={mapsUrl(row)} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 18s6-5.2 6-9.4A6 6 0 0 0 4 8.6C4 12.8 10 18 10 18Z" />
              <circle cx="10" cy="8.4" r="2.2" />
            </svg>
            Haritada aç
          </a>
        </div>
        <div className="pd-stats">
          <Stat label="Üniversite" value={row.university} />
          <Stat label="Fakülte / Yüksekokul" value={txt(row.faculty)} />
          <Stat label="Program" value={row.programRaw} />
          <Stat label="Puan türü" value={txt(row.scoreType)} />
          <Stat label="Ücret türü" value={row.funding} />
          <Stat label="Öğretim dili" value={row.language} />
          <Stat label="Uyruk" value={row.nationality === 'KKTC' ? 'KKTC Uyruklu' : 'T.C. Uyruklu'} />
        </div>
      </section>

      <FeeSection row={row} fees={fees} />

      <KilavuzSection row={row} kilavuz={kilavuz} />
    </div>
  )
}
