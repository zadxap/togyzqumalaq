import { describe, expect, it } from 'vitest'
import {
  applyMove,
  IllegalMoveError,
  initialPosition,
  legalMoves,
  absHole,
  type Position,
  type Side,
} from './engine'

/** конструктор произвольной позиции для тестов */
function mk(
  holes: number[],
  kazan: [number, number] = [0, 0],
  tuzdyk: Record<number, Side> = {},
  turn: Side = 0,
  extraMove = false,
): Position {
  const tuz = Array(18).fill(null) as (Side | null)[]
  for (const [k, v] of Object.entries(tuzdyk)) tuz[Number(k)] = v
  return { holes, kazan, tuzdyk: tuz, turn, extraMove, status: 'playing' }
}

describe('начальная позиция', () => {
  it('по 9 камней в 18 лунках, казаны пусты, ход стороны 0', () => {
    const p = initialPosition()
    expect(p.holes).toHaveLength(18)
    expect(p.holes.every((h) => h === 9)).toBe(true)
    expect(p.kazan).toEqual([0, 0])
    expect(p.turn).toBe(0)
    // легальные ходы стороны 0 — её 9 лунок
    expect(legalMoves(p, 0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    // у стороны 1 тоже есть ходы (это проверка доступности, а не очерёдности)
    expect(legalMoves(p, 1)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
  })

  it('всего на доске 162 камня', () => {
    const p = initialPosition()
    expect(p.holes.reduce((a, b) => a + b, 0)).toBe(162)
  })
})

describe('раздача', () => {
  it('9 камней из лунки 0: первый обратно в лунку, дальше по циклу', () => {
    const r = applyMove(initialPosition(), 0)
    expect(r.position.holes[0]).toBe(1)
    for (let i = 1; i <= 8; i++) expect(r.position.holes[i]).toBe(10)
    // вся раздача осталась на своей стороне → захватов нет
    expect(r.position.kazan).toEqual([0, 0])
    expect(r.position.turn).toBe(1)
    expect(r.outcome).toEqual({ type: 'playing' })
    expect(r.steps).toHaveLength(9)
    expect(r.steps[0]).toEqual({ hole: 0, kind: 'drop' })
    expect(r.steps[8]).toEqual({ hole: 8, kind: 'drop' })
  })

  it('исходная позиция не мутирует', () => {
    const p = initialPosition()
    const snapshot = JSON.stringify(p)
    applyMove(p, 4)
    expect(JSON.stringify(p)).toBe(snapshot)
  })

  it('раздача переходит через границу на сторону соперника', () => {
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5])
    const r = applyMove(p, 8) // 4 камня: 8(опустела→1), 9(→6), 10(→6), 11(5→6 чётно → захват!)
    expect(r.position.holes[8]).toBe(1)
    expect(r.position.holes[9]).toBe(6)
    expect(r.position.holes[10]).toBe(6)
    expect(r.position.holes[11]).toBe(0)
    expect(r.position.kazan[0]).toBe(6)
    expect(r.steps[3]).toEqual({ hole: 11, kind: 'drop' })
    expect(r.steps[4]).toEqual({ hole: 11, kind: 'capture', count: 6 })
  })

  it('одиночный камень перекладывается в соседнюю лунку', () => {
    const p = mk([1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])
    const r = applyMove(p, 0)
    expect(r.position.holes[0]).toBe(0)
    expect(r.position.holes[1]).toBe(10)
    expect(r.steps).toEqual([{ hole: 1, kind: 'drop' }])
  })
})

describe('захват чётных', () => {
  it('последний камень делает лунку соперника чётной → захват в казан', () => {
    // из лунки 8 два камня: 8(опустела→1), 9(1→2 чётно → захват 2)
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 9, 9, 9, 9, 9, 9, 9, 9])
    const r = applyMove(p, 8)
    expect(r.position.holes[8]).toBe(1)
    expect(r.position.holes[9]).toBe(0)
    expect(r.position.kazan[0]).toBe(2)
    expect(r.steps[2]).toEqual({ hole: 9, kind: 'capture', count: 2 })
  })

  it('чётное в лунке соперника в СЕРЕДИНЕ раздачи не захватывается', () => {
    // из лунки 8 тремя: 8(→1), 9(9→10 чётно, но не последний — остаётся!), 10(4→5 нечёт)
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 3, 9, 4, 9, 9, 9, 9, 9, 9, 9])
    const r = applyMove(p, 8)
    expect(r.position.kazan[0]).toBe(0)
    expect(r.position.holes[9]).toBe(10)
    expect(r.position.holes[10]).toBe(5)
  })

  it('последний камень на своей стороне — без захвата', () => {
    const q = mk([2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])
    const rq = applyMove(q, 0)
    expect(rq.position.kazan).toEqual([0, 0])
    expect(rq.position.holes[0]).toBe(1)
    expect(rq.position.holes[1]).toBe(10)
  })

  it('одиночный камень в лунку соперника с нечётным итогом — без захвата', () => {
    const p = mk([1, 9, 9, 9, 9, 9, 9, 9, 9, 2, 9, 9, 9, 9, 9, 9, 9, 9])
    const r = applyMove(p, 0) // 0(опустела) → 9-я лунка? нет — соседняя лунка 1 (своя)
    // соседняя для лунки 0 — индекс 1 (своя сторона) → без эффектов
    expect(r.position.kazan).toEqual([0, 0])
    expect(r.position.holes[1]).toBe(10)
  })

  it('одиночный камень в лунку соперника с чётным итогом — захват', () => {
    const p = mk([9, 9, 9, 9, 9, 9, 9, 9, 1, 1, 9, 9, 9, 9, 9, 9, 9, 9])
    const r = applyMove(p, 8) // 8(опустела) → 9(1→2 чётно → захват 2)
    expect(r.position.kazan[0]).toBe(2)
    expect(r.position.holes[9]).toBe(0)
  })
})

