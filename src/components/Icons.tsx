import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...props }: P, children: ReactNode, viewBox = '0 0 24 24') {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconBack = (p: P) => base(p, <><path d="M15 5l-7 7 7 7" /></>)
export const IconPlus = (p: P) => base(p, <><path d="M12 5v14M5 12h14" /></>)
export const IconEye = (p: P) =>
  base(p, <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>)
export const IconUser = (p: P) =>
  base(p, <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" /></>)
export const IconHistory = (p: P) =>
  base(p, <><path d="M4 12a8 8 0 1 1 2.3 5.7M4 12H2.5M4 12l3-3M4 12l3 3" /><path d="M12 8v4l2.5 1.5" /></>)
export const IconRobot = (p: P) =>
  base(p, <><rect x="5" y="8" width="14" height="10" rx="2.5" /><path d="M12 8V5M10 12v.5M14 12v.5M9.5 15.5h5M3 12h2M19 12h2" /><circle cx="12" cy="4" r="1" /></>)
export const IconSignOut = (p: P) =>
  base(p, <><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="M14 8l4 4-4 4M18 12H8.5" /></>)
export const IconTrophy = (p: P) =>
  base(p, <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 5H4v2a4 4 0 0 0 3 3.9M17 5h3v2a4 4 0 0 1-3 3.9" /><path d="M12 14v3M9 21h6M10 17.5h4" /></>)
export const IconCopy = (p: P) =>
  base(p, <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>)
export const IconCheck = (p: P) => base(p, <><path d="M5 12.5l4.5 4.5L19 7" /></>)
export const IconClose = (p: P) => base(p, <><path d="M6 6l12 12M18 6L6 18" /></>)

/** Логотип: тёмная доска с кумалаками */
export function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" aria-hidden="true">
      <rect width="88" height="88" rx="20" fill="#2A1D12" />
      {[22, 44, 66].map((x) =>
        [30, 58].map((y) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="7"
            fill={x === 44 ? '#BF4E24' : '#F3EDE2'}
          />
        )),
      )}
    </svg>
  )
}
