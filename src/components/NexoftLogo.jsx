// Nexoft brand logo — hexagonal symbol with internal spokes and yellow accent dot
// Manual de Marca v1.0 · 2026
export function NexoftMark({ size = 28, color = 'currentColor', dotColor = '#FFD100' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* Hexagon outline */}
      <polygon
        points="32,4 56,18 56,46 32,60 8,46 8,18"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Internal spokes radiating from center */}
      <g stroke={color} strokeWidth="2.4" strokeLinecap="round">
        <line x1="32" y1="32" x2="32" y2="10" />
        <line x1="32" y1="32" x2="48" y2="18" />
        <line x1="32" y1="32" x2="54" y2="32" />
        <line x1="32" y1="32" x2="48" y2="46" />
        <line x1="32" y1="32" x2="32" y2="54" />
        <line x1="32" y1="32" x2="16" y2="46" />
        <line x1="32" y1="32" x2="10" y2="32" />
        <line x1="32" y1="32" x2="16" y2="18" />
      </g>
      {/* Yellow accent dot — diferencial de marca */}
      <circle cx="40" cy="27" r="3.6" fill={dotColor} />
    </svg>
  )
}

export function NexoftWordmark({ size = 'md', tone = 'light' }) {
  // tone: 'light' (white text for dark bg), 'dark' (dark text for light bg), 'brand' (brand blue)
  const colors = {
    light: { text: '#FFFFFF', icon: '#FFFFFF' },
    dark: { text: '#0C0D1A', icon: '#0C0D1A' },
    brand: { text: '#1A1FBE', icon: '#1A1FBE' },
  }[tone] || { text: '#FFFFFF', icon: '#FFFFFF' }

  const sizes = {
    sm: { mark: 22, font: '0.95rem' },
    md: { mark: 28, font: '1.4rem' },
    lg: { mark: 44, font: '2.2rem' },
    xl: { mark: 72, font: '4.5rem' },
  }[size] || { mark: 28, font: '1.4rem' }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: colors.text,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontSize: sizes.font,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        Nexoft
      </span>
    </div>
  )
}
