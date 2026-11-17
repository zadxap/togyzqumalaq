import { supabase } from './supabase'
import type { Position } from './game/engine'

const sb = supabase!

export interface MatchRow {
  id: string
  status: 'waiting' | 'playing' | 'finished'
  player0: string
  player1: string | null
  position: Position
  outcome: 'p0' | 'p1' | 'draw' | null
  move_count: number
  last_move: number | null
  code: string | null
  meta: { eloAfter0?: number; eloAfter1?: number } | null
  created_at: string
  updated_at: string
  p0?: { display_name: string; elo: number }
  p1?: { display_name: string; elo: number } | null
}

export const MATCH_SELECT =
  'id, status, player0, player1, position, outcome, move_count, last_move, code, meta, created_at, updated_at,' +
  'p0:profiles!matches_player0_fkey (display_name, elo),' +
  'p1:profiles!matches_player1_fkey (display_name, elo)'

const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXYZ234679'
const genCode = (): string =>
  Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join('')

export async function createMatch(userId: string, position: Position): Promise<MatchRow> {
  // короткий код комнаты: до 6 попыток на коллизию (23505)
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await sb
      .from('matches')
      .insert({ status: 'waiting', player0: userId, position, move_count: 0, code: genCode() })
      .select(MATCH_SELECT)
      .single()
    if (!error) return data as unknown as MatchRow
    if ((error as { code?: string }).code !== '23505') throw error
  }
  throw new Error('не удалось сгенерировать код комнаты')
}

export async function fetchByCode(code: string): Promise<MatchRow | null> {
  const { data } = await sb
    .from('matches')
    .select(MATCH_SELECT)
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()
  return (data as unknown as MatchRow) ?? null
}

export async function joinMatch(id: string, userId: string): Promise<MatchRow> {
  const { data, error } = await sb
    .from('matches')
    .update({ player1: userId, status: 'playing' })
    .eq('id', id)
    .eq('status', 'waiting')
    .is('player1', null)
    .select(MATCH_SELECT)
    .single()
  if (error) throw error
  return data as unknown as MatchRow
}

export async function cancelMatch(id: string): Promise<void> {
  const { error } = await sb.from('matches').delete().eq('id', id).eq('status', 'waiting')
  if (error) throw error
}

export async function sendMove(
  id: string,
  position: Position,
  hole: number,
  moveCount: number,
): Promise<void> {
  const { error } = await sb
    .from('matches')
    .update({
      position,
      last_move: hole,
      move_count: moveCount,
    })
    .eq('id', id)
  if (error) throw error
}

/** финальный ход: позиция + статус finished + исход + Эло-итоги обеих сторон */
export async function sendFinish(
  id: string,
  position: Position,
  hole: number,
  moveCount: number,
  outcome: 'p0' | 'p1' | 'draw',
  meta?: { eloAfter0?: number; eloAfter1?: number },
): Promise<void> {
  const { error } = await sb
    .from('matches')
    .update({
      position,
      last_move: hole,
      move_count: moveCount,
      status: 'finished',
      outcome,
      ...(meta ? { meta } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function fetchMatch(id: string): Promise<MatchRow | null> {
  const { data } = await sb.from('matches').select(MATCH_SELECT).eq('id', id).single()
  return (data as unknown as MatchRow) ?? null
}

export async function fetchOpenMatches(): Promise<MatchRow[]> {
  const { data } = await sb
    .from('matches')
    .select(MATCH_SELECT)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(30)
  return (data as unknown as MatchRow[]) ?? []
}

export async function fetchLiveMatches(): Promise<MatchRow[]> {
  const { data } = await sb
    .from('matches')
    .select(MATCH_SELECT)
    .eq('status', 'playing')
    .order('updated_at', { ascending: false })
    .limit(30)
  return (data as unknown as MatchRow[]) ?? []
}

export async function fetchMyHistory(userId: string): Promise<MatchRow[]> {
  const { data } = await sb
    .from('matches')
    .select(MATCH_SELECT)
    .eq('status', 'finished')
    .or(`player0.eq.${userId},player1.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(50)
  return (data as unknown as MatchRow[]) ?? []
}

/** подписка на любые изменения матчей (лобби обновляется живьём) */
export function subscribeMatches(
  onChange: () => void,
): () => void {
  if (!sb) return () => {}
  const channel = sb
    .channel('lobby')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void sb.removeChannel(channel)
  }
}

/** подписка на один матч (board + зрители) */
export function subscribeMatch(
  id: string,
  onUpdate: (row: MatchRow) => void,
): () => void {
  if (!sb) return () => {}
  const channel = sb
    .channel(`match-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
      (payload) => onUpdate(payload.new as MatchRow),
    )
    .subscribe()
  return () => {
    void sb.removeChannel(channel)
  }
}

/** presence: считаем участников канала матча (зрители + игроки) */
export function joinMatchPresence(
  id: string,
  userId: string,
  onCount: (n: number) => void,
): () => void {
  if (!sb) return () => {}
  const channel = sb.channel(`presence-${id}`, { config: { presence: { key: userId } } })
  channel
    .on('presence', { event: 'sync' }, () => {
      onCount(Object.keys(channel.presenceState()).length)
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() })
    })
  return () => {
    void sb.removeChannel(channel)
  }
}

/* ── рейтинг Эло ── */

const K = 32

export function expectedScore(mine: number, theirs: number): number {
  return 1 / (1 + 10 ** ((theirs - mine) / 400))
}

export function newElo(mine: number, theirs: number, score: 0 | 0.5 | 1): number {
  return Math.round(mine + K * (score - expectedScore(mine, theirs)))
}

export async function applyResultToProfile(
  userId: string,
  myElo: number,
  oppElo: number,
  result: 0 | 0.5 | 1,
): Promise<void> {
  const { data } = await sb
    .from('profiles')
    .select('wins, losses, draws')
    .eq('id', userId)
    .single()
  const cur = (data as { wins: number; losses: number; draws: number } | null) ?? {
    wins: 0,
    losses: 0,
    draws: 0,
  }
  const { error } = await sb
    .from('profiles')
    .update({
      elo: newElo(myElo, oppElo, result),
      wins: cur.wins + (result === 1 ? 1 : 0),
      losses: cur.losses + (result === 0 ? 1 : 0),
      draws: cur.draws + (result === 0.5 ? 1 : 0),
    })
    .eq('id', userId)
  if (error) throw error
}
