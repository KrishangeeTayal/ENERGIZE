/*
 * ENERGIZE — navigation icons
 *
 * Line icons drawn on a 20×20 grid with a consistent 1.6 stroke, rendered at
 * 22px so they sit evenly beside the label text.
 */

type IconProps = {
  className?: string
}

function base(className?: string) {
  return {
    width: 22,
    height: 22,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    className,
  }
}

export function OverviewIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 4.5h14v11H3z" />
      <path d="M3 11.5h14" />
      <path d="M6.5 9l2.2-2.4 2 1.8 2.8-3" />
    </svg>
  )
}

export function PredictionIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 14.5l4.2-4.4 3 2.6L16 6.5" />
      <path d="M12.8 6.5H16v3.2" />
    </svg>
  )
}

export function InvestigateIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="8.8" cy="8.8" r="4.8" />
      <path d="M12.4 12.4L16.5 16.5" />
      <path d="M7 8.8h3.6" />
    </svg>
  )
}

export function TwinIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="8" cy="10" r="4.6" />
      <circle cx="12.2" cy="10" r="4.6" />
    </svg>
  )
}

export function OptimizeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 6.5h8M14 6.5h3" />
      <circle cx="12.5" cy="6.5" r="1.6" />
      <path d="M3 13.5h3M9 13.5h8" />
      <circle cx="7.5" cy="13.5" r="1.6" />
    </svg>
  )
}

export function ModelIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 16.5h13" />
      <rect x="4.5" y="10" width="2.8" height="6.5" rx="0.8" />
      <rect x="8.6" y="6.5" width="2.8" height="10" rx="0.8" />
      <rect x="12.7" y="3.5" width="2.8" height="13" rx="0.8" />
    </svg>
  )
}

export function LeafIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M16.5 3.5c0 7-4.2 10.5-9 10.5a4 4 0 0 1-.4-8c4.6-.4 7.7-2.4 9.4-2.5Z" />
      <path d="M3.5 16.5c1.4-3.4 3.6-5.7 6.4-7.4" />
    </svg>
  )
}
