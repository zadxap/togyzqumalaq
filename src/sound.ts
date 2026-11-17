/** Синтезированные звуки через Web Audio — без аудио-файлов. */

let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export const soundOn = (): boolean => localStorage.getItem('togyzqumalaq.sound') !== 'off'
export const setSoundOn = (v: boolean): void => {
  localStorage.setItem('togyzqumalaq.sound', v ? 'on' : 'off')
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
  if (!soundOn()) return
  try {
    const c = ac()
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.value = freq
    const t = c.currentTime + delay
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
  } catch {
    /* аудио недоступно — молча */
  }
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export type Sfx = 'drop' | 'capture' | 'tuzdyk' | 'win' | 'lose' | 'click'

export function sfx(kind: Sfx): void {
  switch (kind) {
    case 'drop':
      beep(rnd(440, 560), 0.05, 'triangle', 0.045)
      break
    case 'click':
      beep(320, 0.05, 'triangle', 0.04)
      break
    case 'capture':
      beep(200, 0.16, 'square', 0.05)
      beep(300, 0.12, 'square', 0.035, 0.07)
      break
    case 'tuzdyk':
      beep(392, 0.12, 'triangle', 0.06)
      beep(523, 0.12, 'triangle', 0.06, 0.1)
      beep(659, 0.18, 'triangle', 0.06, 0.2)
      break
    case 'win':
      ;[523, 659, 784, 1046].forEach((f, i) => beep(f, 0.22, 'triangle', 0.07, i * 0.13))
      break
    case 'lose':
      ;[400, 330, 262].forEach((f, i) => beep(f, 0.2, 'sine', 0.06, i * 0.14))
      break
  }
}
