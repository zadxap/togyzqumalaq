import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyHistory, type MatchRow } from '../matches'
import { useAuth } from '../auth'
import { fmtDate, useLang } from '../i18n'
import { IconBack } from '../components/Icons'
import { EmptyState } from '../components/EmptyState'

export function HistoryScreen() {
  const { userId } = useAuth()
  const { t, lang } = useLang()
  const nav = useNavigate()
  const [rows, setRows] = useState<MatchRow[] | null>(null)

  useEffect(() => {
    if (!userId || userId === 'local') {
      setRows([])
      return
    }
    void fetchMyHistory(userId).then(setRows)
  }, [userId])

  const opponentOf = (m: MatchRow): string =>
    m.player0 === userId ? (m.p1?.display_name ?? '…') : (m.p0?.display_name ?? '…')

  const resultFor = (m: MatchRow): 'win' | 'lose' | 'draw' | null => {
    if (!m.outcome || !userId) return null
    if (m.outcome === 'draw') return 'draw'
    const iWon = (m.outcome === 'p0' && m.player0 === userId) || (m.outcome === 'p1' && m.player1 === userId)
    return iWon ? 'win' : 'lose'
  }

  const kazans = (m: MatchRow, userId2: string): string => {
    const mine = m.player0 === userId2 ? m.position.kazan[0] : m.position.kazan[1]
    const theirs = m.player0 === userId2 ? m.position.kazan[1] : m.position.kazan[0]
    return `${mine} : ${theirs}`
  }

  return (
    <div className="page">
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={() => nav('/')}>
          <IconBack />
        </button>
        <h1 className="topbar-title">{t('history')}</h1>
        <div />
      </header>

      {rows && rows.length === 0 && <EmptyState text={t('empty')} />}
      <div className="card-list">
        {rows?.map((m) => {
          const res = resultFor(m)
          return (
            <div className="card hist-card" key={m.id}>
              <span className={`hist-badge ${res ?? ''}`}>
                {res === 'win' ? t('victory') : res === 'lose' ? t('defeat') : t('tie')}
              </span>
              <div className="hist-info">
                <span className="match-name">
                  {t('vs')} {opponentOf(m)}
                </span>
                <span className="dim">
                  {kazans(m, userId ?? '')} · {fmtDate(m.updated_at, lang)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
