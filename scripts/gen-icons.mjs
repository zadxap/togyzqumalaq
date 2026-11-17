/**
 * Генератор PWA-иконок «Тоғызқұмалақ» на чистом Node (без canvas).
 * Тёмное дерево + фишки-кумалаки, одна — терракотовая.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'icons')

const DARK = [42, 29, 18]
const CREAM = [243, 237, 226]
const TERRA = [191, 78, 36]

/* ── PNG ── */
const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ── геометрия ── */
function insideRounded(x, y, size, r) {
  if (x < 0 || y < 0 || x >= size || y >= size) return false
  const min = r
  const max = size - r
  if (x >= min && x <= max) return true
  if (y >= min && y <= max) return true
  const dx = x < min ? x - min : x - max
  const dy = y < min ? y - min : y - max
  return dx * dx + dy * dy <= r * r
}
function insideCircle(x, y, cx, cy, r) {
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

const SS = 3

function render(size, { maskable = false } = {}) {
  const hi = size * SS
  const img = Buffer.alloc(hi * hi * 4)
  const s = hi / 88
  const radius = maskable ? 0 : 20 * s
  const zoom = maskable ? 0.78 : 1
  const cx = 44 * s
  const cy = 44 * s
  const P = (x, y) => [cx + (x * s - cx) * zoom, cy + (y * s - cy) * zoom]
  const beads = [
    [22, 30, CREAM],
    [44, 30, TERRA],
    [66, 30, CREAM],
    [22, 58, CREAM],
    [44, 58, TERRA],
    [66, 58, CREAM],
  ].map(([bx, by, col]) => {
    const [px, py] = P(bx, by)
    return { px, py, r: 7 * s * zoom, col }
  })

  for (let y = 0; y < hi; y++) {
    for (let x = 0; x < hi; x++) {
      if (!insideRounded(x + 0.5, y + 0.5, hi, radius)) continue
      let col = DARK
      for (const b of beads) {
        if (insideCircle(x + 0.5, y + 0.5, b.px, b.py, b.r)) {
          col = b.col
          break
        }
      }
      const i = (y * hi + x) * 4
      img[i] = col[0]
      img[i + 1] = col[1]
      img[i + 2] = col[2]
      img[i + 3] = 255
    }
  }

  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * hi + (x * SS + sx)) * 4
          const al = img[i + 3] / 255
          r += img[i] * al
          g += img[i + 1] * al
          b += img[i + 2] * al
          a += al
        }
      }
      const o = (y * size + x) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round((a / (SS * SS)) * 255)
    }
  }
  return encodePNG(size, size, out)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'icon-192.png'), render(192))
writeFileSync(join(OUT, 'icon-512.png'), render(512))
writeFileSync(join(OUT, 'icon-maskable-512.png'), render(512, { maskable: true }))
console.log('icons written to', OUT)
