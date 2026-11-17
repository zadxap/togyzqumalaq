import { describe, expect, it } from 'vitest'
import { bestMove, evaluate } from './ai'
import { applyMove, initialPosition, legalMoves, type Position, type Side } from './engine'

function mk(
  holes: number[],
  kazan: [number, number] = [0, 0],
  tuzdyk: Record<number, Side> = {},
  turn: Side = 0,
): Position {
  const tuz = Array(18).fill(null) as (Side | null)[]
  for (const [k, v] of Object.entries(tuzdyk)) tuz[Number(k)] = v
  return { holes, kazan, tuzdyk: tuz, turn, extraMove: false, status: 'playing' }
}

describe('оценка позиции', () => {
  it('казан решает: +10 камней = +100', () => {
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [10, 0])
    expect(evaluate(p, 0)).toBe(100)
    expect(evaluate(p, 1)).toBe(-100)
  })

  it('туздык даёт бонус ±25', () => {
    const p = mk(Array(18).fill(0), [0, 0], { 10: 0 })
    expect(evaluate(p, 0)).toBe(25)
    expect(evaluate(p, 1)).toBe(-25)
  })
})

describe('bestMove', () => {
  it('возвращает легальный ход', () => {
    const p = initialPosition()
    const m = bestMove(p, { depth: 4 })
    expect(legalMoves(p, p.turn)).toContain(m)
  })

  it('берёт доступный захват: чётный последний камень выгоднее', () => {
    // ход из лунки 8 двумя камнями: 8, 9(1→2 чётно → захват 2)
    // альтернативы выгоды не дают
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 9, 9, 9, 9, 9, 9, 9, 9])
    expect(bestMove(p, { depth: 2 })).toBe(8)
  })

  it('ставит туздык, когда это возможно', () => {
    // из лунки 8 тремя: 8, 9, 10(2→3 → туздык)
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 3, 9, 2, 9, 9, 9, 9, 9, 9, 9])
    expect(bestMove(p, { depth: 2 })).toBe(8)
  })

  it('ИИ уровня 4 обыгрывает случайного игрока в 5 партиях из 5', () => {
    let seed = 7
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    let aiWins = 0
    for (let game = 0; game < 5; game++) {
      let pos = initialPosition(0) // ИИ играет стороной 0 и ходит первым
      let guard = 0
      while (pos.status === 'playing' && guard++ < 400) {
        const moves = legalMoves(pos, pos.turn)
        const pick =
          pos.turn === 0
            ? bestMove(pos, { depth: 4, timeMs: 2000 })
            : moves[Math.floor(rnd() * moves.length)]
        pos = applyMove(pos, pick).position
      }
      if (pos.status === 'over' && pos.kazan[0] > pos.kazan[1]) aiWins++
    }
    expect(aiWins).toBe(5)
  }, 60000)
})
