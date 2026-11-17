import { useLang } from '../i18n'
import { Sheet } from './Sheet'

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  return (
    <Sheet open={open} onClose={onClose} title={t('rulesTitle')}>
      <p className="sheet-note rules-text">{t('rulesText')}</p>
    </Sheet>
  )
}
