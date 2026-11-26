import { useId } from 'react'

// Prayer mat illustration whose mihrab arch "fills" as the form progresses.
const ARCH =
  'M58,246 L58,128 C58,102 80,96 90,86 Q100,74 100,62 Q100,74 110,86 C120,96 142,102 142,128 L142,246 Z'

export default function PrayerMat({ progress = 0, done = false, className = '' }) {
  const clipId = useId()
  const diamonds = []
  for (let i = 0; i < 9; i++) {
    const x = 34 + i * 16.5
    diamonds.push(<path key={`t${i}`} d={`M${x},40 l4,-4 l4,4 l-4,4 z`} />)
    diamonds.push(<path key={`b${i}`} d={`M${x},266 l4,-4 l4,4 l-4,4 z`} />)
  }
  for (let i = 0; i < 13; i++) {
    const y = 56 + i * 16.5
    diamonds.push(<path key={`l${i}`} d={`M32,${y} l4,-4 l4,4 l-4,4 z`} />)
    diamonds.push(<path key={`r${i}`} d={`M160,${y} l4,-4 l4,4 l-4,4 z`} />)
  }
  const fringe = []
  for (let i = 0; i < 46; i++) {
    const x = 22 + i * 3.4
    fringe.push(<line key={`ft${i}`} x1={x} y1="22" x2={x + (i % 3) - 1} y2={10 + (i % 4)} />)
    fringe.push(<line key={`fb${i}`} x1={x} y1="284" x2={x + (i % 3) - 1} y2={296 - (i % 4)} />)
  }

  return (
    <svg
      className={`mat ${done ? 'mat--done' : ''} ${className}`}
      viewBox="0 0 200 306"
      role="img"
      aria-label={`Prayer mat progress: ${Math.round(progress * 100)}%`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={ARCH} />
        </clipPath>
      </defs>
      <g className="mat__fringe">{fringe}</g>
      <rect x="20" y="22" width="160" height="262" className="mat__base" />
      <rect x="26" y="28" width="148" height="250" className="mat__line" />
      <rect x="44" y="48" width="112" height="210" className="mat__line" />
      <g className="mat__diamonds">{diamonds}</g>
      <rect x="50" y="54" width="100" height="198" className="mat__line" />
      <path d={ARCH} className="mat__arch-bg" />
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="50"
          y="60"
          width="100"
          height="190"
          className="mat__fill"
          style={{ transform: `scaleY(${progress})` }}
        />
      </g>
      <path d={ARCH} className="mat__arch" />
      <path d={ARCH} className="mat__arch mat__arch--inner" transform="translate(100 150) scale(.88) translate(-100 -150)" />
    </svg>
  )
}
