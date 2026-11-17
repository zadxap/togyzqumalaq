import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useLang } from '../i18n'
import { supabase } from '../supabase'
import { Avatar, LangToggle } from '../components/ui'
import { IconHistory, IconSignOut } from '../components/Icons'

export function ProfileScreen() {
  const { userId, profile, refreshProfile, signOut } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!userId || userId === 'local' || !name.trim()) return
    await supabase!.from('profiles').update({ display_name: name.trim() }).eq('id', userId)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="page">
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={() => nav('/')}>
          ⌂
        </button>
        <h1 className="topbar-title">{t('profile')}</h1>
        <LangToggle />
      </header>

      <div className="profile-card">
        <Avatar uid={userId ?? 'x'} name={profile?.display_name ?? '?'} size={64} />
        <div className="profile-stats">
          <span className="profile-elo">{profile?.elo ?? 1200}</span>
          <span className="dim">{t('rating')}</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <b>{profile?.wins ?? 0}</b>
          <span>{t('wins')}</span>
        </div>
        <div className="stat-box">
          <b>{profile?.losses ?? 0}</b>
          <span>{t('losses')}</span>
        </div>
        <div className="stat-box">
          <b>{profile?.draws ?? 0}</b>
          <span>{t('draws')}</span>
        </div>
      </div>

      {userId !== 'local' && (
        <label className="field">
          <span>{t('nameEdit')}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
          />
        </label>
      )}
      {saved && <p className="field-ok">{t('saved')}</p>}
      {userId !== 'local' && (
        <button type="button" className="btn btn-primary" onClick={save} disabled={!name.trim()}>
          {t('save')}
        </button>
      )}

      <div className="profile-actions">
        <button type="button" className="btn btn-ghost" onClick={() => nav('/history')}>
          <IconHistory /> {t('history')}
        </button>
        {userId !== 'local' && (
          <button type="button" className="btn btn-danger" onClick={() => void signOut()}>
            <IconSignOut /> {t('signOut')}
          </button>
        )}
      </div>
    </div>
  )
}
