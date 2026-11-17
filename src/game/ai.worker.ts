/// Web Worker: ИИ считает в отдельном потоке, UI не замирает.
import { bestMove, type AiOptions } from './ai'
import type { Position } from './engine'

self.onmessage = (e: MessageEvent<{ position: Position; opts?: AiOptions }>) => {
  const { position, opts } = e.data
  try {
    const move = bestMove(position, opts)
    ;(self as unknown as Worker).postMessage({ move })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ error: String(err) })
  }
}
