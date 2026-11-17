import { useState } from 'react'
import { supabase, supabaseConfigured } from '../supabase'
import { useLang } from '../i18n'
import { LangToggle } from '../components/ui'
import { LogoMark } from '../components/Icons'
import { OrnamentBand } from '../components/Ornament'

export function AuthScreen() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const magic = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr('invalidEmail')
      return
    }
    setBusy(true)
    setErr(null)
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setSent(true)
  }

  const guest = async () => {
    setBusy(true)
    setErr(null)
    const { error } = await supabase!.auth.signInAnonymously()
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="auth">
      <div className="auth-deco top" aria-hidden="true">
        <OrnamentBand accent={0} />
        <OrnamentBand accent={1} />
      </div>
      <LangToggle />

      <div className="auth-card">
        <LogoMark size={80} />
        <h1 className="wordmark">Тоғызқұмалақ</h1>
        <p className="auth-tagline">{t('appTagline')}</p>

        {!supabaseConfigured ? (
          <p className="auth-err">Supabase не настроен (.env) — доступен только локальный матч с ИИ</p>
        ) : sent ? (
          <p className="auth-sent">{t('magicSent')}</p>
        ) : (
          <>
            <label className="field">
              <span>{t('emailLabel')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErr(null)
                }}
                placeholder="you@gmail.com"
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={magic} disabled={busy}>
              {busy ? '…' : t('magicLink')}
            </button>
            {err && <p className="field-err">{t(err as 'invalidEmail') ?? err}</p>}
            <div className="auth-or">{t('or')}</div>
            <button type="button" className="btn btn-ghost" onClick={guest} disabled={busy}>
              {t('guestBtn')}
            </button>
            <p className="auth-note">{t('guestNote')}</p>
          </>
        )}
      </div>

      <p className="auth-footer">{t('footer')}</p>
      <div className="auth-deco bottom" aria-hidden="true">
        <OrnamentBand accent={2} />
        <OrnamentBand accent={3} />
      </div>
    </div>
  )
}
