import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchByCode,
  fetchLiveMatches,
  fetchOpenMatches,
  joinMatch,
  subscribeMatches,
  cancelMatch,
  type MatchRow,
} from '../matches'
import { useAuth } from '../auth'
import { useLang, type StringKey } from '../i18n'
import { Avatar, LangToggle } from '../components/ui'
import { IconEye, IconPlus, IconRobot, IconTrophy, IconUser } from '../components/Icons'

function MatchCard({
  m,
  onJoin,
  onWatch,
  onCancel,
  myId,
}: {
  m: MatchRow
  onJoin?: () => void
  onWatch?: () => void
  onCancel?: () => void
  myId: string
}) {
  const { t } = useLang()
  const isMineWaiting = m.player0 === myId && m.status === 'waiting'
  const name0 = m.p0?.display_name ?? '…'
  return (
    <div className="card match-card">
      <div className="match-card-head">
        <Avatar uid={m.player0} name={name0} size={34} />
        <div className="match-card-names">
          <span className="match-name">{name0}</span>
          {m.p1 && m.p1.display_name ? (
            <span className="match-name dim">{t('vs')} {m.p1.display_name}</span>
          ) : (
            <span className="match-name dim">{t('waitingOpp')}</span>
          )}
        </div>
        {m.status === 'waiting' && m.code && (
          <span className="match-code-chip">{m.code}</span>
        )}
        {m.status === 'waiting' && isMineWaiting && onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            {t('cancelMatch')}
          </button>
        )}
        {m.status === 'waiting' && !isMineWaiting && onJoin && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onJoin}>
            {t('join')}
          </button>
        )}
        {m.status === 'playing' && onWatch && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onWatch}>
            <IconEye size={16} /> {t('watch')}
          </button>
        )}
      </div>
    </div>
  )
}

export function LobbyScreen() {
  const { userId, profile } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [open, setOpen] = useState<MatchRow[]>([])
  const [live, setLive] = useState<MatchRow[]>([])
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState(false)

  const reload = async () => {
    if (!userId || userId === 'local') return
    try {
      const [o, l] = await Promise.all([fetchOpenMatches(), fetchLiveMatches()])
      // свои ожидающие вызовы тоже показываем — с кнопкой «Отменить»
      setOpen(o)
      setLive(l)
      setLoadErr(false)
    } catch (e) {
      console.error(e)
      setLoadErr(true)
    }
  }

  useEffect(() => {
    void reload()
    return subscribeMatches(() => void reload())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const create = async () => {
    if (!userId) return
    setBusy(true)
    try {
      const pos = (await import('../game/engine')).initialPosition(0)
      const m = await (await import('../matches')).createMatch(userId, pos)
      nav(`/m/${m.id}`)
    } finally {
      setBusy(false)
    }
  }

  const join = async (m: MatchRow) => {
    setBusy(true)
    try {
      await (await import('../matches')).joinMatch(m.id, userId!)
      nav(`/m/${m.id}`)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (m: MatchRow) => {
    await cancelMatch(m.id)
    void reload()
  }

  const joinByCode = async () => {
    if (!code.trim()) {
      setCodeErr('errEnterCode')
      return
    }
    setBusy(true)
    setCodeErr(null)
    try {
      const m = await fetchByCode(code)
      if (!m) {
        setCodeErr('errCodeNotFound')
        return
      }
      if (m.status === 'waiting' && m.player0 !== userId) await joinMatch(m.id, userId!)
      nav(`/m/${m.id}`)
    } catch (e) {
      setCodeErr(String((e as { message?: string }).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="topbar-title">{t('lobby')}</h1>
        <div className="topbar-actions">
          <LangToggle />
          <button type="button" className="iconbtn" onClick={() => nav('/profile')} aria-label="profile">
            <IconUser />
          </button>
        </div>
      </header>

      <div className="lobby-actions">
        <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
          <IconPlus /> {t('createMatch')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => nav('/ai')}>
          <IconRobot /> {t('playAI')}
        </button>
      </div>

      <div className="lobby-actions">
        <button type="button" className="btn btn-ghost" onClick={() => nav('/hotseat')}>
          👥 {t('hotseatBtn')}
        </button>
      </div>

      <div className="join-by-code">
        <span className="jbc-label">{t('joinByCode')}</span>
        <div className="join-row">
          <input
            className="code-input"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setCodeErr(null)
            }}
            placeholder="AB12CD"
            maxLength={6}
            spellCheck={false}
          />
          <button type="button" className="btn btn-primary" onClick={joinByCode} disabled={busy}>
            {t('join')}
          </button>
        </div>
        {codeErr && <p className="field-err">{t(codeErr as StringKey)}</p>}
      </div>

      <div className="lobby-stats">
        <IconTrophy size={16} />
        <span>
          {profile ? `${t('rating')}: ${profile.elo} · ${profile.wins}/${profile.losses}/${profile.draws}` : t('guestNote')}
        </span>
      </div>

      <section className="section">
        <h2>{t('openChallenges')}</h2>
        {loadErr && <p className="field-err">{t('loadErr')}</p>}
        {open.length === 0 && <p className="dim-note">{t('noOpen')}</p>}
        <div className="card-list">
          {open.map((m) => (
            <MatchCard key={m.id} m={m} myId={userId ?? ''} onJoin={() => void join(m)} onCancel={() => void cancel(m)} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{t('liveMatches')}</h2>
        {live.length === 0 && <p className="dim-note">{t('empty')}</p>}
        <div className="card-list">
          {live.map((m) => (
            <MatchCard key={m.id} m={m} myId={userId ?? ''} onWatch={() => nav(`/m/${m.id}`)} />
          ))}
        </div>
      </section>
    </div>
  )
}
