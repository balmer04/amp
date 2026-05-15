/**
 * Nexoft wordmark — Manual de Marca v1.0 · 2026
 *
 * Solo el wordmark de texto. (El símbolo hexagonal fue removido por
 * decisión de diseño; si en algún futuro se reactiva, está versionado
 * en el git history del repo.)
 */
import { BRAND } from '../lib/brandConfig'

export function NexoftWordmark({ size = 'md', tone = 'light' }) {
  const colors = {
    light: '#FFFFFF',
    dark: '#0C0D1A',
    brand: '#1A1FBE',
  }[tone] || '#FFFFFF'

  const fontSize = {
    sm: '0.95rem',
    md: '1.15rem',
    lg: '1.6rem',
    xl: '2.4rem',
  }[size] || '1.15rem'

  return (
    <span
      style={{
        display: 'inline-block',
        color: colors,
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.025em',
        lineHeight: 1,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {BRAND.name}
    </span>
  )
}
