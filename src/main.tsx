import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import './styles.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="placeholder">
      <div className="placeholder-mark" aria-hidden="true">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <rect width="88" height="88" rx="20" fill="#2A1D12" />
          {[22, 44, 66].map((x) =>
            [30, 58].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill={x === 44 && y === 30 ? '#BF4E24' : '#F3EDE2'} />
            )),
          )}
        </svg>
      </div>
      <h1>Тоғызқұмалақ</h1>
      <p>Движок готов · 26 тестов зелёные · UI в разработке</p>
    </main>
  </StrictMode>,
)
