import { useEffect, useState, type ReactNode } from 'react'
import type { Position, Side, SowStep } from '../game/engine'
import { sfx } from '../sound'

export interface BoardAnim {
  base: Position
  steps: SowStep[]
  mover: Side
}

interface BoardProps {
  position: Position
  /** сторона, показываемая снизу (свой экран) */
  bottomSide: Side
  /** чьи ходы кликабельны (absolute indices), пусто = только просмотр */
  legalHoles: number[]
  lastHole: number | null
  anim: BoardAnim | null
  onAnimDone: () => void
  onHoleClick?: (hole: number) => void
  names: [string, string]
}

/** мини-фишки внутри лунки: до 9 точек, дальше — число */
function beads(count: number): ReactNode {
  if (count <= 0) return null
  if (count > 9) return <span className="hole-count">{count}</span>
  return (
    <span className="beads">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className="bead" />
      ))}
    </span>
  )
}

export function Board({
  position,
  bottomSide,
  legalHoles,
  lastHole,
  anim,
  onAnimDone,
  onHoleClick,
  names,
}: BoardProps) {
  const [frame, setFrame] = useState<Position | null>(null)
  const [flash, setFlash] = useState<number | null>(null)

  useEffect(() => {
    if (!anim) {
      setFrame(null)
      setFlash(null)
      return
    }
    const cur: Position = JSON.parse(JSON.stringify(anim.base))
    let idx = 0
    const iv = setInterval(() => {
      if (idx >= anim.steps.length) {
        clearInterval(iv)
        setFrame(null)
        setFlash(null)
        onAnimDone?.()
        return
      }
      const s = anim.steps[idx++]
      if (s.kind === 'drop') {
        cur.holes[s.hole] += 1
        sfx('drop')
      } else if (s.kind === 'tuzdyk-drop') {
        const owner = cur.tuzdyk[s.hole]
        if (owner !== null) cur.kazan[owner] += 1
        sfx('drop')
      } else if (s.kind === 'capture') {
        cur.kazan[anim.mover] += s.count ?? 0
        cur.holes[s.hole] = 0
        sfx('capture')
      } else if (s.kind === 'tuzdyk-created') {
        cur.tuzdyk[s.hole] = anim.mover
        cur.kazan[anim.mover] += s.count ?? 3
        cur.holes[s.hole] = 0
        sfx('tuzdyk')
      }
      setFlash(s.hole)
      setFrame(JSON.parse(JSON.stringify(cur)) as Position)
    }, 130)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim])

  const shown = frame ?? position
  const oppSide = (bottomSide === 0 ? 1 : 0) as Side

  const holeEl = (abs: number, cls: string) => {
    const clickable = legalHoles.includes(abs) && !anim
    return (
      <button
        type="button"
        key={abs}
        className={[
          'hole',
          cls,
          shown.tuzdyk[abs] !== null ? 'tuzdyk' : '',
          lastHole === abs ? 'last' : '',
          flash === abs ? 'flash' : '',
          clickable ? 'clickable' : '',
        ].join(' ')}
        onClick={clickable ? () => onHoleClick?.(abs) : undefined}
        disabled={!clickable}
      >
        {shown.tuzdyk[abs] !== null && <span className="tuz-mark">Т</span>}
        {beads(shown.holes[abs])}
      </button>
    )
  }

  // верхний ряд слева направо: лунки соперника 9..1 (соперник сидит напротив)
  const topIdx: number[] = []
  for (let k = 8; k >= 0; k--) topIdx.push(oppSide * 9 + k)
  const bottomIdx: number[] = []
  for (let k = 0; k < 9; k++) bottomIdx.push(bottomSide * 9 + k)

  return (
    <div className="board-wrap">
      <div className="board">
        <div className="kazan kazan-left">
          <span className="kazan-name">{names[0]}</span>
          <span className="kazan-count">{shown.kazan[oppSide]}</span>
          <span className="kazan-label">казан</span>
        </div>
        <div className="holes-grid">
          <div className="row row-top">
            {topIdx.map((i) => holeEl(i, 'hole-opp'))}
          </div>
          <div className="row row-bottom">
            {bottomIdx.map((i) => holeEl(i, 'hole-mine'))}
          </div>
        </div>
        <div className="kazan kazan-right">
          <span className="kazan-name">{names[1]}</span>
          <span className="kazan-count">{shown.kazan[bottomSide]}</span>
          <span className="kazan-label">казан</span>
        </div>
      </div>
    </div>
  )
}
