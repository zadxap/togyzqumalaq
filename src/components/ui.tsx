import { avatarColor, initials } from '../theme'
import { useLang } from '../i18n'
import type { Lang } from '../lang'

export function Avatar({ uid, name, size = 30 }: { uid: string; name: string; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4, backgroundColor: avatarColor(uid) }
  return (
    <span className="avatar" style={style} title={name}>
      {initials(name)}
    </span>
  )
}

export function LangToggle() {
  const { lang, setLang } = useLang()
  const other: Lang = lang === 'kk' ? 'ru' : 'kk'
  return (
    <button type="button" className="lang-toggle" onClick={() => setLang(other)} aria-label="language">
      {other === 'kk' ? 'ҚАЗ' : 'РУС'}
    </button>
  )
}
