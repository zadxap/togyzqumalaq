const AVATAR_COLORS = ['#BF4E24', '#0E7C7B', '#2C5F9E', '#8A4B5C', '#7C6A26', '#3F7D50', '#95501F', '#4E6E8E']

export interface Accent {
  main: string
  deep: string
}

export const ACCENTS: Accent[] = [
  { main: '#BF4E24', deep: '#9C3D1B' },
  { main: '#0E7C7B', deep: '#0B6362' },
  { main: '#2C5F9E', deep: '#22497B' },
  { main: '#8A4B5C', deep: '#6F3A49' },
]

export const CREAM = '#F3EDE2'

export function avatarColor(uid: string): string {
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}
