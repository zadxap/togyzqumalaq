/**
 * Движок Тоғызқұмалақ — чистые функции, без зависимостей.
 *
 * Правила (по официальным законам WTKF, сверено с kk.wikipedia,
 * mancala.fandom.com/wiki/Toguz_Kumalak и 9kumalakshkola.wordpress.com):
 *
 * - Доска: 18 лунок (отау) кольцом + 2 казана; старт: по 9 құмалақов в каждой
 *   лунке, казаны пусты. Всего 162.
 * - Цикл раздачи (против часовой): индексы 0..8 = лунки 1..9 стороны 0,
 *   индексы 9..17 = лунки 1..9 стороны 1, после 17 → 0.
 * - Ход: взять ВСЕ камни из своей не-туздык лунки; первый камень кладётся
 *   обратно в опустевшую лунку, далее по одному против часовой. Лунка с одним
 *   камнем: камень перекладывается в соседнюю лунку (лунка пустеет).
 * - Последний камень в лунке СОПЕРНИКА:
 *     • стало чётно → все камни лунки в мой казан;
 *     • стало ровно 3 → туздык (3 камня в казан, лунка «умирает»: всё, что
 *       падает в неё дальше, идёт владельцу туздыка).
 *   Ограничения туздыка: один за партию; нельзя на лунке №9 соперника;
 *   нельзя «одноимённую» лунку (зеркало существующего туздыка соперника).
 * - Казан ≥ 82 → немедленная победа.
 * - Атсырау: игрок, чья очередь, не может ходить (все его не-туздык лунки
 *   пусты) → соперник делает один дополнительный ход → если атсырау осталось,
 *   партия завершается: камни на доске идут владельцам своих сторон.
 *   Итог: больше камней — победа, 81:81 — ничья.
 */

export const HOLES_PER_SIDE = 9
export const TOTAL_HOLES = 18
export const WIN_KAZAN = 82

export type Side = 0 | 1
export const other = (s: Side): Side => (s === 0 ? 1 : 0)

/** Позиция — простой JSON-сериализуемый объект (для Supabase jsonb) */
export interface Position {
  holes: number[]
  kazan: [number, number]
  /** tuzdyk[i] = сторона-владелец лунки-туздыка, либо null */
  tuzdyk: (Side | null)[]
  turn: Side
  /** текущий ход — дополнительный (соперник в атсырау) */
  extraMove: boolean
  status: 'playing' | 'over'
}

export type Outcome =
  | { type: 'playing' }
  | { type: 'win'; winner: Side; reason: 'kazan' | 'depleted' }
  | { type: 'draw'; reason: 'depleted' }
  /** соперник в атсырау: turn остаётся у ходившего — дополнительный ход */
  | { type: 'atsyrau-extra'; stuck: Side }

export type StepKind = 'drop' | 'tuzdyk-drop' | 'capture' | 'tuzdyk-created'

export interface SowStep {
  /** куда упал камень (или лунка события) */
  hole: number
  kind: StepKind
  /** для capture — сколько захвачено */
  count?: number
}

export interface MoveResult {
  position: Position
  outcome: Outcome
  steps: SowStep[]
}

export class IllegalMoveError extends Error {}

export function sideOfHole(hole: number): Side {
  return (hole < HOLES_PER_SIDE ? 0 : 1) as Side
}

/** абсолютный индекс лунки: сторона s, номер 1..9 */
export function absHole(side: Side, holeNumber: number): number {
  return side * HOLES_PER_SIDE + (holeNumber - 1)
}

export function initialPosition(turn: Side = 0): Position {
  return {
    holes: Array(TOTAL_HOLES).fill(HOLES_PER_SIDE),
    kazan: [0, 0],
    tuzdyk: Array(TOTAL_HOLES).fill(null),
    turn,
    extraMove: false,
    status: 'playing',
  }
}

export function legalMoves(pos: Position, side: Side): number[] {
  if (pos.status !== 'playing') return []
  const out: number[] = []
  for (let k = 0; k < HOLES_PER_SIDE; k++) {
    const i = side * HOLES_PER_SIDE + k
    if (pos.tuzdyk[i] === null && pos.holes[i] > 0) out.push(i)
  }
  return out
}

/** есть ли у стороны хотя бы один ход */
function canMove(holes: number[], tuzdyk: (Side | null)[], side: Side): boolean {
  for (let k = 0; k < HOLES_PER_SIDE; k++) {
    const i = side * HOLES_PER_SIDE + k
    if (tuzdyk[i] === null && holes[i] > 0) return true
  }
  return false
}

function hasTuzdyk(tuzdyk: (Side | null)[], side: Side): boolean {
  return tuzdyk.some((t) => t === side)
}

/** лунка №9 соперника для стороны side (запрет туздыка) */
function opponentHole9(side: Side): number {
  return otherOf(side) * HOLES_PER_SIDE + HOLES_PER_SIDE - 1
}

