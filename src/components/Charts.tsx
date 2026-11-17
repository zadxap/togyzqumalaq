import { useLang } from '../i18n'

/** Пончик W/L/D */
export function DonutChart({ w, l, d }: { w: number; l: number; d: number }) {
  const total = w + l + d
  const { t } = useLang()
  const r = 40
  const c = 2 * Math.PI * r
  const seg = (v: number) => (total ? (v / total) * c : 0)
  const o1 = 0
  const o2 = seg(w)
  const o3 = o2 + seg(l)
  return (
    <svg viewBox="0 0 120 120" className="donut">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(243,237,226,.08)" strokeWidth="14" />
      {w > 0 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#3F7D50" strokeWidth="14" strokeDasharray={`${seg(w)} ${c}`} strokeDashoffset={-o1} transform="rotate(-90 60 60)" strokeLinecap="butt" />
      )}
      {l > 0 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#BF4E24" strokeWidth="14" strokeDasharray={`${seg(l)} ${c}`} strokeDashoffset={-o2} transform="rotate(-90 60 60)" strokeLinecap="butt" />
      )}
      {d > 0 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="#C99A2E" strokeWidth="14" strokeDasharray={`${seg(d)} ${c}`} strokeDashoffset={-o3} transform="rotate(-90 60 60)" strokeLinecap="butt" />
      )}
      <text x="60" y="56" textAnchor="middle" className="donut-num">{total}</text>
      <text x="60" y="74" textAnchor="middle" className="donut-label">{t('games')}</text>
    </svg>
  )
}

/** Линия прогресса Эло по истории матчей */
export function EloLine({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <p className="dim-note">—</p>
  }
  const w = 260
  const h = 90
  const min = Math.min(...points) - 10
  const max = Math.max(...points) + 10
  const px = (i: number) => 8 + (i / (points.length - 1)) * (w - 16)
  const py = (v: number) => h - 10 - ((v - min) / (max - min)) * (h - 24)
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  const area = `${path} L${px(points.length - 1).toFixed(1)},${h} L8,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="eloline">
      <path d={area} fill="rgba(191,78,36,.14)" stroke="none" />
      <path d={path} fill="none" stroke="#BF4E24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r="3" fill="#F3EDE2" stroke="#BF4E24" strokeWidth="1.5" />
      ))}
      <text x={w - 4} y={py(points[points.length - 1]) - 7} textAnchor="end" className="eloline-last">
        {points[points.length - 1]}
      </text>
    </svg>
  )
}
