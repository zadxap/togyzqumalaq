import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyMove, initialPosition, legalMoves, type Outcome, type Position } from '../game/engine'
import { Board, type BoardAnim } from '../components/Board'
import { MoveLog, type LogEntry } from '../components/MoveLog'
import { Confetti } from '../components/Confetti'
import { sfx } from '../sound'
import { useLang } from '../i18n'
import { IconBack, IconCheck } from '../components/Icons'

/** Двое на одном устройстве: pass-and-play */
export function HotseatScreen() {
  const { t } = useLang()
  const nav = useNavigate()
  const [pos, setPos] = useState<Position>(initialPosition(0))
  const [anim, setAnim] = useState<BoardAnim | null>(null)
  const [result, setResult] = useState<Outcome | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const moveNoRef = useRef(0)
  const outcomeRef = useRef<Outcome>({ type: 'playing' })
  const posRef = useRef(pos)

  const play = (hole: number) => {
    if (pos.status !== 'playing' || pos.turn !== Math.floor(hole / 9) || anim) return
    sfx('click')
    const mover = pos.turn
    const r = applyMove(pos, hole)
    outcomeRef.current = r.outcome
    posRef.current = r.position
    moveNoRef.current += 1
    const last = r.steps[r.steps.length - 1]
    setLog((l) => [
      ...l,
      { n: moveNoRef.current, mover, hole: (last.hole % 9) + 1, note: noteOf(last.kind, last.count) },
    ])
    setAnim({ base: pos, steps: r.steps, mover })
    setPos(r.position)
  }

  const onAnimDone = () => {
    setAnim(null)
    if (outcomeRef.current.type !== 'playing') setResult(outcomeRef.current)
  }

  const restart = () => {
    posRef.current = initialPosition(0)
    setPos(posRef.current)
    setAnim(null)
    setResult(null)
    setLog([])
    outcomeRef.current = { type: 'playing' }
    moveNoRef.current = 0
  }

  const names: [string, string] = [t('player2Name'), t('player1Name')]

  return (
    <div className="page match-page">
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={() => nav('/')}>
          <IconBack />
        </button>
        <h1 className="topbar-title">{t('hotseatBtn')}</h1>
        <div />
      </header>

      <div className="match-layout">
        <div className="board-col">
          <div className="turn-bar">
            {result ? (
              <span
                className={`turn-badge ${
                  result.type === 'draw' ? '' : result.type === 'win' && result.winner === 0 ? 'win' : 'lose'
                }`}
              >
                {result.type === 'draw'
                  ? t('drawGame')
                  : `${t('victory')}: ${result.type === 'win' && result.winner === 0 ? t('player1Name') : t('player2Name')}`}
              </span>
            ) : anim ? (
              '…'
            ) : (
              <span className="turn-badge my">
                {t('myTurn').slice(0, 0)}
                {pos.turn === 0 ? t('player1Name') : t('player2Name')} — {t('myTurn')}
                <IconCheck size={14} />
              </span>
            )}
          </div>

          <Board
            position={pos}
            bottomSide={0}
            legalHoles={pos.status === 'playing' ? legalMoves(pos, pos.turn) : []}
            lastHole={null}
            anim={anim}
            onAnimDone={onAnimDone}
            onHoleClick={play}
            names={names}
          />

          {result && (
            <div className="result-actions">
              <button type="button" className="btn btn-primary" onClick={restart}>
                <IconCheck /> {t('rematch').replace(' (ИИ)', '')}
              </button>
            </div>
          )}
        </div>

        <aside className="side-panel">
          <MoveLog entries={log} name0={names[1]} name1={names[0]} />
        </aside>
      </div>

      <Confetti run={result?.type === 'win'} />
    </div>
  )
}

function noteOf(kind: string, count?: number): string | undefined {
  if (kind === 'capture') return `+${count ?? 0}`
  if (kind === 'tuzdyk-created') return 'ТУЗДЫҚ'
  return undefined
}
