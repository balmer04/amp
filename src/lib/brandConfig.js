/**
 * BRAND CONFIG — Nexoft platform white-label
 * ───────────────────────────────────────────────────────────────────────
 * Centralized configuration for all brand-specific copy and identity.
 * To deploy this platform for a different distributor company, edit ONLY
 * this file (and src/index.css design tokens for colors if needed).
 *
 * Manual de Marca v1.0 · 2026
 */

export const BRAND = {
  // Brand identity
  name: 'Nexoft',
  tagline: 'Soluciones tecnológicas para distribuidoras',
  description:
    'Armamos y gestionamos soluciones tecnológicas para distribuidoras. Conectamos procesos, simplificamos operaciones y escalamos con el negocio.',

  // Page meta
  pageTitle: 'Nexoft — Portal Mayorista',

  // Panel labels
  adminPanelLabel: 'Panel operativo',
  clientPanelLabel: 'Portal mayorista',
  adminDashboardTitle: 'Panel operativo',

  // Demo credentials (only visible because login shows quick-access buttons)
  demo: {
    enabled: true, // set to false in production to hide quick-access buttons
    admin: { email: 'admin@demo.com', password: 'admin123' },
    client: { email: 'cliente@demo.com', password: 'cliente123' },
  },

  // Contact info (used in PDFs and emails)
  contact: {
    website: 'nexoft.com',
    email: 'hola@nexoft.com',
  },

  // Locale
  locale: 'es-AR',
  currency: 'ARS',
}

// Helper: read brand name with fallback
export const getBrandName = () => BRAND.name

// Helper: build login-error suggestion using demo credentials
export const getDemoLoginHint = () => {
  if (!BRAND.demo.enabled) return ''
  return `Probá con ${BRAND.demo.client.email} o ${BRAND.demo.admin.email}.`
}
