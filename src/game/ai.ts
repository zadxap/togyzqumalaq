/**
 * ИИ-противник: minimax с альфа-бета отсечением и итеративным углублением.
 * Не модель и не нейросеть — детерминированный поиск по дереву игры:
 * мгновенно, офлайн, бесплатно и всегда легальные ходы.
 */
import { applyMove, legalMoves, other, type Position, type Side } from './engine'

const WIN_SCORE = 100000

/** оценка позиции с точки зрения стороны me (в камнях-эквивалентах) */
export function evaluate(pos: Position, me: Side): number {
  const opp = other(me)
  let score = (pos.kazan[me] - pos.kazan[opp]) * 10
  for (let i = 0; i < 18; i++) {
    if (pos.tuzdyk[i] === me) score += 25
    if (pos.tuzdyk[i] === opp) score -= 25
  }
  // ресурсы на своей стороне — потенциальные ходы (небольшой вес)
  let mine = 0
  let theirs = 0
  for (let k = 0; k < 9; k++) {
    mine += pos.holes[me * 9 + k]
    theirs += pos.holes[opp * 9 + k]
  }
  score += (mine - theirs) * 0.2
  return score
}

function terminalScore(pos: Position, me: Side): number {
  if (pos.status !== 'over') return evaluate(pos, me)
  const opp = other(me)
  const [a, b] = pos.kazan
  if (a === b) return 0
  const winnerIsMe = a > b ? me === 0 : me === 1
  const margin = Math.abs(a - b)
  return winnerIsMe ? WIN_SCORE + margin : -WIN_SCORE - margin
}

function minimax(pos: Position, depth: number, alpha: number, beta: number, me: Side): number {
  if (pos.status === 'over') return terminalScore(pos, me)
  if (depth === 0) return evaluate(pos, me)

  const moves = legalMoves(pos, pos.turn)
  if (moves.length === 0) return terminalScore(pos, me)

  const maximizing = pos.turn === me
  let best = maximizing ? -Infinity : Infinity

  // упорядочивание: сначала ходы с мгновенной выгодой — усиливает отсечения
  const scored = moves
    .map((m) => {
      const child = applyMove(pos, m).position
      return { m, child, gain: child.kazan[pos.turn] - pos.kazan[pos.turn] }
    })
    .sort((x, y) => y.gain - x.gain)

  for (const { m, child } of scored) {
    const v = minimax(child, depth - 1, alpha, beta, me)
    if (maximizing) {
      if (v > best) best = v
      if (v > alpha) alpha = v
    } else {
      if (v < best) best = v
      if (v < beta) beta = v
    }
    if (beta <= alpha) break
  }
  return best
}

export interface AiOptions {
  /** глубина поиска: 2 — легко, 4 — средне, 7 — сильно */
  depth?: number
  /** бюджет времени, мс (итеративное углубление остановится по дедлайну) */
  timeMs?: number
}

export function bestMove(pos: Position, opts: AiOptions = {}): number {
  const maxDepth = opts.depth ?? 6
  const deadline = Date.now() + (opts.timeMs ?? 900)
  const me = pos.turn
  const moves = legalMoves(pos, me)
  if (moves.length === 0) throw new Error('нет легальных ходов')
  if (moves.length === 1) return moves[0]

  let best = moves[0]

  for (let depth = 1; depth <= maxDepth; depth++) {
    let bestScore = -Infinity
    let bestAtDepth = best
    let aborted = false

    for (const m of moves) {
      const { position: child } = applyMove(pos, m)
      const v = minimax(child, depth - 1, -Infinity, Infinity, me)
      if (v > bestScore) {
        bestScore = v
        bestAtDepth = m
      }
      if (Date.now() > deadline) {
        aborted = true
        break
      }
    }

    best = bestAtDepth
    if (aborted || bestScore >= WIN_SCORE) break
  }
  return best
}
