export interface LogEntry {
  n: number
  /** сторона, сделавшая ход: 0 — нижняя, 1 — верхняя */
  mover: 0 | 1
  /** номер лунки 1..9 */
  hole: number
  note?: string
}

/** Журнал ходов: свежие сверху */
export function MoveLog({ entries, name0, name1 }: { entries: LogEntry[]; name0: string; name1: string }) {
  if (entries.length === 0) return null
  return (
    <div className="movelog">
      <h3 className="movelog-title">···</h3>
      <ul>
        {[...entries].reverse().slice(0, 12).map((e) => (
          <li key={e.n}>
            <span className={`log-dot ${e.mover === 0 ? 'd0' : 'd1'}`} />
            <b>{e.mover === 0 ? name0 : name1}</b>
            <span className="log-hole">отану {e.hole}</span>
            {e.note && <span className="log-note">{e.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