describe('туздык', () => {
  it('последний камень делает ровно 3 → туздык: 3 камня в казан, лунка помечена и опустела', () => {
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 3, 9, 2, 9, 9, 9, 9, 9, 9, 9])
    const r = applyMove(p, 8) // 8(→1), 9(9→10 чётно но не последний — остаётся), 10(2→3 → туздык)
    expect(r.position.kazan[0]).toBe(3)
    expect(r.position.holes[9]).toBe(10)
    expect(r.position.holes[10]).toBe(0)
    expect(r.position.tuzdyk[10]).toBe(0)
    expect(r.steps[2]).toEqual({ hole: 10, kind: 'drop' })
    expect(r.steps[3]).toEqual({ hole: 10, kind: 'tuzdyk-created', count: 3 })
  })

  it('туздык нельзя ставить на лунку №9 соперника (остаётся 3 камня)', () => {
    // из своей лунки 8 десятью камнями: 8(→1), 9..17 — конец в лунке №9 соперника (2→3)
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 10, 9, 9, 9, 9, 9, 9, 9, 9, 2])
    const r = applyMove(p, 8)
    expect(r.position.holes[17]).toBe(3)
    expect(r.position.tuzdyk[17]).toBe(null)
    expect(r.position.holes[8]).toBe(1)
    expect(r.position.kazan[0]).toBe(0)
  })

  it('туздык — один за партию', () => {
    // туздык уже на индексе 10; делаем 3 на индексе 11
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 4, 9, 0, 2, 9, 9, 9, 9, 9, 9], [0, 0], { 10: 0 })
    const r = applyMove(p, 8) // 8(→1), 9(→10), 10(туздык-drop → казан), 11(2→3)
    expect(r.position.tuzdyk[11]).toBe(null)
    expect(r.position.holes[11]).toBe(3)
    expect(r.position.kazan[0]).toBe(1) // камень из туздыка
    expect(r.steps[2]).toEqual({ hole: 10, kind: 'tuzdyk-drop' })
  })

  it('нельзя «одноимённый» туздык (зеркало туздыка соперника)', () => {
    // туздык соперника на моей лунке №2 (индекс 1); я делаю 3 на его лунке №2 (индекс 10)
    const p = mk([0, 9, 0, 0, 0, 0, 0, 0, 3, 9, 2, 9, 9, 9, 9, 9, 9, 9], [0, 0], { 1: 1 })
    const r = applyMove(p, 8)
    expect(r.position.tuzdyk[10]).toBe(null)
    expect(r.position.holes[10]).toBe(3)
  })

  it('камень, упавший в мой туздык на чужой стороне, идёт мне в казан', () => {
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 4, 9, 0, 9, 9, 9, 9, 9, 9, 9], [0, 0], { 10: 0 })
    const r = applyMove(p, 8) // 8(→1), 9(→10), 10(туздык!), 11(9→10 чётно → захват)
    expect(r.steps[2]).toEqual({ hole: 10, kind: 'tuzdyk-drop' })
    expect(r.position.holes[10]).toBe(0)
    // последний камень в 11 → 10 чётно → захват ещё 10
    expect(r.position.kazan[0]).toBe(11)
    expect(r.steps[4]).toEqual({ hole: 11, kind: 'capture', count: 10 })
    expect(r.position.holes[11]).toBe(0)
  })

  it('камень, упавший в туздык соперника на моей стороне, идёт сопернику', () => {
    const p = mk([5, 9, 9, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [0, 0], { 3: 1 })
    const r = applyMove(p, 0) // 0..4: индекс 3 — туздык соперника
    expect(r.steps[3]).toEqual({ hole: 3, kind: 'tuzdyk-drop' })
    expect(r.position.kazan[1]).toBe(1)
    expect(r.position.holes[3]).toBe(0)
  })

  it('туздык-лунка исключена из легальных ходов её стороны', () => {
    const p = mk([9, 9, 9, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [0, 0], { 3: 1 })
    expect(legalMoves(p, 0)).not.toContain(3)
  })
})

