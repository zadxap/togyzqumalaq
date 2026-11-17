import { useEffect, useRef } from 'react'

const COLORS = ['#BF4E24', '#C99A2E', '#F3EDE2', '#0E7C7B', '#8A4B5C']

/** Конфетти на победу: лёгкий canvas-оверлей, само убирается */
export function Confetti({ run }: { run: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!run) return
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    c.width = innerWidth
    c.height = innerHeight

    const parts = Array.from({ length: 110 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.4,
      vx: (Math.random() - 0.5) * 2.6,
      vy: 2 + Math.random() * 3.2,
      s: 4 + Math.random() * 6,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.3,
    }))

    let raf = 0
    const t0 = performance.now()
    const loop = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.col
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        ctx.restore()
      }
      if (t - t0 < 2400) raf = requestAnimationFrame(loop)
      else ctx.clearRect(0, 0, c.width, c.height)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [run])

  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}