function otherOf(side: Side): Side {
  return (side === 0 ? 1 : 0) as Side
}

/**
 * Зеркальный запрет: нельзя ставить туздык на лунку соперника с тем же
 * номером, что и существующий туздык соперника на моей стороне.
 */
function mirrorForbidden(tuzdyk: (Side | null)[], side: Side, last: number): boolean {
  const opp = otherOf(side)
  const myBase = side * HOLES_PER_SIDE
  const oppBase = opp * HOLES_PER_SIDE
  for (let k = 0; k < HOLES_PER_SIDE; k++) {
    const myIdx = myBase + k
    if (tuzdyk[myIdx] === opp) {
      // туздык соперника стоит на моей лунке номер k+1 → запрещённая
      // «одноимённая» лунка — номер k+1 на стороне соперника
      return oppBase + k === last
    }
  }
  return false
}

export function applyMove(pos: Position, hole: number): MoveResult {
  if (pos.status !== 'playing') throw new IllegalMoveError('партия уже завершена')
  const side = pos.turn
  if (sideOfHole(hole) !== side) throw new IllegalMoveError('чужая лунка')
  if (pos.tuzdyk[hole] !== null) throw new IllegalMoveError('лунка — туздык соперника')
  const count = pos.holes[hole]
  if (count <= 0) throw new IllegalMoveError('лунка пуста')

  const holes = pos.holes.slice()
  holes[hole] = 0 // камни сняты с лунки
  const tuzdyk = pos.tuzdyk.slice()
  const kazan: [number, number] = [pos.kazan[0], pos.kazan[1]]
  const steps: SowStep[] = []
  const opp = otherOf(side)

  const drop = (i: number): void => {
    const owner = tuzdyk[i]
    if (owner !== null) {
      kazan[owner] += 1
      steps.push({ hole: i, kind: 'tuzdyk-drop' })
    } else {
      holes[i] += 1
      steps.push({ hole: i, kind: 'drop' })
    }
  }

  // раздача
  let last: number
  if (count === 1) {
    last = (hole + 1) % TOTAL_HOLES
    drop(last)
  } else {
    let i = hole
    for (let k = 0; k < count; k++) {
      i = k === 0 ? hole : (i + 1) % TOTAL_HOLES
      drop(i)
    }
    last = i
  }

  // эффекты последнего камня — только на стороне соперника и не в туздыке
  if (sideOfHole(last) === opp && tuzdyk[last] === null) {
    if (holes[last] === 3) {
      const hole9 = opponentHole9(side)
      if (
        last !== hole9 &&
        !hasTuzdyk(tuzdyk, side) &&
        !mirrorForbidden(tuzdyk, side, last)
      ) {
        tuzdyk[last] = side
        kazan[side] += holes[last]
        holes[last] = 0
        steps.push({ hole: last, kind: 'tuzdyk-created', count: 3 })
      }
    } else if (holes[last] % 2 === 0) {
      kazan[side] += holes[last]
      steps.push({ hole: last, kind: 'capture', count: holes[last] })
      holes[last] = 0
    }
  }

  let outcome: Outcome = { type: 'playing' }
  let turn: Side = opp
  let extraMove = false

  // 1) немедленная победа по казану
  if (kazan[0] >= WIN_KAZAN || kazan[1] >= WIN_KAZAN) {
    const winner: Side = kazan[0] >= WIN_KAZAN ? 0 : 1
    return {
      position: { holes, kazan, tuzdyk, turn, extraMove, status: 'over' },
      outcome: { type: 'win', winner, reason: 'kazan' },
      steps,
    }
  }

  // 2) атсырау у следующего игрока
  if (!canMove(holes, tuzdyk, opp)) {
    if (pos.extraMove || !canMove(holes, tuzdyk, side)) {
      // это уже был дополнительный ход, либо ходившему тоже нечем:
      // атсырау финализируется — камни доски идут владельцам сторон
      for (let i = 0; i < TOTAL_HOLES; i++) {
        if (tuzdyk[i] === null && holes[i] > 0) {
          kazan[sideOfHole(i)] += holes[i]
          holes[i] = 0
        }
      }
      const [a, b] = kazan
      outcome =
        a > b
          ? { type: 'win', winner: 0, reason: 'depleted' }
          : b > a
            ? { type: 'win', winner: 1, reason: 'depleted' }
            : { type: 'draw', reason: 'depleted' }
      return {
        position: { holes, kazan, tuzdyk, turn: side, extraMove, status: 'over' },
        outcome,
        steps,
      }
    }
    // соперник в атсырау → ходивший делает дополнительный ход
    turn = side
    extraMove = true
    outcome = { type: 'atsyrau-extra', stuck: opp }
  }

  return {
    position: { holes, kazan, tuzdyk, turn, extraMove, status: 'playing' },
    outcome,
    steps,
  }
}