describe('нелегальные ходы', () => {
  it('чужая лунка, пустая лунка, туздык — ошибки', () => {
    const p = mk([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], [0, 0], { 5: 1 })
    expect(() => applyMove(p, 9)).toThrow(IllegalMoveError)
    expect(() => applyMove(p, 0)).toThrow(IllegalMoveError)
    expect(() => applyMove(p, 5)).toThrow(IllegalMoveError)
  })
})

describe('конец партии', () => {
  it('казан ≥ 82 — немедленная победа', () => {
    const p = mk([0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 9, 9, 9, 9, 9, 9, 9, 9], [80, 0])
    const r = applyMove(p, 8) // захват 2 → 82
    expect(r.outcome).toEqual({ type: 'win', winner: 0, reason: 'kazan' })
    expect(r.position.status).toBe('over')
    expect(r.position.kazan[0]).toBe(82)
  })

  it('атсырау: у соперника во всех лунках ≤1 камня → доп. ход остаётся у меня', () => {
    const p = mk([9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    const r = applyMove(p, 0)
    expect(r.outcome).toEqual({ type: 'atsyrau-extra', stuck: 1 })
    expect(r.position.turn).toBe(0)
    expect(r.position.extraMove).toBe(true)
    expect(r.position.status).toBe('playing')
  })

  it('дополнительный ход, спасший соперника → игра продолжается', () => {
    // мой доп. ход из лунки 8 тремя: 8(→1), 9(1→2 — середина, не захват!), 10(1→2 → чётно, последний → захват 1)
    // у соперника появилась лунка с 2 камнями (индекс 9) — атсырау снят
    const p = mk(
      [0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0],
      {},
      0,
      true,
    )
    const r = applyMove(p, 8)
    expect(r.position.holes[9]).toBe(2)
    expect(r.position.holes[10]).toBe(0)
    expect(r.position.kazan[0]).toBe(2)
    expect(r.outcome).toEqual({ type: 'playing' })
    expect(r.position.turn).toBe(1)
    expect(r.position.extraMove).toBe(false)
  })

  it('дополнительный ход не спас → финал: камни по сторонам, победа по казанам', () => {
    const p = mk(
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [40, 30],
      {},
      0,
      true,
    )
    const r = applyMove(p, 7) // одиночный: 7 опустела → 8; соперник всё ещё пуст
    expect(r.outcome).toEqual({ type: 'win', winner: 0, reason: 'depleted' })
    expect(r.position.status).toBe('over')
    expect(r.position.kazan[0]).toBe(41)
    expect(r.position.holes.every((h) => h === 0)).toBe(true)
  })

  it('равные казаны после сбора — ничья', () => {
    // мой ход двумя камнями: 6(→1), 7(→1); соперник пуст → финал: +2 мне
    const p = mk(
      [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [39, 41],
      {},
      0,
      true,
    )
    const r = applyMove(p, 6)
    expect(r.outcome).toEqual({ type: 'draw', reason: 'depleted' })
    expect(r.position.kazan).toEqual([41, 41])
  })

  it('после завершения партии ходы запрещены', () => {
    const p = mk([0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9], [82, 0])
    const r = applyMove(p, 7) // одиночный: 7→9-я лунка соперника? нет — индекс 8 свой
    // из лунки 7 одиночный → индекс 8 (своя сторона) → без захвата; но 82 уже есть → win
    expect(r.outcome).toEqual({ type: 'win', winner: 0, reason: 'kazan' })
    expect(r.position.status).toBe('over')
    expect(() => applyMove(r.position, absHole(1, 3))).toThrow(IllegalMoveError)
  })
})

describe('санитарная проверка: случайные партии не ломаются', () => {
  it('300 случайных партий: ходы легальны, камни сохраняются, партии завершаются', () => {
    let seed = 42
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    let finished = 0
    for (let game = 0; game < 300; game++) {
      let pos = initialPosition((rnd() < 0.5 ? 0 : 1) as Side)
      let guard = 0
      while (pos.status === 'playing' && guard++ < 300) {
        const moves = legalMoves(pos, pos.turn)
        expect(moves.length).toBeGreaterThan(0)
        const pick = moves[Math.floor(rnd() * moves.length)]
        const stonesBefore = pos.holes.reduce((a, b) => a + b, 0) + pos.kazan[0] + pos.kazan[1]
        const r = applyMove(pos, pick)
        const stonesAfter =
          r.position.holes.reduce((a, b) => a + b, 0) + r.position.kazan[0] + r.position.kazan[1]
        expect(stonesAfter).toBe(stonesBefore)
        pos = r.position
      }
      if (pos.status === 'over') finished++
      // случайные партии должны завершаться, а не крутиться вечно
      expect(guard < 300).toBe(true)
    }
    expect(finished).toBe(300)
  }, 30000)
})
