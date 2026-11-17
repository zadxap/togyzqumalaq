import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  applyMove,
  initialPosition,
  legalMoves,
  type Outcome,
  type Position,
} from '../game/engine'
import { Board, type BoardAnim } from '../components/Board'
import { useLang } from '../i18n'
import { IconBack, IconRobot } from '../components/Icons'

const DEPTHS: Record<'easy' | 'medium' | 'hard', number> = { easy: 2, medium: 4, hard: 7 }

type Level = keyof typeof DEPTHS

export function MatchAIScreen() {
  const { t } = useLang()
  const nav = useNavigate()
  const [level, setLevel] = useState<Level | null>(null)
  const [pos, setPos] = useState<Position>(initialPosition(0))
  const [anim, setAnim] = useState<BoardAnim | null>(null)
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState<Outcome | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const posRef = useRef(pos)
  const turnRef = useRef<'me' | 'ai' | null>(null)
  const outcomeRef = useRef<Outcome>({ type: 'playing' })

  useEffect(() => {
    const w = new Worker(new URL('../game/ai.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    return () => w.terminate()
  }, [])

  // ответ ИИ из воркера
  useEffect(() => {
    const w = workerRef.current
    if (!w) return
    w.onmessage = (e: MessageEvent<{ move?: number; error?: string }>) => {
      setThinking(false)
      if (e.data.error || e.data.move === undefined) return
      const base = posRef.current
      const r = applyMove(base, e.data.move)
      outcomeRef.current = r.outcome
      posRef.current = r.position
      turnRef.current = 'ai'
      setAnim({ base, steps: r.steps, mover: 1 })
      setPos(r.position)
    }
  }, [])

  const onAnimDone = () => {
    turnRef.current = null
    if (outcomeRef.current.type !== 'playing') {
      setResult(outcomeRef.current)
      return
    }
    const cur = posRef.current
    // мой ход завершён и очередь ИИ
    if (turnWasRef.current === 'me' && cur.status === 'playing' && cur.turn === 1) {
      setThinking(true)
      workerRef.current?.postMessage({
        position: cur,
        opts: { depth: level ? DEPTHS[level] : 4, timeMs: 1600 },
      })
    }
  }

  const turnWasRef = useRef<'me' | 'ai' | null>(null)

  const play = (hole: number) => {
    if (pos.status !== 'playing' || pos.turn !== 0 || anim || thinking) return
    const r = applyMove(pos, hole)
    outcomeRef.current = r.outcome
    posRef.current = r.position
    turnWasRef.current = 'me'
    turnRef.current = 'me'
    setAnim({ base: pos, steps: r.steps, mover: 0 })
    setPos(r.position)
  }

  const restart = () => {
    posRef.current = initialPosition(0)
    setPos(posRef.current)
    setAnim(null)
    setResult(null)
    outcomeRef.current = { type: 'playing' }
  }

  if (!level) {
    return (
      <div className="page">
        <header className="topbar">
          <button type="button" className="iconbtn" onClick={() => nav('/')}>
            <IconBack />
          </button>
          <h1 className="topbar-title">{t('playAI')}</h1>
          <div />
        </header>
        <div className="difficulty">
          <p className="dim-note">{t('aiSide')}</p>
          {(Object.keys(DEPTHS) as Level[]).map((lv) => (
            <button key={lv} type="button" className="btn btn-level" onClick={() => setLevel(lv)}>
              <IconRobot /> {t(lv)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const outcomeText = result
    ? result.type === 'draw'
      ? t('drawGame')
      : result.type === 'win' && result.winner === 0
        ? t('youWin')
        : t('youLose')
    : null

  return (
    <div className="page">
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={() => nav('/')}>
          <IconBack />
        </button>
        <h1 className="topbar-title">
          {t('playAI')} · {t(level)}
        </h1>
        <div />
      </header>

      <div className="turn-bar">
        {result ? (
          <span
            className={`turn-badge ${
              result.type === 'draw' ? '' : result.type === 'win' && result.winner === 0 ? 'win' : 'lose'
            }`}
          >
            {outcomeText}
          </span>
        ) : thinking ? (
          t('aiThinking')
        ) : pos.turn === 0 ? (
          <span className="turn-badge my">{t('myTurn')}</span>
        ) : (
          t('oppTurn')
        )}
      </div>

      <Board
        position={pos}
        bottomSide={0}
        legalHoles={pos.status === 'playing' && pos.turn === 0 ? legalMoves(pos, 0) : []}
        lastHole={null}
        anim={anim}
        onAnimDone={onAnimDone}
        onHoleClick={play}
        names={['ИИ', t('youName')]}
      />

      {result && (
        <div className="result-actions">
          <button type="button" className="btn btn-primary" onClick={restart}>
            <IconRobot /> {t('rematch')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setLevel(null)}>
            {t('difficulty')}
          </button>
        </div>
      )}
    </div>
  )
}
