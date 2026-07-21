import { useState } from 'react'
import type { MouseEvent } from 'react'
import turkeyCities from '../data/turkeyCities'
import './TurkeyMap.css'

interface TurkeyMapProps {
  selected: Set<string>
  onToggle: (plate: string) => void
}

export default function TurkeyMap({ selected, onToggle }: TurkeyMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement
    if (target.tagName !== 'path') return
    const plate = target.parentElement?.getAttribute('data-plate')
    if (plate) onToggle(plate)
  }

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement
    if (target.tagName !== 'path') {
      setHovered(null)
      return
    }
    setHovered(target.parentElement?.getAttribute('data-city') ?? null)
  }

  return (
    <div className="turkey-map-wrapper">
      {hovered && <div className="turkey-map-tooltip">{hovered}</div>}
      <svg
        viewBox="0 0 1007 443"
        className="turkey-map-svg"
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setHovered(null)}
      >
        {turkeyCities.map(city => (
          <g key={city.plate} data-plate={city.plate} data-city={city.city}>
            <path
              d={city.draw}
              className={`turkey-map-path${selected.has(city.plate) ? ' is-selected' : ''}`}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
