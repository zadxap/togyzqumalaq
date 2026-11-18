import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { applyMove, type Outcome, type Position } from '../game/engine'
import { sfx } from '../sound'
import { Board, type BoardAnim } from '../components/Board'
import { RulesSheet } from '../components/RulesSheet'
import { MoveLog, type LogEntry } from '../components/MoveLog'
import { Confetti } from '../components/Confetti'
import { useAuth } from '../auth'
import { useLang } from '../i18n'
import {
  applyResultToProfile,
  fetchMatch,
  joinMatch,
  joinMatchPresence,
  sendFinish,
  sendMove,
  subscribeMatch,
  type MatchRow,
} from '../matches'
import { Avatar } from '../components/ui'
import { IconBack, IconCheck, IconCopy } from '../components/Icons'

type Phase = 'loading' | 'waiting' | 'playing' | 'over' | 'gone'

export function MatchOnlineScreen() {
  const { id } = useParams()
  const { userId, profile, refreshProfile } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()

  const [row, setRow] = useState<MatchRow | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [pos, setPos] = useState<Position | null>(null)
  const [anim, setAnim] = useState<BoardAnim | null>(null)
  const [spectators, setSpectators] = useState(0)
  const [copied, setCopied] = useState(false)
  const [eloDelta, setEloDelta] = useState<number | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [joinErr, setJoinErr] = useState<string | null>(null)

  const knownCountRef = useRef(0)
  const displayPosRef = useRef<Position | null>(null)
  const outcomeRef = useRef<Outcome>({ type: 'playing' })
  const eloDoneRef = useRef(false)
  const moveNoRef = useRef(0)

  const mySide: 0 | 1 | null =
    row && userId
      ? row.player0 === userId
        ? 0
        : row.player1 === userId
          ? 1
          : null
      : null

  const pushLog = (mover: 0 | 1, steps: { hole: number; kind: string; count?: number }[]) => {
    const last = steps[steps.length - 1]
    moveNoRef.current += 1
    setLog((l) => [
      ...l,
      {
        n: moveNoRef.current,
        mover,
        hole: (last.hole % 9) + 1,
        note: noteOf(last.kind, last.count),
      },
    ])
  }

  // загрузка матча
  useEffect(() => {
    if (!userId || !id) return
    void (async () => {
      const m = await fetchMatch(id)
      if (!m) {
        setPhase('gone')
        return
      }
      setRow(m)
      knownCountRef.current = m.move_count
      displayPosRef.current = m.position
      setPos(m.position)
      outcomeRef.current = outcomeOf(m)
      moveNoRef.current = m.move_count
      setPhase(
        m.status === 'finished' ? 'over' : m.status === 'waiting' ? 'waiting' : 'playing',
      )
    })()
  }, [id, userId])

  // realtime: обновления матча + presence
  useEffect(() => {
    if (!id || !userId || !row) return
    const unsubRow = subscribeMatch(id, (newRow) => {
      if (newRow.move_count > knownCountRef.current) {
        knownCountRef.current = newRow.move_count
        try {
          const base = displayPosRef.current ?? newRow.position
          const hole = newRow.last_move ?? 0
          const r = applyMove(base, hole)
          outcomeRef.current = r.outcome
          displayPosRef.current = r.position
          setAnim({ base, steps: r.steps, mover: base.turn })
          setPos(newRow.position)
          pushLog(base.turn, r.steps)
        } catch {
          displayPosRef.current = newRow.position
          setPos(newRow.position)
        }
      }
      setRow(newRow)
      setPhase(
        newRow.status === 'finished'
          ? 'over'
          : newRow.status === 'waiting'
            ? 'waiting'
            : 'playing',
      )
    })
    const unsubPresence = joinMatchPresence(id, userId, setSpectators)
    return () => {
      unsubRow()
      unsubPresence()
    }
  }, [id, userId, row?.id])

  // Эло по завершении (один раз, только участники)
  useEffect(() => {
    if (phase !== 'over' || !row || row.status !== 'finished' || !userId || !mySideIs(row, userId)) return
    if (eloDoneRef.current) return
    eloDoneRef.current = true
    const myElo = mySide === 0 ? (row.p0?.elo ?? 1200) : (row.p1?.elo ?? 1200)
    const oppElo = mySide === 0 ? (row.p1?.elo ?? 1200) : (row.p0?.elo ?? 1200)
    if (row.outcome) {
      const score = rowOutcomeFor(row, mySide)
      void applyResultToProfile(userId, myElo, oppElo, score).then(() => {
        setEloDelta(newEloDelta(myElo, oppElo, score))
        void refreshProfile()
      })
    }
  }, [phase, row, userId, mySide, refreshProfile])

  const legal =
    pos && row && row.status === 'playing' && pos.turn === mySide && !anim
      ? pos.holes
          .map((c, i) => (c > 0 && pos.tuzdyk[i] === null && Math.floor(i / 9) === mySide ? i : -1))
          .filter((i) => i >= 0)
      : []

  const play = (hole: number) => {
    if (!pos || !row || !id || mySide === null) return
    if (pos.status !== 'playing' || pos.turn !== mySide || anim) return
    sfx('click')
    const r = applyMove(pos, hole)
    outcomeRef.current = r.outcome
    displayPosRef.current = r.position
    knownCountRef.current = row.move_count + 1
    pushLog(mySide, r.steps)
    setAnim({ base: pos, steps: r.steps, mover: mySide })
    setPos(r.position)
    const newCount = row.move_count + 1
    if (r.outcome.type === 'playing') {
      void sendMove(id, r.position, hole, newCount)
    } else {
      // Эло-итоги обеих сторон считаем на финише
      const myElo = mySide === 0 ? (row.p0?.elo ?? 1200) : (row.p1?.elo ?? 1200)
      const oppElo = mySide === 0 ? (row.p1?.elo ?? 1200) : (row.p0?.elo ?? 1200)
      const score = rowOutcomeForOutcome(r.outcome, mySide)
      const myAfter = applyK(myElo, oppElo, score)
      const oppAfter = applyK(oppElo, myElo, (1 - score) as 0 | 0.5 | 1)
      void sendFinish(id, r.position, hole, newCount, rOutcome(r.outcome), {
        eloAfter0: mySide === 0 ? myAfter : oppAfter,
        eloAfter1: mySide === 0 ? oppAfter : myAfter,
      })
    }
  }

  const onAnimDone = () => {
    setAnim(null)
    if (row && row.status === 'finished') setPhase('over')
  }

  if (phase === 'loading') return <div className="page"><div className="splash" /></div>
  if (phase === 'gone' || !row) {
    return (
      <div className="page pad-center">
        <header className="topbar">
          <button type="button" className="iconbtn" onClick={() => nav('/')} aria-label="back">
            <IconBack />
          </button>
          <h1 className="topbar-title">{t('notFound')}</h1>
          <div />
        </header>
      </div>
    )
  }

  const names: [string, string] = [
    mySide === 0 ? (row.p1?.display_name ?? '…') : (row.p0?.display_name ?? '…'),
    mySide === 0 ? (row.p0?.display_name ?? '…') : (row.p1?.display_name ?? '…'),
  ]

  if (phase === 'waiting') {
    const link = `${location.origin}/m/${row.id}`
    const isHost = row.player0 === userId
    return (
      <div className="page pad-center">
        <header className="topbar">
          <button type="button" className="iconbtn" onClick={() => nav('/')} aria-label="back">
            <IconBack />
          </button>
          <h1 className="topbar-title">{t('waitingOpp')}</h1>
          <div />
        </header>
        <div className="wait-card">
          <span className="wait-code">{row.code ?? '———'}</span>
          {!isHost && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                setJoinErr(null)
                try {
                  await joinMatch(row.id, userId!)
                  const m = await fetchMatch(row.id)
                  if (m) {
                    setRow(m)
                    knownCountRef.current = m.move_count
                    displayPosRef.current = m.position
                    setPos(m.position)
                    setPhase('playing')
                  }
                } catch (e) {
                  setJoinErr((e as { message?: string }).message ?? String(e))
                }
              }}
            >
              {t('join')}
            </button>
          )}
          {joinErr && <p className="field-err">{t('authErr')}: {joinErr}</p>}
          {isHost && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(link)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? <IconCheck /> : <IconCopy />} {copied ? '✓' : t('copyLink')}
              </button>
              <p className="dim-note">{t('codeHint')}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  const outcomeText =
    row.status === 'finished' && row.outcome
      ? row.outcome === 'draw'
        ? t('drawGame')
        : (row.outcome === 'p0' && mySide === 0) || (row.outcome === 'p1' && mySide === 1)
          ? t('youWin')
          : t('youLose')
      : null

  return (
    <div className="page match-page">
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={() => nav('/')} aria-label="back">
          <IconBack />
        </button>
        <h1 className="topbar-title">
          {names[0]} <span className="dim">·</span> {names[1]}
        </h1>
        <div className="topbar-actions">
          <button type="button" className="iconbtn" onClick={() => setRulesOpen(true)} aria-label="rules">
            ?
          </button>
          <span className="spectators" title={t('spectators')}>
            👁 {spectators}
          </span>
        </div>
      </header>

      <div className="match-layout">
        <div className="board-col">
          <div className="turn-bar">
            {row.status === 'finished' ? (
              <span
                className={`turn-badge ${
                  row.outcome === 'draw'
                    ? ''
                    : (row.outcome === 'p0' && mySide === 0) || (row.outcome === 'p1' && mySide === 1)
                      ? 'win'
                      : 'lose'
                }`}
              >
                {outcomeText}
                {eloDelta !== null && (
                  <em>
                    {' '}
                    · {t('eloChange')}: {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                  </em>
                )}
              </span>
            ) : anim ? (
              '…'
            ) : pos?.turn === mySide ? (
              <span className="turn-badge my">{t('myTurn')}</span>
            ) : (
              t('oppTurn')
            )}
          </div>

          <Board
            position={pos ?? row.position}
            bottomSide={mySide ?? 0}
            legalHoles={legal}
            lastHole={row.last_move}
            anim={anim}
            onAnimDone={onAnimDone}
            onHoleClick={play}
            names={names}
          />

          <div className="match-meta">
            <Avatar uid={userId ?? 'x'} name={profile?.display_name ?? '?'} size={22} />
            <span>{profile?.display_name}</span>
            {profile && <span className="dim">· {t('rating')} {profile.elo}</span>}
          </div>
        </div>

        <aside className="side-panel">
          <MoveLog entries={log} name0={names[1]} name1={names[0]} />
        </aside>
      </div>

      <Confetti
        run={
          row.status === 'finished' &&
          row.outcome !== 'draw' &&
          ((row.outcome === 'p0' && mySide === 0) || (row.outcome === 'p1' && mySide === 1))
        }
      />
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}

function mySideIs(row: MatchRow, userId: string): boolean {
  return row.player0 === userId || row.player1 === userId
}

function rowOutcomeFor(row: MatchRow, mySide: 0 | 1 | null): 0 | 0.5 | 1 {
  if (!row.outcome || row.outcome === 'draw') return 0.5
  const iWon = (row.outcome === 'p0' && mySide === 0) || (row.outcome === 'p1' && mySide === 1)
  return iWon ? 1 : 0
}

function rowOutcomeForOutcome(o: Outcome, mySide: 0 | 1): 0 | 0.5 | 1 {
  if (o.type !== 'win') return 0.5
  return o.winner === mySide ? 1 : 0
}

function applyK(mine: number, theirs: number, score: 0 | 0.5 | 1): number {
  const K = 32
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400))
  return Math.round(mine + K * (score - expected))
}

function newEloDelta(mine: number, theirs: number, score: 0 | 0.5 | 1): number {
  return applyK(mine, theirs, score) - mine
}

function outcomeOf(m: MatchRow): Outcome {
  if (m.status !== 'finished' || !m.outcome) return { type: 'playing' }
  if (m.outcome === 'draw') return { type: 'draw', reason: 'depleted' }
  return { type: 'win', winner: (m.outcome === 'p0' ? 0 : 1) as 0 | 1, reason: 'kazan' }
}

function rOutcome(o: Outcome): 'p0' | 'p1' | 'draw' {
  if (o.type === 'win') return o.winner === 0 ? 'p0' : 'p1'
  return 'draw'
}

function noteOf(kind: string, count?: number): string | undefined {
  if (kind === 'capture') return `+${count ?? 0}`
  if (kind === 'tuzdyk-created') return 'ТУЗДЫҚ'
  if (kind === 'tuzdyk-drop') return 'туздық'
  return undefined
}
