import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import ChatAdmin from '../components/ChatAdmin'
import { NexoftWordmark } from '../components/NexoftLogo'
import {
  ORDER_STATUS_OPTIONS,
  PRODUCT_BENEFIT_CATEGORIES,
  TIER_ORDER,
  buildOrderRows,
  calculatePointsFromTotal,
  formatCurrency,
  formatDate,
  formatDateTime,
  getTierBenefitConfig,
  getLoyaltyStatus,
  getTierByPoints,
  arToday,
  arDateOf,
  arStartOfDay,
} from '../lib/businessLogic'

const adminSections = [
  { id: 'dashboard', label: 'Inicio' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'facturacion', label: 'Facturación' },
  { id: 'promociones', label: 'Promociones' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'solicitudes', label: 'Solicitudes de acceso' },
  { id: 'cobranzas', label: 'Cobranzas' },
  { id: 'chats', label: 'Mensajes' },
  { id: 'stock', label: 'Productos y stock' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'ia', label: 'Asistente IA' },
  { id: 'fidelizacion', label: 'Fidelización' },
  { id: 'configuracion', label: 'Configuración' },
]

// ─── Permisos por sub-rol ────────────────────────────────────────────────────
// 'admin'    → todo
// 'vendedor' → operación comercial (ventas, clientes, cotizaciones, mensajes)
// 'deposito' → solo pedidos, stock y datos básicos de clientes (para despacho)
const ROL_SECTIONS = {
  admin: [
    'dashboard', 'pedidos', 'cotizaciones', 'facturacion', 'promociones',
    'clientes', 'solicitudes', 'cobranzas', 'chats', 'stock',
    'reportes', 'ia', 'fidelizacion', 'configuracion',
  ],
  vendedor: [
    'dashboard', 'pedidos', 'cotizaciones', 'promociones',
    'clientes', 'solicitudes', 'chats', 'stock',
  ],
  deposito: [
    'dashboard', 'pedidos', 'clientes', 'stock',
  ],
}

const ROL_LABELS = {
  admin:    { label: 'Administrador', color: '#1A1FBE', bg: '#e8eaff' },
  vendedor: { label: 'Vendedor',      color: '#059669', bg: '#dcfce7' },
  deposito: { label: 'Depósito',      color: '#d97706', bg: '#fef3c7' },
}

function getAllowedSections(rol) {
  return ROL_SECTIONS[rol] || ROL_SECTIONS.admin
}
function canSeeSection(rol, sectionId) {
  return getAllowedSections(rol).includes(sectionId)
}
const adminSectionGroups = [
  {
    title: 'Inicio',
    items: ['dashboard'],
  },
  {
    title: 'Ventas',
    items: ['pedidos', 'cotizaciones', 'facturacion', 'promociones'],
  },
  {
    title: 'Clientes',
    items: ['clientes', 'solicitudes', 'cobranzas', 'chats'],
  },
  {
    title: 'Catálogo',
    items: ['stock'],
  },
  {
    title: 'Inteligencia',
    items: ['reportes', 'ia'],
  },
  {
    title: 'Sistema',
    items: ['fidelizacion', 'configuracion'],
  },
]

function AdminSidebarIcon({ sectionId }) {
  switch (sectionId) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h6v14H5z" />
          <path d="M13 9h6v10h-6z" />
          <path d="M13 5h6v2h-6z" />
        </svg>
      )
    case 'clientes':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8.5" r="2.6" />
          <circle cx="16.5" cy="9.5" r="2.2" />
          <path d="M4.5 18c1.3-2.7 3.4-4 6-4s4.7 1.3 6 4" />
          <path d="M13.5 17c.7-1.6 2-2.5 3.9-2.5 1.1 0 2.1.3 3.1 1" />
        </svg>
      )
    case 'chats':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6.5h14v9H9.5L6 18v-2.5H5z" />
        </svg>
      )
    case 'ia':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 1.6 3.6L17 9l-3.4 1.4L12 14l-1.6-3.6L7 9l3.4-1.4z" />
          <path d="M18 15.5 19 18l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
        </svg>
      )
    case 'pedidos':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h9l3 4v11H5V4z" />
          <path d="M7 4v4h12" />
        </svg>
      )
    case 'stock':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 5 8l7 4 7-4-7-4z" />
          <path d="M5 8v8l7 4 7-4V8" />
        </svg>
      )
    case 'fidelizacion':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.2l5-.7z" />
        </svg>
      )
    case 'facturacion':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 2h12v20H6zM9 6h6M9 10h6M9 14h4" />
        </svg>
      )
    case 'configuracion':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="2.8" />
          <path d="M12 4v2.1M12 17.9V20M4 12h2.1M17.9 12H20M6.3 6.3l1.5 1.5M16.2 16.2l1.5 1.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5" />
        </svg>
      )
    case 'reportes':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" />
        </svg>
      )
    case 'cobranzas':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="1.5" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      )
    case 'promociones':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12 12 4l8 8-8 8z" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      )
    case 'cotizaciones':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4M10 12h6M10 16h4" />
        </svg>
      )
    case 'solicitudes':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
          <path d="M17 4l1.5 1.5L22 2" />
        </svg>
      )
    default:
      return null
  }
}

const CLIENT_STATUS_ORDER = ['Activo', 'Inactivo', 'Bloqueado']
const PRODUCT_IMPORT_HEADERS = [
  'CODIGO',
  'CODIGO_PRO',
  'DETALLE',
  'MARCA',
  'UNID',
  'UNI_MED',
  'REVENTA SIN IVA',
  'GENERAL CON IVA',
]
const STOCK_PAGE_SIZE = 50
let xlsxLoader = null

async function loadXLSX() {
  if (!xlsxLoader) {
    xlsxLoader = import('xlsx')
  }

  return xlsxLoader
}

function parseSpreadsheetNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value !== 'string') {
    return 0
  }

  const normalized = value.trim()

  if (!normalized) {
    return 0
  }

  const compact = normalized.replace(/\s+/g, '')
  const hasComma = compact.includes(',')
  const hasDot = compact.includes('.')

  if (hasComma && hasDot) {
    return Number(compact.replace(/\./g, '').replace(',', '.')) || 0
  }

  if (hasComma) {
    return Number(compact.replace(',', '.')) || 0
  }

  return Number(compact) || 0
}

function normalizeImportedProduct(rawProduct, rowNumber) {
  const sku = String(rawProduct?.sku ?? '').trim()
  const nombre = String(rawProduct?.nombre ?? '').trim()
  const precio = parseSpreadsheetNumber(rawProduct?.precio)

  if (!sku) {
    return { error: `Fila ${rowNumber}: falta el SKU del producto.` }
  }

  if (!nombre) {
    return { error: `Fila ${rowNumber}: falta el nombre o detalle del producto.` }
  }

  if (precio < 0) {
    return { error: `Fila ${rowNumber}: el precio no puede ser negativo.` }
  }

  return {
    product: {
      rowNumber,
      codigo: String(rawProduct?.codigo ?? '').trim(),
      sku,
      nombre,
      marca: String(rawProduct?.marca ?? '').trim(),
      unidad: parseSpreadsheetNumber(rawProduct?.unidad),
      unidadMedida: String(rawProduct?.unidadMedida ?? '').trim(),
      precio,
    },
  }
}

async function parseProductExcelFile(file) {
  const XLSX = await loadXLSX()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  const headerRow = rows[1] ?? []
  const normalizedHeaders = headerRow.map((value) => String(value).trim().toUpperCase())
  const expectedHeaders = PRODUCT_IMPORT_HEADERS.map((value) => value.toUpperCase())
  const hasValidHeaders = expectedHeaders.every(
    (header, index) => normalizedHeaders[index] === header,
  )

  if (!hasValidHeaders) {
    throw new Error('El Excel no tiene los encabezados esperados en la fila 2.')
  }

  const results = rows
    .slice(2)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row, index) =>
      normalizeImportedProduct(
        {
          codigo: row[0],
          sku: row[1],
          nombre: row[2],
          marca: row[3],
          unidad: row[4],
          unidadMedida: row[5],
          precio: row[6],
        },
        index + 3,
      ),
    )

  return {
    products: results.flatMap((entry) => (entry.product ? [entry.product] : [])),
    rowErrors: results.flatMap((entry) => (entry.error ? [entry.error] : [])),
  }
}

async function parseProductsJsonFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)

  if (!Array.isArray(parsed)) {
    throw new Error('El JSON debe contener un array de productos.')
  }

  const results = parsed.map((item, index) => normalizeImportedProduct(item, index + 1))

  return {
    products: results.flatMap((entry) => (entry.product ? [entry.product] : [])),
    rowErrors: results.flatMap((entry) => (entry.error ? [entry.error] : [])),
  }
}

function getTierClass(tier) {
  return tier
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function getClientLifetimePoints(client) {
  return Number(client?.lifetime_points ?? client?.points ?? 0)
}

function getAuthToken() {
  try {
    // Read from nexoft session (with backward-compat for legacy amp-reventa)
    const stored =
      localStorage.getItem('nexoft-session') ||
      localStorage.getItem('amp-reventa-session') ||
      '{}'
    const session = JSON.parse(stored)
    return session.token || null
  } catch {
    return null
  }
}

function FacturacionSection({ facturas, loading, loaded, filtroEstado, onFiltroEstadoChange, clients, onLoad, onAnular, onCreateFromOrder }) {
  useEffect(() => { onLoad() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = facturas.filter((f) => filtroEstado === 'todos' || f.estado === filtroEstado)
  const getClientName = (clientId) => clients.find((c) => c.id === clientId)?.businessName ?? `Cliente #${clientId}`

  const handlePrintFactura = (factura) => {
    const clientName = getClientName(factura.client_json_id)
    const items = Array.isArray(factura.items) ? factura.items : []
    const win = window.open('', '_blank', 'width=700,height=900')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Factura ${factura.tipo}${String(factura.numero).padStart(8, '0')}</title>
    <style>body{font-family:Arial,sans-serif;padding:2rem;color:#111}h1{font-size:1.5rem}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{border:1px solid #ccc;padding:0.5rem;text-align:left}th{background:#f5f5f5}.total{text-align:right;font-weight:bold;margin-top:1rem}.watermark{color:#aaa;font-size:0.75rem;margin-top:2rem;border-top:1px solid #eee;padding-top:1rem}</style>
    </head><body>
    <h1>Factura ${factura.tipo}${String(factura.numero).padStart(8, '0')}</h1>
    <p><strong>Fecha:</strong> ${new Date(factura.fecha).toLocaleDateString('es-AR')}</p>
    <p><strong>Cliente:</strong> ${clientName}</p>
    <p><strong>Estado:</strong> ${factura.estado}</p>
    <table><thead><tr><th>Producto</th><th>SKU</th><th>Cant.</th><th>Precio unit.</th><th>Total</th></tr></thead><tbody>
    ${items.map((item) => `<tr><td>${item.name || ''}</td><td>${item.sku || ''}</td><td>${item.qty || ''}</td><td>$${(item.unitPrice || 0).toLocaleString('es-AR')}</td><td>$${(item.totalValue || 0).toLocaleString('es-AR')}</td></tr>`).join('')}
    </tbody></table>
    <div class="total"><p>Subtotal: $${(factura.subtotal || 0).toLocaleString('es-AR')}</p><p>IVA: $${(factura.iva || 0).toLocaleString('es-AR')}</p><p>Total: $${(factura.total || 0).toLocaleString('es-AR')}</p></div>
    <div class="watermark">Documento interno — no válido como comprobante fiscal</div>
    </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div>
      <div className="admin-section-header admin-orders-header">
        <div className="admin-orders-filters">
          <label className="admin-status-filter">
            <select value={filtroEstado} onChange={(e) => onFiltroEstadoChange(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="emitida">Emitidas</option>
              <option value="anulada">Anuladas</option>
            </select>
          </label>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-empty-inline" style={{ padding: '2rem' }}>Cargando facturas...</div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 1rem' }}>
              <span>N° Factura</span>
              <span>Tipo</span>
              <span>Cliente</span>
              <span>Pedido</span>
              <span>Total</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {filtered.length > 0 ? filtered.map((f) => (
              <div key={f.id} className="admin-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 1rem', alignItems: 'center' }}>
                <strong>{f.tipo}{String(f.numero).padStart(8, '0')}</strong>
                <span className="admin-status-badge pendiente">{f.tipo}</span>
                <span>{getClientName(f.client_json_id)}</span>
                <span>{f.pedido_json_id || '—'}</span>
                <strong>{formatCurrency(f.total)}</strong>
                <span className={`admin-status-badge ${f.estado === 'emitida' ? 'aprobado' : 'cancelado'}`}>{f.estado}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button type="button" className="admin-action-btn neutral" onClick={() => handlePrintFactura(f)}>
                    Ver PDF
                  </button>
                  {f.estado === 'emitida' ? (
                    <button
                      type="button"
                      className="admin-action-btn cancel"
                      onClick={() => window.confirm('¿Anular esta factura?') && onAnular(f.id)}
                    >
                      Anular
                    </button>
                  ) : null}
                </div>
              </div>
            )) : (
              <div className="admin-empty-inline" style={{ padding: '2rem' }}>
                {loaded ? 'No hay facturas que coincidan con el filtro.' : 'Sin facturas emitidas aún.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getOrderStatusClass(status) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function getClientFlags(client) {
  const lastPurchaseDate = client.lastPurchase ? new Date(client.lastPurchase.createdAt) : null
  const daysWithoutPurchase = lastPurchaseDate
    ? Math.floor((Date.now() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    hasOverdueBalance: client.pendingBalance > 0 && client.status !== 'Activo',
    isBlocked: client.status === 'Bloqueado',
    isInactiveLongTime: daysWithoutPurchase === null || daysWithoutPurchase > 60,
    isCloseToNextTier:
      Boolean(client.loyaltyStatus.nextTier) && client.loyaltyStatus.pointsToNext <= 1000,
  }
}

function getNextClientStatus(status) {
  const currentIndex = CLIENT_STATUS_ORDER.indexOf(status)

  if (currentIndex === -1) {
    return CLIENT_STATUS_ORDER[0]
  }

  return CLIENT_STATUS_ORDER[(currentIndex + 1) % CLIENT_STATUS_ORDER.length]
}

function getAuditEntryMeta(message) {
  const normalized = message.toLowerCase()

  if (normalized.includes('gener') && normalized.includes('pedido')) {
    return { icon: '🟡', tone: 'warning' }
  }

  if (
    normalized.includes('aprob') ||
    normalized.includes('despach') ||
    normalized.includes('prepar')
  ) {
    return { icon: '🟢', tone: 'success' }
  }

  if (
    normalized.includes('cancel') ||
    normalized.includes('bloque') ||
    normalized.includes('elimin')
  ) {
    return { icon: '🔴', tone: 'danger' }
  }

  if (
    normalized.includes('edit') ||
    normalized.includes('actualiz') ||
    normalized.includes('modific') ||
    normalized.includes('ajust')
  ) {
    return { icon: '🔵', tone: 'info' }
  }

  if (normalized.includes('stock') || normalized.includes('critico') || normalized.includes('alerta')) {
    return { icon: '⚠️', tone: 'warning' }
  }

  return { icon: '🔵', tone: 'info' }
}

function getRelativeTimeLabel(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const minutes = Math.max(Math.floor(diffMs / (1000 * 60)), 0)

  if (minutes < 1) return 'hace instantes'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`

  const days = Math.floor(hours / 24)
  return `hace ${days} dia${days === 1 ? '' : 's'}`
}

function getAvailableOrderStatusOptions(status) {
  switch (status) {
    case 'Pendiente':
      return ['Pendiente', 'Aprobado', 'Cancelado']
    case 'Aprobado':
      return ['Aprobado', 'Preparando', 'Cancelado']
    case 'Preparando':
      return ['Preparando', 'Despachado', 'Cancelado']
    case 'Despachado':
      return ['Despachado']
    case 'Cancelado':
      return ['Cancelado']
    default:
      return [status]
  }
}

function summarizeOrderProducts(order, products) {
  const rows = buildOrderRows(order.items, products)
  const summary = rows
    .slice(0, 2)
    .map((row) => `${row.name} x${row.qty}`)
    .join(', ')

  return rows.length > 2 ? `${summary}...` : summary
}

function MetricCard({ title, value, detail, tone }) {
  return (
    <article className={`admin-metric-card ${tone}`}>
      <span className="admin-card-eyebrow">{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function HeroMetricCard({ title, value, detail, tone }) {
  return (
    <article className={`admin-hero-card ${tone}`}>
      <span className="admin-hero-card-label">{title}</span>
      <strong className="admin-hero-card-value">{value}</strong>
      <p className="admin-hero-card-detail">{detail}</p>
    </article>
  )
}

function SecondaryMetricCard({ title, value, detail, tone }) {
  return (
    <article className={`admin-secondary-card ${tone}`}>
      <div className="admin-secondary-card-text">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <p>{detail}</p>
    </article>
  )
}

function AdminAiSection() {
  return (
    <div className="aic-page-wrap">
      <ChatAdmin />
    </div>
  )
}

function AuditHistoryModal({ entries, page, onPageChange, onClose }) {
  if (!entries.length) {
    return null
  }

  const pageSize = 10
  const totalPages = Math.max(Math.ceil(entries.length / pageSize), 1)
  const safePage = Math.min(page, totalPages)
  const pageEntries = entries.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-history-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Historial completo"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Auditoria</span>
            <h3>Historial completo</h3>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="admin-card-stack">
          {pageEntries.map((entry) => {
            const meta = getAuditEntryMeta(entry.message)

            return (
              <div key={entry.id} className={`admin-alert-row rich ${meta.tone}`}>
                <div className="admin-alert-main">
                  <span className="admin-alert-icon" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <strong>{entry.message}</strong>
                </div>
                <span>{formatDateTime(entry.createdAt)}</span>
              </div>
            )
          })}
        </div>

        <div className="admin-modal-footer">
          <span>{`Pagina ${safePage} de ${totalPages}`}</span>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-action-btn neutral"
              onClick={() => onPageChange(Math.max(safePage - 1, 1))}
              disabled={safePage === 1}
            >
              Anterior
            </button>
            <button
              type="button"
              className="admin-action-btn neutral"
              onClick={() => onPageChange(Math.min(safePage + 1, totalPages))}
              disabled={safePage === totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SalesChartCard({ data }) {
  const width = 560
  const height = 220
  const chartTop = 16
  const chartHeight = 132
  const barWidth = 44
  const gap = 26
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <article className="admin-card">
      <div className="admin-section-header">
        <div>
          <span className="admin-card-eyebrow">Ventas</span>
          <h3>Ultimos 7 dias</h3>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="admin-sales-chart"
        role="img"
        aria-label="Grafico de ventas de los ultimos 7 dias"
      >
        <line x1="18" y1={chartTop + chartHeight} x2={width - 10} y2={chartTop + chartHeight} className="admin-chart-axis" />
        {data.map((item, index) => {
          const barHeight = Math.max((item.value / maxValue) * chartHeight, item.value > 0 ? 8 : 0)
          const x = 28 + index * (barWidth + gap)
          const y = chartTop + chartHeight - barHeight

          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="6"
                className="admin-chart-bar"
              />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="admin-chart-value">
                {item.value > 0 ? `${Math.round(item.value / 1000)}k` : '0'}
              </text>
              <text x={x + barWidth / 2} y={chartTop + chartHeight + 20} textAnchor="middle" className="admin-chart-label">
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>
    </article>
  )
}

function OrderStatusChartCard({ data }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <article className="admin-card">
      <div className="admin-section-header">
        <div>
          <span className="admin-card-eyebrow">Pedidos</span>
          <h3>Estado actual</h3>
        </div>
      </div>

      <div className="admin-status-chart">
        {data.map((item) => (
          <div key={item.label} className="admin-status-chart-row">
            <div className="admin-status-chart-head">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="admin-status-chart-track">
              <div
                className={`admin-status-chart-fill ${item.tone}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function TierBadge({ tier }) {
  return <span className={`tier-badge ${getTierClass(tier)}`}>{tier}</span>
}

function EditableNumberField({ value, onCommit, min = 0, suffix = '' }) {
  const [draftValue, setDraftValue] = useState(String(value))

  useEffect(() => {
    setDraftValue(String(value))
  }, [value])

  const commitValue = () => {
    const parsedValue = Math.max(Number(draftValue) || 0, min)
    setDraftValue(String(parsedValue))
    onCommit(parsedValue)
  }

  return (
    <div className="admin-inline-edit">
      <input
        type="number"
        min={min}
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
      />
      {suffix ? <span>{suffix}</span> : null}
    </div>
  )
}

function OrderActions({
  order,
  onApprove,
  onCancel,
  onChangeStatus,
  onOpenDetail,
}) {
  const isPending = order.status === 'Pendiente'
  const isApproved = order.status === 'Aprobado'
  const isPreparing = order.status === 'Preparando'

  return (
    <div className="admin-order-actions">
      <button type="button" className="admin-table-link" onClick={onOpenDetail}>
        Ver detalle
      </button>
      {isPending ? (
        <>
          <button
            type="button"
            className="admin-action-btn approve"
            onClick={onApprove}
          >
            Aprobar
          </button>
          <button
            type="button"
            className="admin-action-btn cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </>
      ) : null}
      {isApproved ? (
        <button
          type="button"
          className="admin-action-btn neutral"
          onClick={() => onChangeStatus('Preparando')}
        >
          Preparando
        </button>
      ) : null}
      {isPreparing ? (
        <button
          type="button"
          className="admin-action-btn neutral"
          onClick={() => onChangeStatus('Despachado')}
        >
          Despachar
        </button>
      ) : null}
    </div>
  )
}

function OrderDetailModal({
  order,
  client,
  products,
  onClose,
  adminNotes,
  onAdminNotesChange,
  onStatusChange,
  onPrintPackingSlip,
  onGenerateInvoice,
  onConfirmShip,
}) {
  if (!order) {
    return null
  }

  const rows = buildOrderRows(order.items, products)
  const safeClient = client ?? null
  const pointsEstimate = calculatePointsFromTotal(order.total)
  const grossSubtotal = rows.reduce((sum, row) => sum + row.totalValue, 0)
  const discount = Math.max(grossSubtotal - order.total, 0)
  const subtotal = Math.round((order.total / 1.21) * 100) / 100
  const tax = Math.max(order.total - subtotal, 0)
  const deliveryAddress =
    order.deliveryType === 'Retiro en sucursal'
      ? order.branch || 'Sucursal a confirmar'
      : safeClient?.address || 'Direccion a confirmar'
  const orderHistory = Array.isArray(order.history) ? order.history : []
  const availableStatuses = getAvailableOrderStatusOptions(order.status)
  const isClosedOrder = ['Despachado', 'Cancelado'].includes(order.status)
  const currentTier = safeClient?.tier ?? 'Sin nivel'

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-order-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del pedido ${order.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Detalle del pedido</span>
            <h3>{order.id}</h3>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="admin-order-detail-layout">
          <div className="admin-order-detail-main">
            <section className="admin-modal-section admin-order-hero-card">
              <div className="admin-order-hero">
                <div className="admin-order-hero-copy">
                  <span className="admin-card-eyebrow">Operacion activa</span>
                  <h4>{order.id}</h4>
                  <p>
                    Pedido generado el {formatDate(order.createdAt)} a las{' '}
                    {formatDateTime(order.createdAt).split(', ')[1] ?? formatDateTime(order.createdAt)}.
                  </p>
                </div>

                <div className="admin-order-hero-status">
                  <span className="admin-card-eyebrow">Estado actual</span>
                  <span className={`admin-status-badge admin-status-badge-large ${getOrderStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                  <select
                    value={order.status}
                    onChange={(event) => onStatusChange(event.target.value)}
                    aria-label="Cambiar estado del pedido"
                  >
                    {availableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-order-top-meta">
                <div>
                  <span>Fecha y hora</span>
                  <strong>{formatDateTime(order.createdAt)}</strong>
                </div>
                <div>
                  <span>Entrega</span>
                  <strong>{order.deliveryType}</strong>
                </div>
                <div>
                  <span>Puntos estimados</span>
                  <strong>+{pointsEstimate} pts</strong>
                </div>
                {order.dispatchedAt || order.deliveryNote ? (
                  <div>
                    <span>Despacho</span>
                    <strong>
                      {order.deliveryNote
                        ? `Remito ${order.deliveryNote}`
                        : order.dispatchedAt
                          ? formatDateTime(order.dispatchedAt)
                          : 'Sin registrar'}
                    </strong>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="admin-modal-section">
              <div className="admin-section-header">
                <div>
                  <span className="admin-card-eyebrow">Cliente</span>
                  <h4>Informacion comercial</h4>
                </div>
                <TierBadge tier={currentTier} />
              </div>

              <div className="admin-order-customer-grid">
                <div>
                  <span>Cliente</span>
                  <strong>{safeClient?.businessName ?? order.clientName}</strong>
                </div>
                <div>
                  <span>Telefono</span>
                  <strong>{safeClient?.phone ?? 'Sin dato'}</strong>
                </div>
                <div>
                  <span>Direccion de entrega</span>
                  <strong>{deliveryAddress}</strong>
                </div>
                <div>
                  <span>Condicion de pago</span>
                  <strong>{safeClient?.paymentTerms ?? 'Contado'}</strong>
                </div>
                <div>
                  <span>Nivel actual</span>
                  <strong>{currentTier}</strong>
                </div>
                <div>
                  <span>Puntos acumulados</span>
                  <strong>{getClientLifetimePoints(safeClient).toLocaleString('es-AR')} pts</strong>
                </div>
              </div>
            </section>

            <section className="admin-modal-section">
              <div className="admin-section-header">
                <div>
                  <span className="admin-card-eyebrow">Pedido</span>
                  <h4>Lista de productos</h4>
                </div>
              </div>

              <div className="admin-table admin-order-detail-table">
                <div className="admin-table-row admin-table-head admin-order-products-grid">
                  <span>Producto</span>
                  <span>SKU</span>
                  <span>Cantidad</span>
                  <span>Precio unitario</span>
                  <span>Total linea</span>
                </div>
                {rows.map((row) => (
                  <div key={row.productId} className="admin-table-row admin-order-products-grid">
                    <strong>{row.name}</strong>
                    <span>{row.sku}</span>
                    <span>x{row.qty}</span>
                    <span>{row.unitPrice}</span>
                    <strong>{formatCurrency(row.totalValue)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-modal-section">
              <div className="admin-order-summary-layout">
                <div className="admin-order-summary-card">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="admin-order-summary-card">
                  <span>IVA (21%)</span>
                  <strong>{formatCurrency(tax)}</strong>
                </div>
                <div className="admin-order-summary-card">
                  <span>Total final</span>
                  <strong>{formatCurrency(order.total)}</strong>
                </div>
                <div className="admin-order-summary-card accent">
                  <span>Puntos a otorgar</span>
                  <strong>+{pointsEstimate} pts</strong>
                </div>
              </div>

              {discount > 0 ? (
                <p className="admin-modal-copy">
                  Descuento aplicado sobre lista: {formatCurrency(discount)}.
                </p>
              ) : null}
            </section>

            <section className="admin-modal-section admin-order-two-column">
              <div>
                <span className="admin-card-eyebrow">Notas del cliente</span>
                <p className="admin-modal-copy">{order.notes || 'Sin notas del cliente.'}</p>
              </div>

              <div>
                <span className="admin-card-eyebrow">Notas internas</span>
                <textarea
                  rows="5"
                  value={adminNotes}
                  onChange={(event) => onAdminNotesChange(event.target.value)}
                />
              </div>
            </section>

            <section className="admin-modal-section">
              <div className="admin-order-detail-actions">
                <button
                  type="button"
                  className="admin-action-btn neutral"
                  onClick={onPrintPackingSlip}
                >
                  Imprimir packing slip
                </button>
                <button
                  type="button"
                  className="admin-action-btn neutral"
                  onClick={onGenerateInvoice}
                >
                  Generar factura
                </button>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={onConfirmShip}
                  disabled={isClosedOrder}
                >
                  {order.status === 'Despachado' ? 'Pedido despachado' : 'Confirmar y despachar'}
                </button>
              </div>
            </section>
          </div>

          <aside className="admin-order-detail-side">
            <section className="admin-modal-section admin-order-timeline-card">
              <div className="admin-section-header">
                <div>
                  <span className="admin-card-eyebrow">Auditoria</span>
                  <h4>Timeline del pedido</h4>
                </div>
              </div>

              <div className="admin-order-timeline">
                {orderHistory.length > 0 ? (
                  orderHistory.map((entry, index) => (
                    <div key={entry.id} className="admin-order-timeline-item">
                      <span className="admin-order-timeline-dot" aria-hidden="true" />
                      {index !== orderHistory.length - 1 ? (
                        <span className="admin-order-timeline-line" aria-hidden="true" />
                      ) : null}
                      <div className="admin-order-timeline-content">
                        <strong>{entry.action}</strong>
                        <span>{entry.actor}</span>
                        <small>{formatDateTime(entry.createdAt)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-chat-empty">Todavia no hay cambios registrados.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function ClientDetailModal({
  client,
  clientOrders,
  onOpenOrderDetail,
  onClose,
  onAddActivity,
  onDelete,
  session,
}) {
  const [activeTab, setActiveTab] = useState('info')
  const [activityType, setActivityType] = useState('Llamada')
  const [activityDescription, setActivityDescription] = useState('')
  const [ccMovimientos, setCcMovimientos] = useState([])
  const [ccSaldo, setCcSaldo] = useState(0)
  const [ccLoading, setCcLoading] = useState(false)
  const [ccForm, setCcForm] = useState({ tipo: 'pago', descripcion: '', monto: '' })
  const [ccSaving, setCcSaving] = useState(false)

  useEffect(() => {
    if (activeTab === 'cc' && client) {
      setCcLoading(true)
      const token = getAuthToken()
      fetch(`/api/admin/cuenta-corriente/${client.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setCcMovimientos(data.movimientos)
            setCcSaldo(data.saldo)
          }
        })
        .catch(() => {})
        .finally(() => setCcLoading(false))
    }
  }, [activeTab, client])

  const handleCcSave = () => {
    if (!ccForm.monto || isNaN(parseFloat(ccForm.monto))) return
    setCcSaving(true)
    const token = getAuthToken()
    // Para pago: monto negativo (reduce deuda). Para factura/ajuste: positivo.
    const montoFinal = ccForm.tipo === 'pago' || ccForm.tipo === 'nota_credito'
      ? -Math.abs(parseFloat(ccForm.monto))
      : Math.abs(parseFloat(ccForm.monto))
    fetch('/api/admin/cuenta-corriente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        client_json_id: client.id,
        tipo: ccForm.tipo,
        descripcion: ccForm.descripcion,
        monto: montoFinal,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setCcMovimientos((prev) => [data.movimiento, ...prev])
          setCcSaldo((prev) => prev + parseFloat(data.movimiento.monto))
          setCcForm({ tipo: 'pago', descripcion: '', monto: '' })
        }
      })
      .catch(() => {})
      .finally(() => setCcSaving(false))
  }

  if (!client) {
    return null
  }

  const safeClient = {
    altPhone: '',
    note: '',
    priceList: 'Sin asignar',
    paymentHistory: [],
    activityLog: [],
    points: 0,
    creditLimit: 0,
    pendingBalance: 0,
    specialDiscount: 0,
    paymentTerms: 'Contado',
    condicionIva: 'Monotributista',
    etiquetas: [],
    ...client,
  }
  const safeClientOrders = Array.isArray(clientOrders) ? clientOrders : []
  const loyalty = getLoyaltyStatus(getClientLifetimePoints(safeClient))
  const totalBilled = safeClientOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const orderCount = safeClientOrders.length
  const daysWithoutBuying = safeClient.lastPurchase
    ? Math.floor((Date.now() - new Date(safeClient.lastPurchase.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const creditDisponible = Math.max((Number(safeClient.creditLimit) || 0) - (Number(safeClient.pendingBalance) || 0), 0)

  const CLIENT_DETAIL_TABS = [
    { id: 'info', label: 'Información' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'cc', label: 'Cuenta corriente' },
    { id: 'puntos', label: 'Puntos' },
  ]

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-client-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${client.businessName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Cuenta comercial</span>
            <h3>{safeClient.businessName}</h3>
            <p className="admin-modal-copy">
              {safeClient.category} · CUIT {safeClient.taxId}
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="admin-client-profile-summary">
          <div className="admin-client-profile-pill">
            <span>Estado</span>
            <strong>{safeClient.status}</strong>
          </div>
          <div className="admin-client-profile-pill">
            <span>Nivel</span>
            <strong>{safeClient.tier}</strong>
          </div>
          <div className="admin-client-profile-pill">
            <span>Pedidos</span>
            <strong>{orderCount}</strong>
          </div>
          <div className="admin-client-profile-pill">
            <span>Facturado</span>
            <strong>{formatCurrency(totalBilled)}</strong>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="admin-client-tabs">
          {CLIENT_DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'admin-client-tab active' : 'admin-client-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: INFORMACIÓN */}
        {activeTab === 'info' ? (
          <div>
            <div className="admin-client-recap-banner">
              <strong>Resumen comercial</strong>
              <span>
                {daysWithoutBuying !== null
                  ? `${safeClient.businessName} lleva ${daysWithoutBuying} dias desde su ultima compra.`
                  : `${safeClient.businessName} aun no tiene compras registradas.`}
              </span>
              <div className="admin-client-recap-tags">
                {safeClient.pendingBalance > 0 ? <span>Saldo pendiente</span> : null}
                {daysWithoutBuying !== null && daysWithoutBuying > 60 ? <span>En riesgo</span> : null}
                {loyalty.nextTier ? (
                  <span>{`A ${loyalty.pointsToNext.toLocaleString('es-AR')} pts de ${loyalty.nextTier.name}`}</span>
                ) : (
                  <span>Nivel maximo</span>
                )}
              </div>
            </div>

            <div className="admin-client-modal-grid">
              <section className="admin-modal-section">
                <h4>Datos generales</h4>
                <div className="admin-client-info-grid">
                  <div><span>Nombre / Razon Social</span><strong>{safeClient.businessName}</strong></div>
                  <div><span>CUIT / DNI</span><strong>{safeClient.taxId}</strong></div>
                  <div><span>Condicion IVA</span><strong>{safeClient.condicionIva || 'Monotributista'}</strong></div>
                  <div><span>Telefono principal</span><strong>{safeClient.phone}</strong></div>
                  <div><span>Telefono alternativo</span><strong>{safeClient.altPhone || 'Sin dato'}</strong></div>
                  <div><span>Email</span><strong>{safeClient.email}</strong></div>
                  <div><span>Direccion</span><strong>{safeClient.address}</strong></div>
                  <div><span>Ciudad</span><strong>{safeClient.city}</strong></div>
                  <div><span>Provincia</span><strong>{safeClient.province}</strong></div>
                  <div><span>Tipo de cliente</span><strong>{safeClient.category}</strong></div>
                  <div><span>Estado</span><strong>{safeClient.status}</strong></div>
                  <div><span>Fecha de alta</span><strong>{formatDate(safeClient.createdAt)}</strong></div>
                </div>
                {safeClient.etiquetas && safeClient.etiquetas.length > 0 ? (
                  <div className="admin-client-notes-box">
                    <span>Segmentos / Etiquetas</span>
                    <div className="admin-client-docs-tags">
                      {safeClient.etiquetas.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </div>
                ) : null}
                <div className="admin-client-notes-box">
                  <span>Notas internas</span>
                  <p>{safeClient.note || 'Sin notas internas.'}</p>
                </div>
              </section>

              <section className="admin-modal-section">
                <h4>Datos comerciales</h4>
                <div className="admin-client-info-grid">
                  <div><span>Nivel actual</span><strong>{safeClient.tier}</strong></div>
                  <div><span>Puntos acumulados</span><strong>{getClientLifetimePoints(safeClient).toLocaleString('es-AR')} pts</strong></div>
                  <div><span>Limite de credito</span><strong>{formatCurrency(Number(safeClient.creditLimit) || 0)}</strong></div>
                  <div><span>Saldo pendiente</span><strong>{formatCurrency(Number(safeClient.pendingBalance) || 0)}</strong></div>
                  <div><span>Credito disponible</span><strong>{formatCurrency(creditDisponible)}</strong></div>
                  <div><span>Condicion de pago</span><strong>{safeClient.paymentTerms}</strong></div>
                  <div><span>Descuento especial</span><strong>{Number(safeClient.specialDiscount) || 0}%</strong></div>
                  <div><span>Lista de precios</span><strong>{safeClient.priceList}</strong></div>
                  <div><span>Sucursal habitual</span><strong>{safeClient.preferredBranch || 'Sin asignar'}</strong></div>
                  <div>
                    <span>Proximo nivel</span>
                    <strong>
                      {loyalty.nextTier
                        ? `${loyalty.pointsToNext.toLocaleString('es-AR')} pts para ${loyalty.nextTier.name}`
                        : 'Nivel maximo alcanzado'}
                    </strong>
                  </div>
                </div>
              </section>
            </div>

            <section className="admin-modal-section">
              <div className="admin-modal-header">
                <div><h4>Actividad y notas</h4></div>
              </div>
              <div className="admin-activity-form">
                <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                  <option value="Llamada">Llamada</option>
                  <option value="Reunion">Reunion</option>
                  <option value="Email">Email</option>
                  <option value="Nota">Nota</option>
                </select>
                <input
                  type="text"
                  value={activityDescription}
                  onChange={(event) => setActivityDescription(event.target.value)}
                  placeholder="Agregar nueva actividad..."
                />
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => {
                    if (!activityDescription.trim()) return
                    onAddActivity({
                      type: activityType,
                      date: new Date().toISOString(),
                      description: activityDescription.trim(),
                    })
                    setActivityDescription('')
                    setActivityType('Llamada')
                  }}
                >
                  Agregar
                </button>
              </div>
              <div className="admin-activity-timeline">
                {safeClient.activityLog.map((activity) => (
                  <div key={activity.id} className="admin-activity-item">
                    <div>
                      <strong>{activity.type}</strong>
                      <span>{formatDate(activity.date)} - {activity.user}</span>
                    </div>
                    <p>{activity.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-modal-section admin-danger-zone">
              <div className="admin-danger-copy">
                <h4>Eliminar cliente</h4>
                <p>Esta accion elimina la cuenta del CRM.</p>
              </div>
              <button type="button" className="admin-action-btn cancel" onClick={onDelete}>
                Eliminar cliente
              </button>
            </section>
          </div>
        ) : null}

        {/* TAB: PEDIDOS */}
        {activeTab === 'pedidos' ? (
          <div>
            <section className="admin-modal-section">
              <h4>Historial de pedidos</h4>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head admin-client-orders-grid">
                  <span>N° Pedido</span>
                  <span>Fecha</span>
                  <span>Total</span>
                  <span>Estado</span>
                  <span>Accion</span>
                </div>
                {safeClientOrders.length > 0 ? safeClientOrders.map((order) => (
                  <div key={order.id} className="admin-table-row admin-client-orders-grid">
                    <strong>{order.id}</strong>
                    <span>{formatDate(order.createdAt)}</span>
                    <strong>{formatCurrency(order.total)}</strong>
                    <span className={`admin-status-badge ${getOrderStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                    <button type="button" className="admin-table-link" onClick={() => onOpenOrderDetail(order.id)}>
                      Ver detalle
                    </button>
                  </div>
                )) : <div className="admin-empty-inline">Todavia no hay pedidos registrados para este cliente.</div>}
              </div>
            </section>

            <section className="admin-modal-section">
              <h4>Historial de pagos</h4>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head admin-payments-grid">
                  <span>Fecha</span>
                  <span>Monto</span>
                  <span>Medio</span>
                  <span>Referencia</span>
                  <span>Registrado por</span>
                </div>
                {safeClient.paymentHistory.length > 0 ? safeClient.paymentHistory.map((payment) => (
                  <div key={payment.id} className="admin-table-row admin-payments-grid">
                    <span>{formatDate(payment.date)}</span>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <span>{payment.method}</span>
                    <span>{payment.reference}</span>
                    <span>{payment.registeredBy}</span>
                  </div>
                )) : <div className="admin-empty-inline">No hay pagos cargados todavia.</div>}
              </div>
            </section>
          </div>
        ) : null}

        {/* TAB: CUENTA CORRIENTE */}
        {activeTab === 'cc' ? (
          <div>
            <div className="admin-client-profile-summary" style={{ marginBottom: '1rem' }}>
              <div className="admin-client-profile-pill">
                <span>Saldo CC</span>
                <strong style={{ color: ccSaldo > 0 ? '#e53e3e' : '#38a169' }}>
                  {formatCurrency(Math.abs(ccSaldo))} {ccSaldo > 0 ? '(deuda)' : ccSaldo < 0 ? '(a favor)' : ''}
                </strong>
              </div>
              <div className="admin-client-profile-pill">
                <span>Limite de credito</span>
                <strong>{formatCurrency(Number(safeClient.creditLimit) || 0)}</strong>
              </div>
              <div className="admin-client-profile-pill">
                <span>Credito disponible</span>
                <strong>{formatCurrency(creditDisponible)}</strong>
              </div>
            </div>

            <section className="admin-modal-section">
              <h4>Registrar movimiento</h4>
              <div className="admin-activity-form">
                <select value={ccForm.tipo} onChange={(e) => setCcForm((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="pago">Pago recibido</option>
                  <option value="factura">Factura emitida</option>
                  <option value="nota_credito">Nota de crédito</option>
                  <option value="ajuste">Ajuste</option>
                </select>
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={ccForm.descripcion}
                  onChange={(e) => setCcForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Monto ($)"
                  value={ccForm.monto}
                  onChange={(e) => setCcForm((f) => ({ ...f, monto: e.target.value }))}
                  min="0"
                  step="0.01"
                />
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={handleCcSave}
                  disabled={ccSaving || !ccForm.monto}
                >
                  {ccSaving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </section>

            <section className="admin-modal-section">
              <h4>Movimientos</h4>
              {ccLoading ? (
                <div className="admin-empty-inline">Cargando movimientos...</div>
              ) : (
                <div className="admin-table">
                  <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: '0.5rem' }}>
                    <span>Fecha</span>
                    <span>Tipo</span>
                    <span>Descripción</span>
                    <span>Monto</span>
                  </div>
                  {ccMovimientos.length > 0 ? ccMovimientos.map((mov) => (
                    <div key={mov.id} className="admin-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: '0.5rem' }}>
                      <span>{formatDate(mov.fecha)}</span>
                      <span className={`admin-status-badge ${mov.tipo === 'pago' || mov.tipo === 'nota_credito' ? 'aprobado' : 'pendiente'}`}>
                        {mov.tipo}
                      </span>
                      <span>{mov.descripcion || '—'}</span>
                      <strong style={{ color: parseFloat(mov.monto) < 0 ? '#38a169' : '#e53e3e' }}>
                        {parseFloat(mov.monto) < 0 ? '-' : '+'}{formatCurrency(Math.abs(parseFloat(mov.monto)))}
                      </strong>
                    </div>
                  )) : <div className="admin-empty-inline">Sin movimientos registrados.</div>}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* TAB: PUNTOS */}
        {activeTab === 'puntos' ? (
          <div>
            <div className="admin-client-profile-summary" style={{ marginBottom: '1rem' }}>
              <div className="admin-client-profile-pill">
                <span>Puntos acumulados</span>
                <strong>{getClientLifetimePoints(safeClient).toLocaleString('es-AR')}</strong>
              </div>
              <div className="admin-client-profile-pill">
                <span>Puntos disponibles</span>
                <strong>{(Number(safeClient.available_points) || 0).toLocaleString('es-AR')}</strong>
              </div>
              <div className="admin-client-profile-pill">
                <span>Nivel actual</span>
                <strong>{safeClient.tier}</strong>
              </div>
              <div className="admin-client-profile-pill">
                <span>Proximo nivel</span>
                <strong>{loyalty.nextTier ? loyalty.nextTier.name : 'Nivel máximo'}</strong>
              </div>
            </div>

            <section className="admin-modal-section">
              <h4>Progreso hacia el siguiente nivel</h4>
              {loyalty.nextTier ? (
                <div style={{ padding: '1rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <span>{safeClient.tier}</span>
                    <span>{loyalty.nextTier.name}</span>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      background: '#3b82f6',
                      height: '100%',
                      borderRadius: '9999px',
                      width: `${Math.min(100, 100 - (loyalty.pointsToNext / (loyalty.nextTier.threshold - (loyalty.currentTier?.threshold ?? 0))) * 100)}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Faltan {loyalty.pointsToNext.toLocaleString('es-AR')} pts para llegar a {loyalty.nextTier.name}
                  </p>
                </div>
              ) : (
                <p style={{ color: '#38a169', fontWeight: '600' }}>Nivel máximo alcanzado</p>
              )}
            </section>

            <section className="admin-modal-section">
              <h4>Historial de pedidos con puntos</h4>
              <div className="admin-table">
                <div className="admin-table-row admin-table-head admin-client-orders-grid">
                  <span>N° Pedido</span>
                  <span>Fecha</span>
                  <span>Total</span>
                  <span>Puntos otorgados</span>
                  <span>Estado</span>
                </div>
                {safeClientOrders.length > 0 ? safeClientOrders.map((order) => (
                  <div key={order.id} className="admin-table-row admin-client-orders-grid">
                    <strong>{order.id}</strong>
                    <span>{formatDate(order.createdAt)}</span>
                    <strong>{formatCurrency(order.total)}</strong>
                    <span>+{calculatePointsFromTotal(order.total)} pts</span>
                    <span className={`admin-status-badge ${getOrderStatusClass(order.status)}`}>{order.status}</span>
                  </div>
                )) : <div className="admin-empty-inline">Sin pedidos para calcular puntos.</div>}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function validateClientForm(values) {
  const nextErrors = {}
  const normalizedTaxId = values.taxId.replace(/\s+/g, '')
  const normalizedPhone = values.phone.replace(/[^\d]/g, '')

  if (!/^\d{2}-?\d{8}-?\d$/.test(normalizedTaxId)) {
    nextErrors.taxId = 'Ingresa un CUIT valido.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    nextErrors.email = 'Ingresa un email valido.'
  }

  if (normalizedPhone.length < 8) {
    nextErrors.phone = 'El telefono debe ser numerico y valido.'
  }

  if (!values.businessName.trim()) {
    nextErrors.businessName = 'La razon social es obligatoria.'
  }

  return nextErrors
}

function ClientFormModal({
  initialValues,
  onClose,
  onSave,
}) {
  const { session } = useAuth()
  const isNew = !initialValues?.id
  const [formValues, setFormValues] = useState(initialValues)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
    setApiError('')
    setPassword('')
  }, [initialValues])

  if (!initialValues || !formValues) {
    return null
  }

  const updateField = (key, value) => {
    setFormValues((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    const nextErrors = validateClientForm(formValues)
    if (isNew && password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.'
    }
    setErrors(nextErrors)
    setApiError('')

    if (Object.keys(nextErrors).length > 0) return

    const payload = {
      ...formValues,
      points: Number(formValues.points) || 0,
      creditLimit: Number(formValues.creditLimit) || 0,
      pendingBalance: Number(formValues.pendingBalance) || 0,
      specialDiscount: Number(formValues.specialDiscount) || 0,
    }

    // Alta nueva: crear cuenta de acceso + agregar al estado
    if (isNew) {
      setIsSaving(true)
      try {
        const res = await fetch('/api/admin/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.token}`,
          },
          body: JSON.stringify({ ...payload, password }),
        })
        const result = await res.json()
        if (!result.ok) {
          setApiError(result.message || 'No se pudo crear el cliente.')
          return
        }
        // El servidor ya sincronizó en app_state — solo actualizamos local
        onSave({ ...payload, id: result.userId })
      } catch {
        setApiError('Error de conexion con el servidor.')
      } finally {
        setIsSaving(false)
      }
      return
    }

    // Edicion: sin llamada extra al servidor (updateState lo persiste)
    onSave(payload)
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-client-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Formulario de cliente"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">{isNew ? 'Alta de cliente' : 'Editar cliente'}</span>
            <h3>{isNew ? 'Nueva cuenta de cliente' : formValues.businessName || 'Editar cliente'}</h3>
            {isNew ? (
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary, #666)' }}>
                Se creará un acceso al portal con el email y contraseña que indiques.
              </p>
            ) : null}
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cancelar
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-field">
            <span>Nombre / Razon Social</span>
            <input
              type="text"
              value={formValues.businessName}
              onChange={(event) => updateField('businessName', event.target.value)}
            />
            {errors.businessName ? <small>{errors.businessName}</small> : null}
          </label>

          <label className="admin-form-field">
            <span>Nombre de contacto</span>
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>CUIT / DNI</span>
            <input
              type="text"
              value={formValues.taxId}
              onChange={(event) => updateField('taxId', event.target.value)}
            />
            {errors.taxId ? <small>{errors.taxId}</small> : null}
          </label>

          <label className="admin-form-field">
            <span>Email</span>
            <input
              type="email"
              value={formValues.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
            {errors.email ? <small>{errors.email}</small> : null}
          </label>

          {isNew ? (
            <label className="admin-form-field">
              <span>Contraseña de acceso</span>
              <input
                type="password"
                value={password}
                placeholder="Mínimo 6 caracteres"
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password ? <small>{errors.password}</small> : null}
            </label>
          ) : null}

          <label className="admin-form-field">
            <span>Telefono principal</span>
            <input
              type="text"
              value={formValues.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
            {errors.phone ? <small>{errors.phone}</small> : null}
          </label>

          <label className="admin-form-field">
            <span>Telefono alternativo</span>
            <input
              type="text"
              value={formValues.altPhone}
              onChange={(event) => updateField('altPhone', event.target.value)}
            />
          </label>

          <label className="admin-form-field admin-form-field-full">
            <span>Direccion</span>
            <input
              type="text"
              value={formValues.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Ciudad</span>
            <input
              type="text"
              value={formValues.city}
              onChange={(event) => updateField('city', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Provincia</span>
            <input
              type="text"
              value={formValues.province}
              onChange={(event) => updateField('province', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Tipo de cliente</span>
            <select
              value={formValues.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              <option value="Ferreteria">Ferreteria</option>
              <option value="Pintureria">Pintureria</option>
              <option value="Constructora">Constructora</option>
              <option value="Particular">Particular</option>
            </select>
          </label>

          <label className="admin-form-field">
            <span>Estado</span>
            <select
              value={formValues.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
          </label>

          <label className="admin-form-field">
            <span>Puntos acumulados</span>
            <input
              type="number"
              value={formValues.points}
              onChange={(event) => updateField('points', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Limite de credito</span>
            <input
              type="number"
              value={formValues.creditLimit}
              onChange={(event) => updateField('creditLimit', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Saldo pendiente</span>
            <input
              type="number"
              value={formValues.pendingBalance}
              onChange={(event) => updateField('pendingBalance', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Condicion de pago</span>
            <select
              value={formValues.paymentTerms}
              onChange={(event) => updateField('paymentTerms', event.target.value)}
            >
              <option value="Contado">Contado</option>
              <option value="15 dias">15 dias</option>
              <option value="30 dias">30 dias</option>
              <option value="60 dias">60 dias</option>
            </select>
          </label>

          <label className="admin-form-field">
            <span>Descuento especial (%)</span>
            <input
              type="number"
              value={formValues.specialDiscount}
              onChange={(event) => updateField('specialDiscount', event.target.value)}
            />
          </label>

          <label className="admin-form-field">
            <span>Lista de precios</span>
            <input
              type="text"
              value={formValues.priceList}
              onChange={(event) => updateField('priceList', event.target.value)}
            />
          </label>

          <label className="admin-form-field admin-form-field-full">
            <span>Notas internas</span>
            <textarea
              rows="4"
              value={formValues.note}
              onChange={(event) => updateField('note', event.target.value)}
            />
          </label>
        </div>

        {apiError ? (
          <p style={{ color: 'var(--color-danger, #c0392b)', margin: '0 0 12px', fontSize: '0.875rem', padding: '0 4px' }}>
            {apiError}
          </p>
        ) : null}

        <div className="admin-modal-footer">
          <button type="button" className="admin-action-btn neutral" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="admin-primary-btn" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Creando cuenta…' : isNew ? 'Crear cliente' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentModal({ client, onClose, onSave }) {
  const [amount, setAmount] = useState(client ? String(client.pendingBalance || 0) : '0')
  const [method, setMethod] = useState('Transferencia')
  const [reference, setReference] = useState('')

  useEffect(() => {
    setAmount(client ? String(client.pendingBalance || 0) : '0')
    setMethod('Transferencia')
    setReference('')
  }, [client])

  if (!client) {
    return null
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-small-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Registrar pago de ${client.businessName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Registrar pago</span>
            <h3>{client.businessName}</h3>
            <p className="admin-modal-copy">
              Saldo pendiente actual: {formatCurrency(Number(client.pendingBalance) || 0)}
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cancelar
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-field">
            <span>Monto</span>
            <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>

          <label className="admin-form-field">
            <span>Medio de pago</span>
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cheque">Cheque</option>
            </select>
          </label>

          <label className="admin-form-field admin-form-field-full">
            <span>Referencia / Comprobante</span>
            <input type="text" value={reference} onChange={(event) => setReference(event.target.value)} />
          </label>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-action-btn neutral" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() =>
              onSave({
                date: new Date().toISOString(),
                amount: Number(amount) || 0,
                method,
                reference,
              })
            }
          >
            Guardar pago
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickNoteModal({ client, onClose, onSave }) {
  const [note, setNote] = useState('')

  useEffect(() => {
    setNote('')
  }, [client])

  if (!client) {
    return null
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-small-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Nota rápida para ${client.businessName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Nota rápida</span>
            <h3>{client.businessName}</h3>
            <p className="admin-modal-copy">
              Agregá un comentario interno para el seguimiento comercial del cliente.
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cancelar
          </button>
        </div>

        <label className="admin-form-field">
          <span>Nueva nota</span>
          <textarea rows="5" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>

        <div className="admin-modal-footer">
          <button type="button" className="admin-action-btn neutral" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => onSave(note)}
          >
            Agregar nota
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientAiModal({ client, clientOrders, products, onClose }) {
  const { session } = useAuth()
  const [aiRecommendation, setAiRecommendation] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (!client || !session?.token) return;
    
    setIsAnalyzing(true);
    fetch('/api/ai/analyze-client', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}` 
      },
      body: JSON.stringify({ clientId: client.id })
    })
    .then(r => r.json())
    .then(data => {
      if (data.ok) setAiRecommendation(data.recommendation);
      else setAiRecommendation('No se pudo generar el análisis automático.');
    })
    .catch(() => setAiRecommendation('Error de conexión con la IA.'))
    .finally(() => setIsAnalyzing(false));
  }, [client, session?.token]);

  if (!client) {
    return null
  }

  const totalSpent = clientOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const avgTicket =
    clientOrders.length > 0 ? Math.round(totalSpent / clientOrders.length) : 0
  const daysWithoutBuying = client.lastPurchase
    ? Math.floor((Date.now() - new Date(client.lastPurchase.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const categoryTotals = clientOrders.reduce((accumulator, order) => {
    order.items.forEach((item) => {
      const product =
        products.find((entry) => entry.id === item.productId || entry.sku === item.productId) ?? null
      const category = product?.category ?? 'General'
      accumulator[category] = (accumulator[category] ?? 0) + (Number(item.qty) || 0)
    })

    return accumulator
  }, {})

  const favoriteCategory =
    Object.entries(categoryTotals).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'General'

  const recommendation =
    daysWithoutBuying !== null && daysWithoutBuying > 60
      ? `Este cliente lleva ${daysWithoutBuying} dias sin comprar. Conviene contactarlo esta semana con una propuesta puntual en ${favoriteCategory.toLowerCase()}.`
      : client.pendingBalance > 0
        ? 'Tiene saldo pendiente. Antes de impulsar una nueva venta, conviene ordenar la cobranza y retomar el seguimiento.'
        : `Su categoria mas fuerte hoy es ${favoriteCategory.toLowerCase()}. Se puede empujar una recompra o una promo cruzada desde esa base.`

  const strongestWindow =
    favoriteCategory === 'Impermeabilizantes'
      ? 'otono'
      : favoriteCategory === 'Latex'
        ? 'temporadas de obra y repintado'
        : 'su ciclo comercial habitual'

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-client-ai-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Asistente IA</span>
            <h3>{client.businessName}</h3>
            <p className="admin-modal-copy">
              Lectura automatizada del cliente para seguimiento comercial.
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="admin-client-ai-grid">
          <div className="admin-client-ai-highlight">
            <h4>Análisis Comercial de IA</h4>
            {isAnalyzing ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.7 }}>
                <span className="typing-indicator" style={{ display: 'inline-flex', padding: 0 }}><span></span><span></span><span></span></span>
                <p style={{ margin: 0, fontStyle: 'italic' }}>Analizando facturación, pedidos y frecuencias de este cliente...</p>
              </div>
            ) : (
              <p>{aiRecommendation || recommendation}</p>
            )}
          </div>

          <div className="admin-client-ai-stats">
            <div>
              <span>Ultima compra</span>
              <strong>
                {client.lastPurchase ? formatDate(client.lastPurchase.createdAt) : 'Sin compras'}
              </strong>
            </div>
            <div>
              <span>Ticket promedio</span>
              <strong>{formatCurrency(avgTicket)}</strong>
            </div>
            <div>
              <span>Categoria mas comprada</span>
              <strong>{favoriteCategory}</strong>
            </div>
            <div>
              <span>Nivel actual</span>
              <strong>{client.tier}</strong>
            </div>
          </div>

          <div className="admin-client-ai-signals">
            <h4>Senales detectadas</h4>
            <div className="admin-client-ai-signal-list">
              {daysWithoutBuying !== null ? (
                <span>{`${daysWithoutBuying} dias sin comprar`}</span>
              ) : (
                <span>Sin compras registradas</span>
              )}
              <span>{`${clientOrders.length} pedidos historicos`}</span>
              <span>{`Ticket promedio ${formatCurrency(avgTicket)}`}</span>
              <span>{`Categoria clave: ${favoriteCategory}`}</span>
            </div>
          </div>

          <div className="admin-client-ai-notes">
            <h4>Proximas acciones sugeridas</h4>
            <ul>
              <li>Revisar su historial reciente antes del proximo contacto comercial.</li>
              <li>Ofrecer una accion puntual sobre {favoriteCategory.toLowerCase()}.</li>
              <li>Este cliente suele responder mejor en {strongestWindow}.</li>
              <li>Registrar en la ficha el resultado del contacto para que quede en el CRM.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function StockAdjustModal({ product, onClose, onAdjust }) {
  const [tipo, setTipo] = useState('ingreso')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  if (!product) return null

  const handleSubmit = () => {
    const n = parseInt(cantidad, 10)
    if (!n || n <= 0) return
    setSaving(true)
    const delta = tipo === 'egreso' ? -n : n
    onAdjust(product, delta, motivo.trim(), tipo)
    setSaving(false)
    onClose()
  }

  const stockMinimo = Number(product.stockMinimo) || 5
  const stockReservado = Number(product.stockReservado) || 0
  const stockDisponible = Math.max((Number(product.currentStock) || 0) - stockReservado, 0)
  const isLow = stockDisponible < stockMinimo

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{ maxWidth: '480px' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Control de stock</span>
            <h3>{product.name}</h3>
            <p className="admin-modal-copy">SKU: {product.sku}</p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>Cerrar</button>
        </div>

        <div className="admin-client-profile-summary" style={{ marginBottom: '1rem' }}>
          <div className="admin-client-profile-pill">
            <span>Stock actual</span>
            <strong>{product.currentStock ?? 0}</strong>
          </div>
          <div className="admin-client-profile-pill">
            <span>Reservado</span>
            <strong>{stockReservado}</strong>
          </div>
          <div className="admin-client-profile-pill">
            <span>Disponible</span>
            <strong style={{ color: isLow ? '#e53e3e' : undefined }}>{stockDisponible}</strong>
          </div>
          <div className="admin-client-profile-pill">
            <span>Mínimo</span>
            <strong>{stockMinimo}</strong>
          </div>
        </div>

        {isLow ? (
          <div className="admin-alert-row rich warning" style={{ marginBottom: '1rem' }}>
            <span className="admin-alert-icon">⚠️</span>
            <strong>Stock disponible por debajo del mínimo configurado</strong>
          </div>
        ) : null}

        <section className="admin-modal-section">
          <h4>Registrar movimiento</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="admin-form-field">
              <span>Tipo de movimiento</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="ingreso">Ingreso de mercadería</option>
                <option value="egreso">Egreso / Ajuste negativo</option>
                <option value="ajuste">Ajuste de inventario</option>
              </select>
            </label>
            <label className="admin-form-field">
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej: 50"
              />
            </label>
            <label className="admin-form-field">
              <span>Motivo (opcional)</span>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Compra a proveedor, ajuste de inventario..."
              />
            </label>
            <button
              type="button"
              className="admin-primary-btn"
              onClick={handleSubmit}
              disabled={saving || !cantidad || parseInt(cantidad, 10) <= 0}
            >
              {saving ? 'Guardando...' : 'Confirmar movimiento'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function ProductImportModal({ isOpen, onClose, existingProducts, onImport }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [importError, setImportError] = useState('')
  const [importNotice, setImportNotice] = useState('')
  const [parsedRowsCount, setParsedRowsCount] = useState(0)
  const [parsedProducts, setParsedProducts] = useState([])
  const [rowErrors, setRowErrors] = useState([])
  const [existingProductStrategy, setExistingProductStrategy] = useState('update-price')
  const [resetNewStock, setResetNewStock] = useState(true)
  const [importSuccess, setImportSuccess] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setIsDragOver(false)
      setSelectedFileName('')
      setIsParsingFile(false)
      setImportError('')
      setImportNotice('')
      setParsedRowsCount(0)
      setParsedProducts([])
      setRowErrors([])
      setExistingProductStrategy('update-price')
      setResetNewStock(true)
      setImportSuccess('')
      setProcessingProgress(0)
    }
  }, [isOpen])

  const importSummary = useMemo(() => {
    const existingSkus = new Set(
      existingProducts.map((product) => String(product.sku ?? '').trim().toUpperCase()),
    )

    const existingCount = parsedProducts.filter((product) =>
      existingSkus.has(String(product.sku ?? '').trim().toUpperCase()),
    ).length

    return {
      total: parsedProducts.length,
      existingCount,
      newCount: Math.max(parsedProducts.length - existingCount, 0),
      previewRows: parsedProducts.slice(0, 10),
    }
  }, [existingProducts, parsedProducts])

  if (!isOpen) {
    return null
  }

  const handleDownloadTemplate = () => {
    loadXLSX().then((XLSX) => {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['LISTA DE PRODUCTOS'],
        PRODUCT_IMPORT_HEADERS,
        ['AM-1001', '20600', 'ACONDICIONADOR FIJADOR X 1 L', 'SHERWIN OBRA', 1, 'LT', 6399.14, 0],
        ['AM-1002', '30550', 'LATEX INTERIOR BLANCO', 'ALBA', 20, 'LT', 18400, 0],
      ])

      worksheet['!cols'] = [
        { wch: 14 },
        { wch: 14 },
        { wch: 38 },
        { wch: 22 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
      ]

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla')
      XLSX.writeFile(workbook, 'plantilla-productos.xlsx')
    })
  }

  const handleFileSelection = async (file) => {
    if (!file) {
      return
    }

    setSelectedFileName(file.name)
    setIsDragOver(false)
    setImportError('')
    setImportNotice('')
    setParsedRowsCount(0)
    setParsedProducts([])
    setRowErrors([])
    setImportSuccess('')
    setProcessingProgress(0)

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!extension || !['xlsx', 'xls', 'json'].includes(extension)) {
      setImportError('Formato no valido. Usa un archivo .xlsx, .xls o .json.')
      return
    }

    try {
      setIsParsingFile(true)
      setProcessingProgress(18)
      const result =
        extension === 'json'
          ? await parseProductsJsonFile(file)
          : await parseProductExcelFile(file)
      setProcessingProgress(72)
      setParsedRowsCount(result.products.length)
      setParsedProducts(result.products)
      setRowErrors(result.rowErrors)
      setProcessingProgress(100)
      setImportNotice(
        extension === 'json'
          ? `JSON validado correctamente. Se detectaron ${result.products.length} productos validos.`
          : `Excel validado correctamente. Se detectaron ${result.products.length} productos validos.`,
      )
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'No se pudo interpretar el archivo seleccionado.',
      )
      setProcessingProgress(0)
    } finally {
      setIsParsingFile(false)
    }
  }

  const handleConfirmImport = () => {
    if (!parsedProducts.length) {
      return
    }

    onImport(parsedProducts, {
      fileName: selectedFileName,
      existingProductStrategy,
      resetNewStock,
    })
    setProcessingProgress(100)
    setImportSuccess(
      rowErrors.length > 0
        ? `Importacion completada. Se guardaron ${parsedProducts.length} productos y quedaron ${rowErrors.length} filas con error para revisar.`
        : `Importacion completada. Se guardaron ${parsedProducts.length} productos.`,
    )
    setImportNotice('')
    setTimeout(() => {
      onClose()
    }, 700)
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal-card admin-import-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Importar productos"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Importacion</span>
            <h3>Importar productos</h3>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <p className="admin-section-copy">
          Subi el archivo comercial para importar productos desde Excel o JSON, manteniendo la
          estructura del stock actual.
        </p>

        <div className="admin-import-toolbar">
          <button
            type="button"
            className="admin-action-btn neutral"
            onClick={handleDownloadTemplate}
          >
            Descargar plantilla Excel
          </button>
        </div>

        <div
          className={isDragOver ? 'admin-import-dropzone active' : 'admin-import-dropzone'}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            handleFileSelection(event.dataTransfer.files?.[0])
          }}
        >
          <strong>Arrastra tu archivo aca</strong>
          <span>o selecciona uno manualmente desde tu computadora</span>
          <span className="admin-import-file-types">Formatos admitidos: .xlsx, .xls, .json</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.json,application/json"
            className="admin-import-hidden-input"
            onChange={(event) => handleFileSelection(event.target.files?.[0])}
          />
          <button
            type="button"
            className="admin-action-btn neutral"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingFile}
          >
            {isParsingFile ? 'Procesando archivo...' : 'Seleccionar archivo'}
          </button>
          {selectedFileName ? (
            <span className="admin-import-selected-file">{selectedFileName}</span>
          ) : null}
        </div>

        {(isParsingFile || processingProgress > 0) && !importError ? (
          <div className="admin-import-progress">
            <div className="admin-import-progress-bar">
              <span style={{ width: `${processingProgress}%` }} />
            </div>
            <small>
              {isParsingFile
                ? `Procesando archivo... ${processingProgress}%`
                : `Procesamiento completo ${processingProgress}%`}
            </small>
          </div>
        ) : null}

        {importError ? <div className="admin-import-feedback error">{importError}</div> : null}
        {importNotice ? <div className="admin-import-feedback success">{importNotice}</div> : null}
        {importSuccess ? <div className="admin-import-feedback success">{importSuccess}</div> : null}
        {parsedRowsCount > 0 ? (
          <div className="admin-import-summary-strip">
            <strong>Lectura del Excel lista</strong>
            <span>
              {parsedRowsCount} productos listos para la siguiente etapa de importacion.
            </span>
          </div>
        ) : null}

        {importSummary.total > 0 ? (
          <div className="admin-import-preview">
            <div className="admin-import-preview-header">
              <div>
                <h4>Previsualizacion</h4>
                <p>
                  Se encontraron {importSummary.total} productos. {importSummary.newCount} son
                  nuevos y {importSummary.existingCount} ya existen.
                </p>
              </div>
            </div>

            <div className="admin-import-options">
              <div className="admin-import-option-group">
                <span className="admin-card-eyebrow">Productos existentes</span>
                <label className="admin-import-radio">
                  <input
                    type="radio"
                    name="existingProductStrategy"
                    checked={existingProductStrategy === 'update-price'}
                    onChange={() => setExistingProductStrategy('update-price')}
                  />
                  <span>Actualizar precio de los existentes</span>
                </label>
                <label className="admin-import-radio">
                  <input
                    type="radio"
                    name="existingProductStrategy"
                    checked={existingProductStrategy === 'keep-existing'}
                    onChange={() => setExistingProductStrategy('keep-existing')}
                  />
                  <span>Mantener los existentes sin cambiar</span>
                </label>
              </div>

              <label className="admin-import-check">
                <input
                  type="checkbox"
                  checked={resetNewStock}
                  onChange={(event) => setResetNewStock(event.target.checked)}
                />
                <span>Resetear stock a 0 en productos nuevos</span>
              </label>
            </div>

            <div className="admin-table admin-import-preview-table">
              <div className="admin-table-row admin-table-head admin-import-preview-grid">
                <span>SKU</span>
                <span>Producto</span>
                <span>Marca</span>
                <span>Unidad</span>
                <span>Precio</span>
                <span>Estado</span>
              </div>

              {importSummary.previewRows.map((product) => {
                const alreadyExists = existingProducts.some(
                  (entry) =>
                    String(entry.sku ?? '').trim().toUpperCase() ===
                    String(product.sku ?? '').trim().toUpperCase(),
                )

                return (
                  <div
                    key={`${product.sku}-${product.rowNumber}`}
                    className="admin-table-row admin-import-preview-grid"
                  >
                    <strong>{product.sku}</strong>
                    <span>{product.nombre || 'Sin nombre'}</span>
                    <span>{product.marca || 'Sin marca'}</span>
                    <span>
                      {product.unidad} {product.unidadMedida}
                    </span>
                    <span>{formatCurrency(product.precio)}</span>
                    <span>
                      <span
                        className={
                          alreadyExists ? 'admin-import-status existing' : 'admin-import-status new'
                        }
                      >
                        {alreadyExists ? 'Existente' : 'Nuevo'}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {rowErrors.length > 0 ? (
          <div className="admin-import-errors">
            <div className="admin-import-errors-header">
              <h4>Filas con error</h4>
              <span>{rowErrors.length} filas no se importaran</span>
            </div>
            <div className="admin-import-errors-list">
              {rowErrors.map((message) => (
                <div key={message} className="admin-import-error-item">
                  {message}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="admin-import-help">
          <h4>Formato esperado</h4>
          <div className="admin-card-stack">
            <div className="admin-import-help-row">
              <strong>Formato Excel esperado</strong>
              <span>Fila 1 se ignora. Fila 2 debe contener: CODIGO, CODIGO_PRO, DETALLE, MARCA, UNID, UNI_MED, REVENTA SIN IVA, GENERAL CON IVA.</span>
            </div>
            <div className="admin-import-help-row">
              <strong>JSON</strong>
              <span>Debe ser un array de productos con sku, nombre, marca, unidad, unidadMedida y precio.</span>
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-action-btn neutral" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="admin-action-btn primary"
            disabled={importSummary.total === 0}
            onClick={handleConfirmImport}
          >
            Confirmar importacion
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Solicitudes de acceso de nuevos clientes ────────────────────────────────
function SolicitudesSection({ session, onApproved }) {
  const [requests, setRequests] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState(null)
  const [approveModal, setApproveModal] = useState(null) // { request }
  const [approvePassword, setApprovePassword] = useState('')
  const [approveCreditLimit, setApproveCreditLimit] = useState('0')
  const [approveCategory, setApproveCategory] = useState('Ferreteria')
  const [approveError, setApproveError] = useState('')

  const fetchRequests = async (status = tab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/client-requests?status=${status}`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      const data = await res.json()
      if (data.ok) setRequests(data.requests || [])
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests(tab)
  }, [tab])

  const handleReject = async (id) => {
    const reason = window.prompt('Motivo del rechazo (opcional):')
    if (reason === null) return
    try {
      await fetch(`/api/admin/client-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ reason }),
      })
      fetchRequests(tab)
    } catch { /* noop */ }
  }

  const handleOpenApprove = (req) => {
    setApproveModal(req)
    setApprovePassword('')
    setApproveCreditLimit('0')
    setApproveCategory('Ferreteria')
    setApproveError('')
  }

  const handleConfirmApprove = async () => {
    if (!approveModal) return
    setApproveError('')
    if (approvePassword.length < 6) {
      setApproveError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setApprovingId(approveModal.id)
    try {
      const res = await fetch(`/api/admin/client-requests/${approveModal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({
          password: approvePassword,
          creditLimit: Number(approveCreditLimit) || 0,
          category: approveCategory,
        }),
      })
      const result = await res.json()
      if (!result.ok) {
        setApproveError(result.message || 'Error al aprobar.')
        return
      }
      setApproveModal(null)
      fetchRequests(tab)
      if (onApproved) onApproved()
    } catch {
      setApproveError('Error de conexión.')
    } finally {
      setApprovingId(null)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <span className="admin-card-eyebrow">Clientes</span>
          <h2>Solicitudes de acceso</h2>
        </div>
        <button type="button" className="admin-action-btn" onClick={() => fetchRequests(tab)}>
          Actualizar
        </button>
      </div>

      <div className="admin-tab-bar">
        {[
          { key: 'pending', label: `Pendientes${pendingCount > 0 && tab !== 'pending' ? ` (${pendingCount})` : ''}` },
          { key: 'approved', label: 'Aprobadas' },
          { key: 'rejected', label: 'Rechazadas' },
          { key: 'all', label: 'Todas' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`admin-tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-empty-msg">Cargando solicitudes...</p>
      ) : requests.length === 0 ? (
        <div className="admin-all-clear">
          {tab === 'pending' ? 'No hay solicitudes pendientes ✓' : 'No hay solicitudes en este estado.'}
        </div>
      ) : (
        <div className="admin-solicitudes-list">
          {requests.map((req) => (
            <div key={req.id} className="admin-solicitud-card">
              <div className="admin-solicitud-header">
                <div>
                  <strong>{req.business_name}</strong>
                  {req.contact_name ? <span className="admin-solicitud-contact"> · {req.contact_name}</span> : null}
                </div>
                <span className={`admin-status-badge ${req.status === 'pending' ? 'pendiente' : req.status === 'approved' ? 'aprobado' : 'cancelado'}`}>
                  {req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>
              <div className="admin-solicitud-meta">
                <span>{req.email}</span>
                {req.phone ? <span>{req.phone}</span> : null}
                {req.tax_id ? <span>CUIT: {req.tax_id}</span> : null}
                <span>{new Date(req.created_at).toLocaleDateString('es-AR')}</span>
              </div>
              {req.message ? (
                <p className="admin-solicitud-message">"{req.message}"</p>
              ) : null}
              {req.status === 'rejected' && req.rejection_reason ? (
                <p className="admin-solicitud-rejection">Motivo: {req.rejection_reason}</p>
              ) : null}
              {req.status === 'pending' ? (
                <div className="admin-solicitud-actions">
                  <button
                    type="button"
                    className="admin-action-btn danger"
                    onClick={() => handleReject(req.id)}
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="admin-primary-btn"
                    onClick={() => handleOpenApprove(req)}
                  >
                    Aprobar y crear acceso
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {approveModal ? (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setApproveModal(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <span className="admin-card-eyebrow">Aprobar solicitud</span>
                <h3>{approveModal.business_name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #666)', margin: '4px 0 0' }}>
                  {approveModal.email}
                </p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setApproveModal(null)}>✕</button>
            </div>

            <div className="admin-form-grid" style={{ marginTop: 16 }}>
              <label className="admin-form-field">
                <span>Contraseña de acceso *</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={approvePassword}
                  onChange={(e) => setApprovePassword(e.target.value)}
                />
              </label>
              <label className="admin-form-field">
                <span>Tipo de cliente</span>
                <select value={approveCategory} onChange={(e) => setApproveCategory(e.target.value)}>
                  <option value="Ferreteria">Ferretería</option>
                  <option value="Pintureria">Pinturería</option>
                  <option value="Constructora">Constructora</option>
                  <option value="Particular">Particular</option>
                </select>
              </label>
              <label className="admin-form-field">
                <span>Límite de crédito ($)</span>
                <input
                  type="number"
                  value={approveCreditLimit}
                  onChange={(e) => setApproveCreditLimit(e.target.value)}
                />
              </label>
            </div>

            {approveError ? (
              <p style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.875rem', margin: '8px 0' }}>
                {approveError}
              </p>
            ) : null}

            <div className="admin-modal-footer">
              <button type="button" className="admin-action-btn neutral" onClick={() => setApproveModal(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="admin-primary-btn"
                onClick={handleConfirmApprove}
                disabled={!!approvingId}
              >
                {approvingId ? 'Creando cuenta...' : 'Confirmar y habilitar acceso'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

// ─── Pedidos Section ─────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'Pendiente',   label: 'Pendientes',   color: '#f59e0b', bg: '#fffbeb' },
  { id: 'Preparando',  label: 'Preparando',   color: '#3b82f6', bg: '#eff6ff' },
  { id: 'Despachado',  label: 'Despachados',  color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'Entregado',   label: 'Entregados',   color: '#10b981', bg: '#f0fdf4' },
  { id: 'Cancelado',   label: 'Cancelados',   color: '#ef4444', bg: '#fff5f5' },
]

const DATE_RANGE_OPTIONS = [
  { id: 'hoy',    label: 'Hoy' },
  { id: 'semana', label: 'Últimos 7 días' },
  { id: 'mes',    label: 'Últimos 30 días' },
  { id: 'todo',   label: 'Todos' },
]

// ─── ClientesSection ─────────────────────────────────────────────────────────
function ClientesSection({
  clientsWithTier,
  filteredClients,
  clientSummary,
  clientSearch, setClientSearch,
  clientLevelFilter, setClientLevelFilter,
  clientStatusFilter, setClientStatusFilter,
  clientQuickFilter, setClientQuickFilter,
  clientSort, toggleClientSort, handleClientSortSelect,
  updateClientStatus,
  setSelectedClientId,
  setEditingClientId,
  setIsCreatingClient,
  setPaymentClientId,
  setQuickNoteClientId,
  setAiClientId,
  handleExportClientsCsv,
  deleteClient,
  session,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkAction, setBulkAction] = useState('')

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)))
    }
  }

  const handleBulkApply = () => {
    if (!bulkAction || selectedIds.size === 0) return
    const ids = [...selectedIds]
    if (bulkAction === 'bloquear') {
      ids.forEach((id) => updateClientStatus(id, 'Bloqueado', session.name))
    } else if (bulkAction === 'activar') {
      ids.forEach((id) => updateClientStatus(id, 'Activo', session.name))
    } else if (bulkAction === 'exportar') {
      handleExportClientsCsv()
    }
    setSelectedIds(new Set())
    setBulkAction('')
  }

  const STATUS_META = {
    Activo:   { cls: 'cs-status-badge active',   label: 'Activo' },
    Inactivo: { cls: 'cs-status-badge inactive',  label: 'Inactivo' },
    Bloqueado:{ cls: 'cs-status-badge blocked',   label: 'Bloqueado' },
  }

  const QUICK_FILTERS = [
    { id: 'Todos',              label: 'Todos',              count: clientSummary.total },
    { id: 'Activos',            label: 'Activos',            count: clientSummary.active },
    { id: 'En riesgo',          label: 'En riesgo',          count: clientSummary.risk },
    { id: 'Inactivos',          label: 'Inactivos',          count: clientSummary.inactive },
    { id: 'Con saldo pendiente',label: 'Con deuda',          count: clientSummary.withDebtClients },
    { id: 'Bloqueados',         label: 'Bloqueados',         count: clientSummary.blocked },
  ]

  const sortIcon = (key) => {
    if (clientSort.key !== key) return <span className="cs-sort-icon">↕</span>
    return <span className="cs-sort-icon active">{clientSort.direction === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <section className="admin-section cs-section">
      {/* ── KPI bar ── */}
      <div className="cs-kpi-bar">
        <div className="cs-kpi-card blue">
          <div className="cs-kpi-label">Total clientes</div>
          <div className="cs-kpi-value">{clientSummary.total}</div>
          <div className="cs-kpi-sub">Registrados en el sistema</div>
        </div>
        <div className="cs-kpi-card green">
          <div className="cs-kpi-label">Activos</div>
          <div className="cs-kpi-value">{clientSummary.active}</div>
          <div className="cs-kpi-sub">Compraron en los últimos 60 días</div>
        </div>
        <div className="cs-kpi-card orange">
          <div className="cs-kpi-label">En riesgo</div>
          <div className="cs-kpi-value">{clientSummary.risk}</div>
          <div className="cs-kpi-sub">Sin compras hace +60 días</div>
        </div>
        <div className="cs-kpi-card red">
          <div className="cs-kpi-label">Saldo pendiente total</div>
          <div className="cs-kpi-value">{formatCurrency(clientSummary.withDebtAmount)}</div>
          <div className="cs-kpi-sub">{clientSummary.withDebtClients} clientes con deuda</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="cs-toolbar">
        <div className="cs-toolbar-left">
          <div className="cs-search-box">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.6"/><path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Buscar por nombre, CUIT o ciudad..."
            />
            {clientSearch && (
              <button type="button" className="cs-search-clear" onClick={() => setClientSearch('')}>✕</button>
            )}
          </div>
          <select
            className="cs-select"
            value={clientLevelFilter}
            onChange={(e) => setClientLevelFilter(e.target.value)}
          >
            <option value="Todos">Todos los niveles</option>
            {['Asociado','Plata','Oro','Platino'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="cs-select"
            value={clientStatusFilter}
            onChange={(e) => setClientStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>
        </div>
        <div className="cs-toolbar-right">
          <button type="button" className="cs-btn secondary" onClick={handleExportClientsCsv}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M4 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            Exportar
          </button>
          <button type="button" className="cs-btn primary" onClick={() => setIsCreatingClient(true)}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* ── Quick-filter tabs ── */}
      <div className="cs-filter-tabs">
        {QUICK_FILTERS.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            className={`cs-filter-tab${clientQuickFilter === id ? ' active' : ''}${id === 'En riesgo' ? ' risk' : ''}${id === 'Bloqueados' ? ' blocked' : ''}`}
            onClick={() => setClientQuickFilter(id)}
          >
            {label}
            <span className="cs-filter-tab-count">{count}</span>
          </button>
        ))}

        <div className="cs-sort-select-wrap">
          <span>Ordenar</span>
          <select
            className="cs-select cs-sort-select"
            value={`${clientSort.key}:${clientSort.direction}`}
            onChange={(e) => handleClientSortSelect(e.target.value)}
          >
            <option value="lastPurchase:desc">Última compra</option>
            <option value="businessName:asc">Nombre A→Z</option>
            <option value="totalBilled:desc">Más facturado</option>
            <option value="pendingBalance:desc">Mayor deuda</option>
            <option value="status:asc">Estado</option>
          </select>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="cs-bulk-bar">
          <span className="cs-bulk-count">{selectedIds.size} seleccionados</span>
          <select className="cs-select" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            <option value="">Acción masiva…</option>
            <option value="activar">Activar todos</option>
            <option value="bloquear">Bloquear todos</option>
            <option value="exportar">Exportar selección</option>
          </select>
          <button type="button" className="cs-btn primary" onClick={handleBulkApply} disabled={!bulkAction}>
            Aplicar
          </button>
          <button type="button" className="cs-btn secondary" onClick={() => setSelectedIds(new Set())}>
            Cancelar
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="cs-table-wrap">
        <table className="cs-table">
          <thead>
            <tr>
              <th className="cs-col-check">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredClients.length && filteredClients.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="cs-col-client">
                <button type="button" className="cs-th-btn" onClick={() => toggleClientSort('businessName')}>
                  Cliente {sortIcon('businessName')}
                </button>
              </th>
              <th className="cs-col-tier">
                <button type="button" className="cs-th-btn" onClick={() => toggleClientSort('tier')}>
                  Nivel {sortIcon('tier')}
                </button>
              </th>
              <th className="cs-col-date">
                <button type="button" className="cs-th-btn" onClick={() => toggleClientSort('lastPurchase')}>
                  Última compra {sortIcon('lastPurchase')}
                </button>
              </th>
              <th className="cs-col-money">
                <button type="button" className="cs-th-btn" onClick={() => toggleClientSort('totalBilled')}>
                  Facturado {sortIcon('totalBilled')}
                </button>
              </th>
              <th className="cs-col-money">
                <button type="button" className="cs-th-btn" onClick={() => toggleClientSort('pendingBalance')}>
                  Deuda {sortIcon('pendingBalance')}
                </button>
              </th>
              <th className="cs-col-status">
                <button type="button" className="cs-th-btn" onClick={() => toggleClientSort('status')}>
                  Estado {sortIcon('status')}
                </button>
              </th>
              <th className="cs-col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={8} className="cs-empty">
                  <div>
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{width:40,height:40,opacity:0.25,margin:'0 auto 8px'}}><circle cx="21" cy="21" r="13" stroke="currentColor" strokeWidth="3"/><path d="m30 30 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                    <p>Sin clientes que coincidan con los filtros.</p>
                  </div>
                </td>
              </tr>
            ) : filteredClients.map((client) => {
              const flags = getClientFlags(client)
              const isAlert = flags.hasOverdueBalance
              const statusMeta = STATUS_META[client.status] || STATUS_META.Inactivo
              const initials = client.businessName.split(' ').map((p) => p[0]).join('').slice(0,2).toUpperCase()

              return (
                <tr
                  key={client.id}
                  className={`cs-row${isAlert ? ' alert' : ''}${selectedIds.has(client.id) ? ' selected' : ''}`}
                >
                  <td className="cs-col-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleSelect(client.id)}
                    />
                  </td>

                  {/* Cliente */}
                  <td className="cs-col-client">
                    <div className="cs-client-cell">
                      <div className={`cs-avatar${isAlert ? ' alert' : ''}`}>{initials}</div>
                      <div className="cs-client-info">
                        <button
                          type="button"
                          className="cs-client-name"
                          onClick={() => setSelectedClientId(client.id)}
                        >
                          {client.businessName}
                        </button>
                        <span className="cs-client-sub">
                          {client.category} · CUIT {client.taxId}
                        </span>
                        <div className="cs-flags">
                          {flags.isInactiveLongTime && (
                            <span className="cs-flag warning">+60 días sin compra</span>
                          )}
                          {flags.hasOverdueBalance && (
                            <span className="cs-flag danger">Saldo pendiente</span>
                          )}
                          {flags.isCloseToNextTier && (
                            <span className="cs-flag star">↑ Cerca de subir</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Nivel */}
                  <td className="cs-col-tier">
                    <span className={`cs-tier-badge tier-${(client.tier || 'asociado').toLowerCase()}`}>
                      {client.tier || 'Asociado'}
                    </span>
                    <div className="cs-tier-pts">{getClientLifetimePoints(client).toLocaleString('es-AR')} pts</div>
                  </td>

                  {/* Última compra */}
                  <td className="cs-col-date">
                    {client.lastPurchase ? (
                      <>
                        <div className="cs-date-main">{formatDate(client.lastPurchase.createdAt)}</div>
                        <div className="cs-date-rel">{getRelativeTimeLabel(client.lastPurchase.createdAt)}</div>
                      </>
                    ) : (
                      <span className="cs-no-data">Sin registros</span>
                    )}
                  </td>

                  {/* Facturado */}
                  <td className="cs-col-money">
                    <strong className="cs-money">{formatCurrency(client.totalBilled)}</strong>
                  </td>

                  {/* Deuda */}
                  <td className="cs-col-money">
                    {client.pendingBalance > 0 ? (
                      <strong className="cs-money debt">{formatCurrency(client.pendingBalance)}</strong>
                    ) : (
                      <span className="cs-no-data">—</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="cs-col-status">
                    <button
                      type="button"
                      className={statusMeta.cls}
                      title={`Cambiar estado (actualmente ${client.status})`}
                      onClick={() => updateClientStatus(client.id, getNextClientStatus(client.status), session.name)}
                    >
                      {statusMeta.label}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="cs-col-actions">
                    <div className="cs-actions">
                      <button
                        type="button"
                        className="cs-action-btn primary"
                        onClick={() => setSelectedClientId(client.id)}
                        title="Ver ficha del cliente"
                      >
                        Ver ficha
                      </button>
                      {client.pendingBalance > 0 && (
                        <button
                          type="button"
                          className="cs-action-btn success"
                          onClick={() => setPaymentClientId(client.id)}
                          title="Registrar pago"
                        >
                          Reg. pago
                        </button>
                      )}
                      <button
                        type="button"
                        className="cs-action-btn ghost"
                        onClick={() => setAiClientId(client.id)}
                        title="Consultar IA sobre este cliente"
                      >
                        IA
                      </button>
                      <button
                        type="button"
                        className="cs-action-btn ghost"
                        onClick={() => setQuickNoteClientId(client.id)}
                        title="Agregar nota rápida"
                      >
                        Nota
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="cs-footer">
        <span>
          Mostrando {filteredClients.length} de {clientSummary.total} clientes
          {clientSummary.risk > 0 && (
            <span className="cs-footer-alert"> · {clientSummary.risk} en riesgo</span>
          )}
          {clientSummary.withDebtClients > 0 && (
            <span className="cs-footer-debt"> · {clientSummary.withDebtClients} con deuda</span>
          )}
        </span>
      </div>
    </section>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

function PedidosSection({
  ordersWithClient, filteredOrders,
  orderSearch, setOrderSearch,
  orderStatusFilter, setOrderStatusFilter,
  orderSummary,
  approveOrder, handleCancelOrder, changeOrderStatus, handleDispatchOrder,
  setSelectedOrderId, handleExportOrdersCsv, session,
}) {
  const [dateRange, setDateRange] = useState('todo')
  const [pipelineView, setPipelineView] = useState(false)

  // Count per status for pipeline tabs
  const countByStatus = useMemo(() => {
    const map = {}
    ordersWithClient.forEach(o => { map[o.status] = (map[o.status] || 0) + 1 })
    return map
  }, [ordersWithClient])

  // Date-filtered orders — cortes desde medianoche Argentina (UTC-3)
  const dateFilteredOrders = useMemo(() => {
    if (dateRange === 'todo') return filteredOrders
    const todayAR = arToday()
    if (dateRange === 'hoy') {
      return filteredOrders.filter(o => o.createdAt && arDateOf(o.createdAt) === todayAR)
    }
    const cutoff = arStartOfDay(dateRange === 'semana' ? 7 : 30)
    return filteredOrders.filter(o => o.createdAt && new Date(o.createdAt).getTime() >= cutoff)
  }, [filteredOrders, dateRange])

  const activeStage = PIPELINE_STAGES.find(s => s.id === orderStatusFilter) || null

  return (
    <section className="admin-section">
      {/* KPIs */}
      <div className="admin-orders-summary-grid">
        <MetricCard title="Pedidos del día"   value={String(orderSummary.totalToday)}            detail="Ingresados hoy"          tone="navy" />
        <MetricCard title="Facturación del día" value={formatCurrency(orderSummary.amountToday)} detail="Monto total hoy"          tone="blue" />
        <MetricCard title="Pendientes"         value={String(orderSummary.pending)}              detail="Esperando aprobación"    tone={orderSummary.pending > 0 ? 'red' : 'slate'} />
        <MetricCard title="En preparación"     value={String(orderSummary.preparing)}            detail="En proceso de armado"    tone={orderSummary.preparing > 0 ? 'navy' : 'slate'} />
      </div>

      {/* Pipeline tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setOrderStatusFilter('Todos')}
          style={{
            padding: '0.45rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
            border: orderStatusFilter === 'Todos' ? '2px solid #1A1FBE' : '1px solid #e2e8f0',
            background: orderStatusFilter === 'Todos' ? '#1A1FBE' : '#fff',
            color: orderStatusFilter === 'Todos' ? '#fff' : '#374151',
            cursor: 'pointer',
          }}
        >
          Todos ({ordersWithClient.length})
        </button>
        {PIPELINE_STAGES.map(stage => {
          const isActive = orderStatusFilter === stage.id
          const count = countByStatus[stage.id] || 0
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setOrderStatusFilter(stage.id)}
              style={{
                padding: '0.45rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
                border: isActive ? `2px solid ${stage.color}` : '1px solid #e2e8f0',
                background: isActive ? stage.bg : '#fff',
                color: isActive ? stage.color : '#374151',
                cursor: 'pointer',
              }}
            >
              {stage.label} {count > 0 ? `(${count})` : '(0)'}
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
        <label className="admin-search" style={{ flex: '1 1 220px' }}>
          <input
            type="text"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Buscar por N° pedido o cliente..."
          />
        </label>
        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {DATE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDateRange(opt.id)}
              style={{
                padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: dateRange === opt.id ? 700 : 400,
                background: dateRange === opt.id ? '#1e293b' : '#fff',
                color: dateRange === opt.id ? '#fff' : '#64748b',
                border: 'none', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button type="button" className="admin-action-btn neutral" onClick={handleExportOrdersCsv}>
          Exportar CSV
        </button>
      </div>

      {/* Stage header when filtering */}
      {activeStage && (
        <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: activeStage.bg, border: `1px solid ${activeStage.color}22`, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, color: activeStage.color }}>{activeStage.label}</span>
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{dateFilteredOrders.length} pedido(s)</span>
          {activeStage.id === 'Pendiente' && dateFilteredOrders.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
              ⚡ Requieren aprobación
            </span>
          )}
        </div>
      )}

      <div className="admin-card">
        <div className="admin-table">
          <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '130px 1fr 110px 1fr 100px 130px 1fr', gap: '0.5rem', padding: '0.5rem 1rem' }}>
            <span>N° Pedido</span>
            <span>Cliente</span>
            <span>Fecha</span>
            <span>Productos</span>
            <span>Total</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {dateFilteredOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              No hay pedidos con los filtros seleccionados.
            </div>
          ) : dateFilteredOrders.map((order) => {
            const hasPendingBalance = Number(order.client?.pendingBalance) > 0
            const isAlert = hasPendingBalance && order.client?.status !== 'Activo'
            const stage = PIPELINE_STAGES.find(s => s.id === order.status)
            return (
              <div
                key={order.id}
                className={`admin-table-row admin-order-row${isAlert ? ' alert' : ''}`}
                style={{ display: 'grid', gridTemplateColumns: '130px 1fr 110px 1fr 100px 130px 1fr', gap: '0.5rem', padding: '0.6rem 1rem', alignItems: 'center' }}
              >
                {/* ID + flags */}
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>{order.id}</strong>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {order.isNew && <span className="admin-order-flag new">NUEVO</span>}
                    {order.needsAttention && <span className="admin-order-flag warning">⚠</span>}
                    {hasPendingBalance && <span style={{ fontSize: '0.68rem', background: '#fde8e8', color: '#c53030', padding: '1px 5px', borderRadius: '4px' }}>Deuda</span>}
                  </div>
                </div>

                {/* Cliente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1A1FBE22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#1A1FBE', flexShrink: 0 }}>
                    {(order.clientName || '?')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{order.clientName}</span>
                </div>

                {/* Fecha */}
                <div>
                  <div style={{ fontSize: '0.8rem' }}>{formatDate(order.createdAt)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{order.relativeTime}</div>
                </div>

                {/* Productos */}
                <span style={{ fontSize: '0.8rem', color: '#374151' }}>{order.productsPreview}</span>

                {/* Total */}
                <strong style={{ fontSize: '0.9rem' }}>{formatCurrency(order.total)}</strong>

                {/* Estado badge */}
                <span style={{
                  display: 'inline-block', padding: '0.25rem 0.6rem', borderRadius: '20px',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: stage?.bg || '#f1f5f9',
                  color: stage?.color || '#64748b',
                  border: `1px solid ${stage?.color || '#e2e8f0'}44`,
                }}>
                  {order.status}
                </span>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <button type="button" className="admin-table-link" onClick={() => setSelectedOrderId(order.id)}>
                    Ver
                  </button>
                  {order.status === 'Pendiente' && (
                    <>
                      <button type="button" className="admin-action-btn approve" onClick={() => approveOrder(order.id, session.name)}>
                        Aprobar
                      </button>
                      <button type="button" className="admin-action-btn cancel" onClick={() => handleCancelOrder(order)}>
                        ✕
                      </button>
                    </>
                  )}
                  {order.status === 'Aprobado' && (
                    <button type="button" className="admin-action-btn neutral" onClick={() => changeOrderStatus(order.id, 'Preparando', session.name)}>
                      Preparar
                    </button>
                  )}
                  {order.status === 'Preparando' && (
                    <button type="button" className="admin-action-btn neutral" onClick={() => handleDispatchOrder(order)}>
                      Despachar
                    </button>
                  )}
                  {order.status === 'Despachado' && (
                    <button type="button" className="admin-action-btn approve" onClick={() => changeOrderStatus(order.id, 'Entregado', session.name)}>
                      Entregado
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Stock Section ────────────────────────────────────────────────────────────
const PRODUCT_CATEGORIES_ALL = ['Limpieza', 'Higiene', 'Ferreteria', 'Almacen', 'Papeleria', 'General']

function ProductFormModal({ title, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    sku: initial?.sku || '',
    price: initial?.price ?? '',
    category: initial?.category || 'General',
    brand: initial?.brand || '',
    detail: initial?.detail || '',
    currentStock: initial?.currentStock ?? '',
    stockMinimo: initial?.stockMinimo ?? 5,
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.sku.trim()) { setError('El SKU es obligatorio.'); return }
    onSave(form)
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="admin-card-eyebrow">Catálogo</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>Cerrar</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <label className="admin-field-label" style={{ gridColumn: '1 / -1' }}>
              Nombre del producto *
              <input className="admin-input" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Lavandina Concentrada 5L" />
            </label>
            <label className="admin-field-label">
              SKU *
              <input className="admin-input" value={form.sku} onChange={(e) => setForm(p => ({ ...p, sku: e.target.value.toUpperCase() }))} placeholder="Ej: LMP-LAV-5L" />
            </label>
            <label className="admin-field-label">
              Categoría
              <select className="admin-input" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                {PRODUCT_CATEGORIES_ALL.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="admin-field-label">
              Precio ($)
              <input type="number" min="0" step="0.01" className="admin-input" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="admin-field-label">
              Marca
              <input className="admin-input" value={form.brand} onChange={(e) => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="Ej: Procenex" />
            </label>
            <label className="admin-field-label">
              Stock inicial
              <input type="number" min="0" className="admin-input" value={form.currentStock} onChange={(e) => setForm(p => ({ ...p, currentStock: e.target.value }))} placeholder="0" />
            </label>
            <label className="admin-field-label">
              Stock mínimo
              <input type="number" min="0" className="admin-input" value={form.stockMinimo} onChange={(e) => setForm(p => ({ ...p, stockMinimo: e.target.value }))} placeholder="5" />
            </label>
            <label className="admin-field-label" style={{ gridColumn: '1 / -1' }}>
              Descripción / Detalle
              <input className="admin-input" value={form.detail} onChange={(e) => setForm(p => ({ ...p, detail: e.target.value }))} placeholder="Unidad de medida, presentación, etc." />
            </label>
            {error && <p style={{ color: '#e53e3e', fontSize: '0.85rem', gridColumn: '1 / -1' }}>{error}</p>}
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-action-btn neutral" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-primary-btn">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StockSection({
  products, filteredStockProducts, visibleStockProducts,
  stockPage, setStockPage, stockTotalPages,
  stockSearch, setStockSearch, stockOnlyAlerts, setStockOnlyAlerts,
  setStockAdjustProduct, productIdsInOrders,
  updateProductStock, updateProductStockMinimo,
  deleteProduct, createProduct, updateProduct,
  handleDeleteProduct, setIsProductImportOpen, session,
}) {
  const [selected, setSelected] = useState(new Set())
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [sortBy, setSortBy] = useState('name') // name | stock | status | price
  const [editingProduct, setEditingProduct] = useState(null) // product to edit
  const [showNewForm, setShowNewForm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Apply category filter + sort on top of filteredStockProducts
  const displayProducts = useMemo(() => {
    let list = filteredStockProducts
    if (stockOnlyAlerts) {
      list = list.filter(p => {
        const min = Number(p.stockMinimo) || 5
        const res = Number(p.stockReservado) || 0
        return Math.max((Number(p.currentStock) || 0) - res, 0) < min
      })
    }
    if (categoryFilter !== 'todos') {
      list = list.filter(p => p.category === categoryFilter)
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'stock') return (Number(a.currentStock) || 0) - (Number(b.currentStock) || 0)
      if (sortBy === 'status') {
        const statusScore = (p) => {
          const min = Number(p.stockMinimo) || 5
          const avail = Math.max((Number(p.currentStock) || 0) - (Number(p.stockReservado) || 0), 0)
          if (avail < Math.ceil(min / 2)) return 0
          if (avail < min) return 1
          return 2
        }
        return statusScore(a) - statusScore(b)
      }
      if (sortBy === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0)
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es')
    })
  }, [filteredStockProducts, stockOnlyAlerts, categoryFilter, sortBy])

  // Paginate the display list independently
  const PAGE_SIZE = 25
  const totalPages = Math.max(Math.ceil(displayProducts.length / PAGE_SIZE), 1)
  const safePage = Math.min(stockPage, totalPages)
  const pageProducts = displayProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // KPIs
  const kpis = useMemo(() => {
    const total = products.length
    const low = products.filter(p => {
      const min = Number(p.stockMinimo) || 5
      const avail = Math.max((Number(p.currentStock) || 0) - (Number(p.stockReservado) || 0), 0)
      return avail < min
    }).length
    const critical = products.filter(p => {
      const min = Number(p.stockMinimo) || 5
      const avail = Math.max((Number(p.currentStock) || 0) - (Number(p.stockReservado) || 0), 0)
      return avail < Math.ceil(min / 2)
    }).length
    const value = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.currentStock) || 0), 0)
    return { total, low, critical, value }
  }, [products])

  const allPageIds = pageProducts.map(p => p.id)
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); allPageIds.forEach(id => s.delete(id)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); allPageIds.forEach(id => s.add(id)); return s })
    }
  }

  const toggleOne = (id) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const handleBulkDelete = () => {
    const deletable = [...selected].filter(id => !productIdsInOrders.has(id))
    const blocked = selected.size - deletable.length
    if (deletable.length === 0) {
      alert('Los productos seleccionados no se pueden eliminar porque tienen pedidos asociados.')
      return
    }
    const msg = blocked > 0
      ? `¿Eliminar ${deletable.length} producto(s)? ${blocked} producto(s) no se pueden eliminar porque tienen pedidos.`
      : `¿Eliminar ${deletable.length} producto(s) seleccionados?`
    if (!window.confirm(msg)) return
    setBulkDeleting(true)
    deletable.forEach(id => deleteProduct(id, session.name))
    setSelected(new Set())
    setBulkDeleting(false)
  }

  const handleSaveNew = (form) => {
    createProduct({
      name: form.name,
      sku: form.sku,
      price: Number(form.price) || 0,
      category: form.category,
      brand: form.brand,
      detail: form.detail,
      currentStock: Number(form.currentStock) || 0,
      stockMinimo: Number(form.stockMinimo) || 5,
    }, session.name)
    setShowNewForm(false)
  }

  const handleSaveEdit = (form) => {
    updateProduct(editingProduct.id, {
      name: form.name,
      sku: form.sku,
      price: Number(form.price) || 0,
      category: form.category,
      brand: form.brand,
      detail: form.detail,
      stockMinimo: Number(form.stockMinimo) || 5,
    }, session.name)
    setEditingProduct(null)
  }

  return (
    <section className="admin-section">
      {/* KPIs */}
      <div className="admin-metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MetricCard title="Total productos" value={String(kpis.total)} detail="en catálogo" tone="slate" />
        <MetricCard title="Stock bajo" value={String(kpis.low)} detail="debajo del mínimo" tone={kpis.low > 0 ? 'navy' : 'slate'} />
        <MetricCard title="Críticos" value={String(kpis.critical)} detail="menos de 50% del mínimo" tone={kpis.critical > 0 ? 'red' : 'slate'} />
        <MetricCard title="Valor en stock" value={formatCurrency(kpis.value)} detail="precio × unidades" tone="slate" />
      </div>

      <div className="admin-card admin-stock-card">
        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem', alignItems: 'center' }}>
          <label className="admin-search" style={{ flex: '1 1 220px' }}>
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => { setStockSearch(e.target.value); setStockPage(1) }}
              placeholder="Buscar por producto, SKU o marca..."
            />
          </label>
          <select className="admin-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setStockPage(1) }}>
            <option value="todos">Todas las categorías</option>
            {PRODUCT_CATEGORIES_ALL.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="admin-select" value={stockOnlyAlerts ? 'alertas' : 'todos'} onChange={(e) => { setStockOnlyAlerts(e.target.value === 'alertas'); setStockPage(1) }}>
            <option value="todos">Todos los estados</option>
            <option value="alertas">Solo alertas</option>
          </select>
          <select className="admin-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Ordenar: Nombre</option>
            <option value="stock">Ordenar: Stock ↑</option>
            <option value="status">Ordenar: Estado</option>
            <option value="price">Ordenar: Precio</option>
          </select>
          <button type="button" className="admin-primary-btn" onClick={() => setShowNewForm(true)}>+ Nuevo producto</button>
          <button type="button" className="admin-action-btn neutral" onClick={() => setIsProductImportOpen(true)}>Importar</button>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0.75rem', background: '#eff6ff', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid #bfdbfe' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selected.size} producto(s) seleccionado(s)</span>
            <button type="button" className="admin-action-btn danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
              Eliminar seleccionados
            </button>
            <button type="button" className="admin-action-btn neutral" onClick={() => setSelected(new Set())}>
              Cancelar selección
            </button>
          </div>
        )}

        {/* Alert banner */}
        {kpis.critical > 0 && (
          <div className="admin-alert-row rich warning" style={{ marginBottom: '0.75rem' }}>
            <span className="admin-alert-icon">⚠️</span>
            <strong>{kpis.critical} producto(s) en nivel crítico · {kpis.low - kpis.critical} más con stock bajo</strong>
          </div>
        )}

        <div className="admin-stock-meta">
          <span>Mostrando {pageProducts.length} de {displayProducts.length} productos</span>
          <span>Pág. {safePage} de {totalPages}</span>
        </div>

        {/* Table */}
        <div className="admin-table admin-stock-table-scroll">
          <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '32px 2fr 80px 80px 90px 80px 80px 80px 1fr', gap: '0.5rem', padding: '0.5rem 0.75rem', alignItems: 'center' }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
            <span>Producto / SKU</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Actual</span>
            <span>Reservado</span>
            <span>Disponible</span>
            <span>Mínimo</span>
            <span>Acciones</span>
          </div>

          {pageProducts.map((product) => {
            const stockMinimo = Number(product.stockMinimo) || 5
            const stockReservado = Number(product.stockReservado) || 0
            const stockDisponible = Math.max((Number(product.currentStock) || 0) - stockReservado, 0)
            const isLow = stockDisponible < stockMinimo
            const isCritical = stockDisponible < Math.ceil(stockMinimo / 2)
            const isChecked = selected.has(product.id)
            return (
              <div key={product.id} className={`admin-table-row${isCritical ? ' alert' : isLow ? ' attention' : ''}`}
                style={{ display: 'grid', gridTemplateColumns: '32px 2fr 80px 80px 90px 80px 80px 80px 1fr', gap: '0.5rem', padding: '0.5rem 0.75rem', alignItems: 'center', background: isChecked ? '#eff6ff' : undefined }}>
                <input type="checkbox" checked={isChecked} onChange={() => toggleOne(product.id)} style={{ cursor: 'pointer' }} />
                <div>
                  <strong>{product.name}</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{product.sku}{product.brand ? ` · ${product.brand}` : ''}</div>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{product.category || '—'}</span>
                <span style={{ fontSize: '0.875rem' }}>{formatCurrency(product.price || 0)}</span>
                <EditableNumberField
                  value={product.currentStock}
                  onCommit={(v) => updateProductStock(product.id, v, session.name)}
                  suffix="uni"
                />
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{stockReservado}</span>
                <strong style={{ color: isCritical ? '#e53e3e' : isLow ? '#d97706' : '#16a34a', fontSize: '0.875rem' }}>
                  {stockDisponible}
                </strong>
                <EditableNumberField
                  value={stockMinimo}
                  onCommit={(v) => updateProductStockMinimo(product.id, v, session.name)}
                  suffix="uni"
                />
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <button type="button" className="admin-action-btn neutral" onClick={() => setStockAdjustProduct(product)} title="Registrar movimiento">
                    Ajustar
                  </button>
                  <button type="button" className="admin-action-btn neutral" onClick={() => setEditingProduct(product)} title="Editar producto">
                    Editar
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn cancel"
                    onClick={() => handleDeleteProduct(product)}
                    disabled={productIdsInOrders.has(product.id)}
                    title={productIdsInOrders.has(product.id) ? 'Tiene pedidos asociados' : 'Eliminar'}
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}

          {pageProducts.length === 0 && (
            <div className="admin-stock-empty">No hay productos con esa búsqueda o filtro.</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-stock-pagination">
            <button type="button" className="admin-action-btn neutral" disabled={safePage <= 1} onClick={() => setStockPage(p => Math.max(p - 1, 1))}>Anterior</button>
            <span>Pág. {safePage} de {totalPages}</span>
            <button type="button" className="admin-action-btn neutral" disabled={safePage >= totalPages} onClick={() => setStockPage(p => Math.min(p + 1, totalPages))}>Siguiente</button>
          </div>
        )}
      </div>

      {showNewForm && (
        <ProductFormModal
          title="Nuevo producto"
          initial={null}
          onSave={handleSaveNew}
          onClose={() => setShowNewForm(false)}
        />
      )}
      {editingProduct && (
        <ProductFormModal
          title={`Editar — ${editingProduct.name}`}
          initial={editingProduct}
          onSave={handleSaveEdit}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </section>
  )
}

// ─── Cobranzas: vista dedicada de cuentas por cobrar con aging buckets ─────
function CobranzasSection({ clients, orders, onOpenClient }) {
  const { session } = useAuth()
  const [pagoModal, setPagoModal] = useState(null)
  const [pagoForm, setPagoForm] = useState({ tipo: 'pago', monto: '', descripcion: '' })
  const [pagoSaving, setPagoSaving] = useState(false)
  const [pagoError, setPagoError] = useState('')
  const [localBalances, setLocalBalances] = useState({})
  const [search, setSearch] = useState('')
  const [bucketFilter, setBucketFilter] = useState('Todos')

  const handleOpenPago = (client) => {
    setPagoModal(client)
    setPagoForm({ tipo: 'pago', monto: '', descripcion: '' })
    setPagoError('')
  }

  const handleConfirmPago = async () => {
    if (!pagoForm.monto || isNaN(parseFloat(pagoForm.monto))) {
      setPagoError('Ingresá un monto válido.')
      return
    }
    setPagoSaving(true)
    setPagoError('')
    const montoFinal = pagoForm.tipo === 'pago' || pagoForm.tipo === 'nota_credito'
      ? -Math.abs(parseFloat(pagoForm.monto))
      : Math.abs(parseFloat(pagoForm.monto))
    try {
      const res = await fetch('/api/admin/cuenta-corriente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({
          client_json_id: pagoModal.id,
          tipo: pagoForm.tipo,
          descripcion: pagoForm.descripcion || null,
          monto: montoFinal,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.message || 'Error al guardar')
      setLocalBalances((prev) => ({
        ...prev,
        [pagoModal.id]: Math.max(0, (Number(pagoModal.pendingBalance) || 0) + montoFinal),
      }))
      setPagoModal(null)
    } catch (e) {
      setPagoError(e.message)
    } finally {
      setPagoSaving(false)
    }
  }

  const data = useMemo(() => {
    const debtors = clients.filter((c) => Number(c.pendingBalance || 0) > 0)
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    const lastOrderByClient = new Map()
    orders.forEach((o) => {
      const prev = lastOrderByClient.get(o.clientId)
      const ts = new Date(o.createdAt).getTime()
      if (!prev || ts > prev) lastOrderByClient.set(o.clientId, ts)
    })

    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const counts = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const debtorsWithAging = debtors.map((c) => {
      const lastTs = lastOrderByClient.get(c.id) || new Date(c.createdAt).getTime()
      const days = Math.floor((now - lastTs) / dayMs)
      const amount = Number(c.pendingBalance || 0)
      let bucket
      if (days <= 30) bucket = '0-30'
      else if (days <= 60) bucket = '31-60'
      else if (days <= 90) bucket = '61-90'
      else bucket = '90+'
      buckets[bucket] += amount
      counts[bucket] += 1
      return { ...c, daysSinceLastOrder: days, bucket, debtAmount: amount }
    })

    const total = Object.values(buckets).reduce((a, b) => a + b, 0)
    debtorsWithAging.sort((a, b) => b.debtAmount - a.debtAmount)

    return { debtors: debtorsWithAging, buckets, counts, total }
  }, [clients, orders])

  const filteredDebtors = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.debtors.filter((c) => {
      const matchesBucket = bucketFilter === 'Todos' || c.bucket === bucketFilter
      const matchesSearch = !q
        || c.businessName?.toLowerCase().includes(q)
        || c.taxId?.toLowerCase().includes(q)
        || c.email?.toLowerCase().includes(q)
      return matchesBucket && matchesSearch
    })
  }, [data.debtors, search, bucketFilter])

  const exportCSV = () => {
    const headers = ['Cliente', 'CUIT', 'Saldo pendiente', 'Antigüedad (días)', 'Bucket', 'Email', 'Teléfono']
    const rows = filteredDebtors.map((c) => [
      `"${c.businessName}"`,
      c.taxId || '',
      c.debtAmount,
      c.daysSinceLastOrder,
      c.bucket,
      c.email || '',
      c.phone || '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cobranzas_${arToday()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sendWhatsAppReminder = (c) => {
    const phone = (c.phone || '').replace(/[^0-9]/g, '')
    if (!phone) {
      window.alert('Este cliente no tiene teléfono cargado.')
      return
    }
    const msg = encodeURIComponent(
      `Hola ${c.businessName}, te recordamos que tenés un saldo pendiente de ${formatCurrency(c.debtAmount)} con nosotros. Cualquier consulta estamos a disposición. Gracias!`
    )
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  // colores por bucket (consistente con KPI)
  const BUCKET_META = {
    '0-30':  { tone: 'tone-slate',  pill: 'neutral', color: '#64748b', label: '0–30 días',  desc: 'Riesgo bajo' },
    '31-60': { tone: 'tone-blue',   pill: 'info',    color: '#1A1FBE', label: '31–60 días', desc: 'Atención comercial' },
    '61-90': { tone: 'tone-amber',  pill: 'warning', color: '#d97706', label: '61–90 días', desc: 'Riesgo medio' },
    '90+':   { tone: 'tone-red',    pill: 'danger',  color: '#dc2626', label: '90+ días',   desc: 'Crítico' },
  }

  const totalForBars = data.total || 1

  return (
    <>
    <section className="px-section">
      {/* Header */}
      <div className="px-header">
        <div className="px-header-left">
          <span className="px-eyebrow">Cuentas por cobrar</span>
          <h2 className="px-title">Cobranzas</h2>
          <p className="px-subtitle">
            {data.debtors.length} {data.debtors.length === 1 ? 'cliente debe' : 'clientes deben'} ·{' '}
            <strong style={{ color: '#dc2626' }}>{formatCurrency(data.total)}</strong> en total
          </p>
        </div>
        <div className="px-header-actions">
          <button type="button" className="px-btn secondary" onClick={exportCSV} disabled={filteredDebtors.length === 0}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M4 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="px-kpi-bar">
        <div className="px-kpi tone-red">
          <span className="px-kpi-label">Deuda total</span>
          <span className="px-kpi-value">{formatCurrency(data.total)}</span>
          <span className="px-kpi-sub">{data.debtors.length} clientes con saldo</span>
        </div>
        {Object.entries(data.buckets).map(([bucket, amount]) => {
          const meta = BUCKET_META[bucket]
          return (
            <div key={bucket} className={`px-kpi ${meta.tone}`}>
              <span className="px-kpi-label">{meta.label}</span>
              <span className="px-kpi-value">{formatCurrency(amount)}</span>
              <span className="px-kpi-sub">{data.counts[bucket]} clientes · {meta.desc}</span>
            </div>
          )
        })}
      </div>

      {/* Aging stacked bar */}
      {data.total > 0 && (
        <article className="px-card">
          <div className="px-card-head">
            <div>
              <h3 className="px-card-title">Distribución por antigüedad</h3>
              <p className="px-card-sub">Composición visual de la deuda activa</p>
            </div>
          </div>
          <div className="px-stack-bar" role="img" aria-label="Distribución de deuda por antigüedad">
            {Object.entries(data.buckets).map(([bucket, amount]) => {
              const pct = (amount / totalForBars) * 100
              if (pct < 0.5) return null
              return (
                <span
                  key={bucket}
                  style={{ width: `${pct}%`, background: BUCKET_META[bucket].color }}
                  title={`${BUCKET_META[bucket].label}: ${formatCurrency(amount)} (${pct.toFixed(0)}%)`}
                />
              )
            })}
          </div>
          <div className="px-stack-legend">
            {Object.entries(data.buckets).map(([bucket, amount]) => {
              const pct = data.total > 0 ? Math.round((amount / data.total) * 100) : 0
              return (
                <span key={bucket} className="px-stack-legend-item">
                  <span className="dot" style={{ background: BUCKET_META[bucket].color }} />
                  {BUCKET_META[bucket].label} · <strong>{pct}%</strong>
                </span>
              )
            })}
          </div>
        </article>
      )}

      {/* Toolbar */}
      <div className="px-toolbar">
        <div className="px-toolbar-left">
          <div className="px-search">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar deudor por nombre, CUIT o email…"
            />
          </div>
          <div className="px-segmented">
            {['Todos', '0-30', '31-60', '61-90', '90+'].map((b) => (
              <button
                key={b}
                type="button"
                className={bucketFilter === b ? 'active' : ''}
                onClick={() => setBucketFilter(b)}
              >
                {b === 'Todos' ? 'Todos' : `${b} días`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredDebtors.length === 0 ? (
        <div className={data.debtors.length === 0 ? 'px-empty success' : 'px-empty'}>
          {data.debtors.length === 0
            ? '✓ Sin saldos pendientes — todas las cuentas al día'
            : 'Sin deudores que coincidan con los filtros'}
        </div>
      ) : (
        <div className="px-table-wrap">
          <table className="px-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="right">Saldo</th>
                <th>Antigüedad</th>
                <th>% Límite</th>
                <th>Contacto</th>
                <th className="center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.map((c) => {
                const displayBalance = localBalances[c.id] !== undefined ? localBalances[c.id] : c.debtAmount
                const usage = c.creditLimit > 0
                  ? Math.round((displayBalance / c.creditLimit) * 100)
                  : 0
                const meta = BUCKET_META[c.bucket]
                const isCleared = localBalances[c.id] !== undefined && localBalances[c.id] === 0
                return (
                  <tr key={c.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => onOpenClient(c.id)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{c.businessName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {c.taxId ? `CUIT ${c.taxId}` : c.email}
                        </div>
                      </button>
                    </td>
                    <td className="right">
                      <span className={`px-money ${isCleared ? 'cleared' : displayBalance > 0 ? 'debt' : 'muted'}`}>
                        {isCleared ? '✓ Saldado' : formatCurrency(displayBalance)}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                        {c.daysSinceLastOrder} días sin compras
                      </div>
                    </td>
                    <td>
                      <span className={`px-pill ${meta.pill}`}>{meta.label}</span>
                    </td>
                    <td>
                      {c.creditLimit > 0 ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginBottom: 3 }}>
                            <span>{usage}%</span>
                            <span style={{ color: '#94a3b8' }}>{formatCurrency(c.creditLimit)}</span>
                          </div>
                          <div className={`px-progress${usage > 100 ? ' danger' : usage > 80 ? ' warning' : ''}`}>
                            <span style={{ width: `${Math.min(usage, 100)}%` }} />
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>Sin límite</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {c.phone || <span style={{ color: '#cbd5e1' }}>Sin teléfono</span>}
                      </div>
                      {c.email && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.email}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="px-btn px-btn-sm success"
                          onClick={() => handleOpenPago(c)}
                          disabled={isCleared}
                          title="Registrar pago / nota de crédito"
                        >
                          Reg. pago
                        </button>
                        <button
                          type="button"
                          className="px-btn px-btn-sm ghost"
                          onClick={() => sendWhatsAppReminder(c)}
                          title="Enviar recordatorio por WhatsApp"
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          className="px-btn px-btn-sm ghost"
                          onClick={() => onOpenClient(c.id)}
                          title="Ver ficha del cliente"
                        >
                          Ficha
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>

    {/* Payment modal */}
    {pagoModal ? (
      <div className="px-modal-backdrop" role="presentation" onClick={() => setPagoModal(null)}>
        <div className="px-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="px-modal-head">
            <div>
              <span className="px-eyebrow">Cuenta corriente</span>
              <h3>Registrar movimiento</h3>
              <p className="px-card-sub" style={{ marginTop: 2 }}>
                {pagoModal.businessName} · Saldo actual:{' '}
                <strong style={{ color: '#dc2626' }}>{formatCurrency(Number(pagoModal.pendingBalance) || 0)}</strong>
              </p>
            </div>
            <button type="button" className="px-modal-close" onClick={() => setPagoModal(null)}>✕</button>
          </div>
          <div className="px-modal-body">
            <div className="px-field">
              <label className="px-field-label">Tipo de movimiento</label>
              <select
                className="px-select"
                value={pagoForm.tipo}
                onChange={(e) => setPagoForm((p) => ({ ...p, tipo: e.target.value }))}
              >
                <option value="pago">Pago del cliente</option>
                <option value="nota_credito">Nota de crédito</option>
                <option value="ajuste">Ajuste de saldo</option>
              </select>
            </div>
            <div className="px-field">
              <label className="px-field-label">Monto ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="px-input"
                placeholder="Ej: 15000"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm((p) => ({ ...p, monto: e.target.value }))}
                autoFocus
              />
              {pagoForm.monto && !isNaN(parseFloat(pagoForm.monto)) && pagoForm.tipo === 'pago' && (
                <small style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                  Nuevo saldo después del pago:{' '}
                  <strong>
                    {formatCurrency(Math.max(0, (Number(pagoModal.pendingBalance) || 0) - parseFloat(pagoForm.monto)))}
                  </strong>
                </small>
              )}
            </div>
            <div className="px-field">
              <label className="px-field-label">Descripción (opcional)</label>
              <input
                type="text"
                className="px-input"
                placeholder="Ej: Transferencia 15/05 - Banco Galicia"
                value={pagoForm.descripcion}
                onChange={(e) => setPagoForm((p) => ({ ...p, descripcion: e.target.value }))}
              />
            </div>
            {pagoError ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                {pagoError}
              </div>
            ) : null}
          </div>
          <div className="px-modal-foot">
            <button type="button" className="px-btn secondary" onClick={() => setPagoModal(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="px-btn primary"
              onClick={handleConfirmPago}
              disabled={pagoSaving}
            >
              {pagoSaving ? 'Guardando…' : 'Confirmar movimiento'}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  )
}

// ─── Reportes: análisis profundo de ventas, productos y clientes ───────────
function ReportesSection({ orders, products, clients, ordersWithClient }) {
  const [periodo, setPeriodo] = useState(30)

  const computePeriod = (ordersList, days) => {
    const cutoff = arStartOfDay(days)
    return ordersList.filter((o) => new Date(o.createdAt).getTime() >= cutoff)
  }

  const computePrevPeriod = (ordersList, days) => {
    const start = arStartOfDay(days * 2)
    const end   = arStartOfDay(days)
    return ordersList.filter((o) => {
      const t = new Date(o.createdAt).getTime()
      return t >= start && t < end
    })
  }

  const data = useMemo(() => {
    const ordersInPeriod = computePeriod(ordersWithClient, periodo)
    const ordersPrev     = computePrevPeriod(ordersWithClient, periodo)

    // Top productos
    const productMap = new Map()
    ordersInPeriod.forEach((o) => {
      (o.items || []).forEach((item) => {
        const cur = productMap.get(item.productId) || { units: 0, revenue: 0 }
        cur.units += Number(item.qty) || 0
        cur.revenue += (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)
        productMap.set(item.productId, cur)
      })
    })
    const topProducts = [...productMap.entries()]
      .map(([pid, v]) => {
        const p = products.find((x) => x.id === pid)
        return {
          id: pid,
          name: p?.name || `Producto ${pid}`,
          sku: p?.sku || '—',
          category: p?.category || '—',
          ...v,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Top clientes
    const clientMap = new Map()
    ordersInPeriod.forEach((o) => {
      const cur = clientMap.get(o.clientId) || { revenue: 0, orders: 0 }
      cur.revenue += Number(o.total) || 0
      cur.orders += 1
      clientMap.set(o.clientId, cur)
    })
    const topClients = [...clientMap.entries()]
      .map(([cid, v]) => {
        const c = clients.find((x) => x.id === cid)
        return { id: cid, name: c?.businessName || 'Desconocido', tier: c?.tier || 'Asociado', ...v }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Categories breakdown
    const categoryMap = new Map()
    ordersInPeriod.forEach((o) => {
      (o.items || []).forEach((item) => {
        const p = products.find((x) => x.id === item.productId)
        const cat = p?.category || 'Sin categoría'
        const cur = categoryMap.get(cat) || 0
        categoryMap.set(cat, cur + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0))
      })
    })
    const categories = [...categoryMap.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    // Totales y comparación
    const revenue       = ordersInPeriod.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const revenuePrev   = ordersPrev.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const avgTicket     = ordersInPeriod.length > 0 ? Math.round(revenue / ordersInPeriod.length) : 0
    const avgTicketPrev = ordersPrev.length > 0 ? Math.round(revenuePrev / ordersPrev.length) : 0
    const uniqueClients = new Set(ordersInPeriod.map((o) => o.clientId)).size
    const uniqueClientsPrev = new Set(ordersPrev.map((o) => o.clientId)).size

    const delta = (curr, prev) => {
      if (!prev || prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 100)
    }

    // Daily trend buckets (for chart)
    const dayBuckets = []
    for (let i = periodo - 1; i >= 0; i--) {
      const ts = arStartOfDay(i)
      dayBuckets.push({ ts, value: 0, label: arDateOf(new Date(ts)).slice(5) }) // 'MM-DD'
    }
    ordersInPeriod.forEach((o) => {
      const t = new Date(o.createdAt).getTime()
      const idx = Math.floor((t - dayBuckets[0].ts) / (24 * 60 * 60 * 1000))
      if (idx >= 0 && idx < dayBuckets.length) {
        dayBuckets[idx].value += Number(o.total) || 0
      }
    })

    return {
      ordersInPeriod,
      ordersPrev,
      topProducts,
      topClients,
      categories,
      revenue,
      revenuePrev,
      revenueDelta: delta(revenue, revenuePrev),
      avgTicket,
      avgTicketDelta: delta(avgTicket, avgTicketPrev),
      uniqueClients,
      uniqueClientsDelta: delta(uniqueClients, uniqueClientsPrev),
      orderCount: ordersInPeriod.length,
      orderCountDelta: delta(ordersInPeriod.length, ordersPrev.length),
      dayBuckets,
      freq: uniqueClients > 0 ? (ordersInPeriod.length / uniqueClients).toFixed(1) : '0',
    }
  }, [ordersWithClient, products, clients, periodo])

  const exportCSV = () => {
    const headers = ['Pedido', 'Fecha', 'Cliente', 'Estado', 'Items', 'Total']
    const rows = data.ordersInPeriod.map((o) => [
      o.id,
      arDateOf(o.createdAt),
      `"${o.clientName || ''}"`,
      o.status,
      (o.items || []).length,
      Number(o.total) || 0,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${periodo}d_${arToday()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderDelta = (delta) => {
    if (delta === 0) return <span className="px-kpi-delta" style={{ color: '#94a3b8' }}>—</span>
    return (
      <span className={`px-kpi-delta ${delta > 0 ? 'up' : 'down'}`}>
        {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}% vs período anterior
      </span>
    )
  }

  const maxDayValue = Math.max(...data.dayBuckets.map((d) => d.value), 1)
  const maxCategoryValue = Math.max(...data.categories.map((c) => c.revenue), 1)
  const maxProductRevenue = Math.max(...data.topProducts.map((p) => p.revenue), 1)
  const maxClientRevenue = Math.max(...data.topClients.map((c) => c.revenue), 1)

  return (
    <section className="px-section">
      {/* Header */}
      <div className="px-header">
        <div className="px-header-left">
          <span className="px-eyebrow">Análisis</span>
          <h2 className="px-title">Reportes de venta</h2>
          <p className="px-subtitle">Período comparado con el anterior · Hora Argentina</p>
        </div>
        <div className="px-header-actions">
          <div className="px-segmented">
            {[7, 30, 90, 180].map((d) => (
              <button
                key={d}
                type="button"
                className={periodo === d ? 'active' : ''}
                onClick={() => setPeriodo(d)}
              >
                {d === 7 ? '7 días' : d === 30 ? '30 días' : d === 90 ? '3 meses' : '6 meses'}
              </button>
            ))}
          </div>
          <button type="button" className="px-btn secondary" onClick={exportCSV} disabled={data.orderCount === 0}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M4 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI bar with deltas */}
      <div className="px-kpi-bar">
        <div className="px-kpi tone-blue">
          <span className="px-kpi-label">Facturación</span>
          <span className="px-kpi-value">{formatCurrency(data.revenue)}</span>
          {renderDelta(data.revenueDelta)}
        </div>
        <div className="px-kpi tone-violet">
          <span className="px-kpi-label">Pedidos</span>
          <span className="px-kpi-value">{data.orderCount}</span>
          {renderDelta(data.orderCountDelta)}
        </div>
        <div className="px-kpi tone-green">
          <span className="px-kpi-label">Ticket promedio</span>
          <span className="px-kpi-value">{formatCurrency(data.avgTicket)}</span>
          {renderDelta(data.avgTicketDelta)}
        </div>
        <div className="px-kpi tone-amber">
          <span className="px-kpi-label">Clientes activos</span>
          <span className="px-kpi-value">{data.uniqueClients}</span>
          {renderDelta(data.uniqueClientsDelta)}
        </div>
        <div className="px-kpi tone-slate">
          <span className="px-kpi-label">Frecuencia</span>
          <span className="px-kpi-value">{data.freq}</span>
          <span className="px-kpi-sub">Pedidos por cliente</span>
        </div>
      </div>

      {/* Daily trend chart */}
      <article className="px-card">
        <div className="px-card-head">
          <div>
            <h3 className="px-card-title">Facturación diaria</h3>
            <p className="px-card-sub">Tendencia de los últimos {periodo} días (hora Argentina)</p>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Pico: <strong style={{ color: '#0f172a' }}>{formatCurrency(maxDayValue)}</strong>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.dayBuckets.length}, 1fr)`,
          gap: 2,
          alignItems: 'end',
          height: 140,
          padding: '0.5rem 0',
        }}>
          {data.dayBuckets.map((d, i) => {
            const h = (d.value / maxDayValue) * 100
            return (
              <div
                key={i}
                title={`${d.label}: ${formatCurrency(d.value)}`}
                style={{
                  height: `${Math.max(h, d.value > 0 ? 4 : 0)}%`,
                  background: d.value > 0 ? '#1A1FBE' : '#f1f5f9',
                  minHeight: 1,
                  transition: 'height 0.3s',
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </div>
        {periodo <= 30 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${data.dayBuckets.length}, 1fr)`,
            gap: 2,
            fontSize: '0.62rem',
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: 4,
          }}>
            {data.dayBuckets.map((d, i) => (
              <span key={i} style={{ overflow: 'hidden' }}>
                {i % Math.max(1, Math.floor(data.dayBuckets.length / 8)) === 0 ? d.label : ''}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* 2-column grid: products + clients */}
      <div className="px-grid-2">
        {/* Top productos */}
        <article className="px-card">
          <div className="px-card-head">
            <div>
              <h3 className="px-card-title">Top productos</h3>
              <p className="px-card-sub">Los 10 que más facturaron</p>
            </div>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="px-empty">Sin ventas en el período</div>
          ) : (
            <div className="px-table-wrap" style={{ border: 'none' }}>
              <table className="px-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Producto</th>
                    <th className="right">Unidades</th>
                    <th className="right">Facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p.id}>
                      <td>
                        <span className={`px-rank-cell${i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.sku} · {p.category}</div>
                        <div className="px-progress" style={{ marginTop: 4, height: 4 }}>
                          <span style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }} />
                        </div>
                      </td>
                      <td className="right"><strong>{p.units}</strong></td>
                      <td className="right"><span className="px-money">{formatCurrency(p.revenue)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {/* Top clientes */}
        <article className="px-card">
          <div className="px-card-head">
            <div>
              <h3 className="px-card-title">Top clientes</h3>
              <p className="px-card-sub">Mayor facturación del período</p>
            </div>
          </div>
          {data.topClients.length === 0 ? (
            <div className="px-empty">Sin clientes en el período</div>
          ) : (
            <div className="px-table-wrap" style={{ border: 'none' }}>
              <table className="px-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Cliente</th>
                    <th className="right">Pedidos</th>
                    <th className="right">Facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topClients.map((c, i) => (
                    <tr key={c.id}>
                      <td>
                        <span className={`px-rank-cell${i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.tier}</div>
                        <div className="px-progress" style={{ marginTop: 4, height: 4 }}>
                          <span style={{ width: `${(c.revenue / maxClientRevenue) * 100}%` }} />
                        </div>
                      </td>
                      <td className="right"><strong>{c.orders}</strong></td>
                      <td className="right"><span className="px-money">{formatCurrency(c.revenue)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      {/* Categories breakdown */}
      {data.categories.length > 0 && (
        <article className="px-card">
          <div className="px-card-head">
            <div>
              <h3 className="px-card-title">Facturación por categoría</h3>
              <p className="px-card-sub">Distribución del total facturado</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.categories.map((cat) => {
              const pct = (cat.revenue / data.revenue) * 100
              return (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{cat.name}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(cat.revenue)}</strong>
                      {' · '}{pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="px-progress" style={{ height: 8 }}>
                    <span style={{ width: `${(cat.revenue / maxCategoryValue) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      )}
    </section>
  )
}

// ─── Promociones: CRUD básico de campañas y descuentos ─────────────────────
const PROMOS_STORAGE_KEY = 'nexo-promociones'

function PromocionesSection() {
  const [promos, setPromos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'percent',
    valor: '',
    alcance: 'todos',
    tier: 'Asociado',
    inicio: arToday(),
    fin: '',
    activa: true,
  })

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PROMOS_STORAGE_KEY) || '[]')
      setPromos(stored)
    } catch { /* noop */ }
  }, [])

  const save = (next) => {
    setPromos(next)
    localStorage.setItem(PROMOS_STORAGE_KEY, JSON.stringify(next))
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.nombre || !form.valor) return
    const newPromo = { ...form, id: `PRM-${Date.now()}`, valor: Number(form.valor) }
    save([newPromo, ...promos])
    setShowForm(false)
    setForm({
      nombre: '', tipo: 'percent', valor: '', alcance: 'todos',
      tier: 'Asociado', inicio: arToday(), fin: '', activa: true,
    })
  }

  const handleToggle = (id) => {
    save(promos.map((p) => (p.id === id ? { ...p, activa: !p.activa } : p)))
  }

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar esta promoción?')) return
    save(promos.filter((p) => p.id !== id))
  }

  return (
    <section className="admin-section">
      <article className="admin-card">
        <div className="admin-section-header">
          <div>
            <span className="admin-card-eyebrow">Campañas y descuentos</span>
            <h2>Promociones activas</h2>
          </div>
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancelar' : '+ Nueva promoción'}
          </button>
        </div>

        {showForm && (
          <form className="admin-promo-form" onSubmit={handleCreate}>
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Descuento 10% en látex"
                required
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="percent">Porcentual (%)</option>
                <option value="fixed">Monto fijo ($)</option>
                <option value="shipping">Envío gratis</option>
              </select>
            </label>
            <label className="field">
              <span>Valor</span>
              <input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                disabled={form.tipo === 'shipping'}
                placeholder={form.tipo === 'percent' ? '10' : '5000'}
                required={form.tipo !== 'shipping'}
              />
            </label>
            <label className="field">
              <span>Alcance</span>
              <select
                value={form.alcance}
                onChange={(e) => setForm({ ...form, alcance: e.target.value })}
              >
                <option value="todos">Todos los clientes</option>
                <option value="tier">Por nivel</option>
              </select>
            </label>
            {form.alcance === 'tier' && (
              <label className="field">
                <span>Nivel</span>
                <select
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value })}
                >
                  {TIER_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            )}
            <label className="field">
              <span>Desde</span>
              <input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
            </label>
            <label className="field">
              <span>Hasta</span>
              <input type="date" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} />
            </label>
            <div className="admin-promo-form-actions">
              <button type="submit" className="admin-primary-btn">Crear promoción</button>
            </div>
          </form>
        )}

        {promos.length === 0 ? (
          <div className="admin-empty-state">
            <p>Aún no creaste ninguna promoción.</p>
            <small>Las promociones te permiten aplicar descuentos automáticos a clientes específicos o por nivel.</small>
          </div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-row admin-table-head admin-promos-grid">
              <span>Promoción</span>
              <span>Tipo</span>
              <span>Alcance</span>
              <span>Vigencia</span>
              <span>Estado</span>
              <span></span>
            </div>
            {promos.map((p) => (
              <div key={p.id} className="admin-table-row admin-promos-grid">
                <strong>{p.nombre}</strong>
                <span>
                  {p.tipo === 'percent' && `${p.valor}% off`}
                  {p.tipo === 'fixed' && `${formatCurrency(p.valor)} off`}
                  {p.tipo === 'shipping' && 'Envío gratis'}
                </span>
                <span>
                  {p.alcance === 'todos' ? 'Todos' : `Nivel ${p.tier}`}
                </span>
                <small>
                  {p.inicio}{p.fin ? ` → ${p.fin}` : ''}
                </small>
                <button
                  type="button"
                  className={`admin-pill ${p.activa ? 'success' : 'neutral'}`}
                  onClick={() => handleToggle(p.id)}
                >
                  {p.activa ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  type="button"
                  className="admin-action-btn danger"
                  onClick={() => handleDelete(p.id)}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

// ─── Global topbar: search + notifications + profile dropdown ──────────────
function AdminGlobalTopbar({ session, clients, products, orders, alerts, onLogout, onNavigate }) {
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const searchRef = useRef(null)
  const notifsRef = useRef(null)
  const profileRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false)
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Search across clients, products, orders
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return null
    const clientHits = clients
      .filter((c) =>
        (c.businessName || '').toLowerCase().includes(q) ||
        (c.taxId || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((c) => ({ type: 'cliente', id: c.id, title: c.businessName, sub: c.taxId || c.email }))
    const productHits = products
      .filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((p) => ({ type: 'producto', id: p.id, title: p.name, sub: `SKU ${p.sku || '—'} · Stock ${p.currentStock ?? 0}` }))
    const orderHits = orders
      .filter((o) => String(o.id).toLowerCase().includes(q))
      .slice(0, 3)
      .map((o) => ({ type: 'pedido', id: o.id, title: `Pedido ${o.id}`, sub: `${o.status} · $${o.total}` }))
    return [...clientHits, ...productHits, ...orderHits]
  }, [search, clients, products, orders])

  const handleResultClick = (result) => {
    setShowResults(false)
    setSearch('')
    if (result.type === 'cliente') onNavigate('clientes', { clientId: result.id })
    else if (result.type === 'producto') onNavigate('stock')
    else if (result.type === 'pedido') onNavigate('pedidos')
  }

  const initials = (session?.name || 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="admin-global-topbar">
      <div className="admin-global-search" ref={searchRef}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="admin-global-search-icon">
          <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Buscar cliente, producto o pedido…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowResults(true) }}
          onFocus={() => setShowResults(true)}
        />
        {showResults && searchResults && (
          <div className="admin-global-search-results">
            {searchResults.length === 0 ? (
              <div className="admin-search-empty">Sin resultados para "{search}"</div>
            ) : (
              searchResults.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  className="admin-search-result"
                  onClick={() => handleResultClick(r)}
                >
                  <span className={`admin-pill ${r.type === 'cliente' ? 'info' : r.type === 'producto' ? 'success' : 'warning'}`}>
                    {r.type}
                  </span>
                  <div>
                    <strong>{r.title}</strong>
                    <small>{r.sub}</small>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="admin-global-actions">
        <div className="admin-global-notif" ref={notifsRef}>
          <button
            type="button"
            className="admin-global-icon-btn"
            onClick={() => setShowNotifs((v) => !v)}
            aria-label="Notificaciones"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {alerts.length > 0 && <span className="admin-global-notif-dot">{alerts.length}</span>}
          </button>
          {showNotifs && (
            <div className="admin-global-dropdown">
              <div className="admin-global-dropdown-header">
                <strong>Notificaciones</strong>
                <small>{alerts.length} pendiente{alerts.length === 1 ? '' : 's'}</small>
              </div>
              {alerts.length === 0 ? (
                <div className="admin-global-dropdown-empty">Todo en orden ✓</div>
              ) : (
                <div className="admin-global-dropdown-list">
                  {alerts.slice(0, 6).map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      className="admin-global-dropdown-item"
                      onClick={() => { setShowNotifs(false); a.action?.() }}
                    >
                      <span className={`admin-pill ${a.tone}`}>{a.kind}</span>
                      <span>{a.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-global-profile" ref={profileRef}>
          <button
            type="button"
            className="admin-global-profile-btn"
            onClick={() => setShowProfile((v) => !v)}
          >
            <span className="admin-global-avatar">{initials}</span>
            <span className="admin-global-profile-name">{session?.name || 'Admin'}</span>
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {showProfile && (
            <div className="admin-global-dropdown admin-global-dropdown-right">
              <div className="admin-global-profile-info">
                <strong>{session?.name || 'Admin'}</strong>
                <small>{session?.email || ''}</small>
              </div>
              <button
                type="button"
                className="admin-global-dropdown-item"
                onClick={() => { setShowProfile(false); onNavigate('configuracion') }}
              >
                Configuración
              </button>
              <button
                type="button"
                className="admin-global-dropdown-item danger"
                onClick={() => { setShowProfile(false); onLogout() }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cotizaciones: flujo previo al pedido ──────────────────────────────────
const COTIZACION_ESTADOS = [
  { id: 'solicitada', label: 'Solicitud de cliente', tone: 'warning' },
  { id: 'borrador', label: 'Borrador', tone: 'neutral' },
  { id: 'enviada', label: 'Enviada al cliente', tone: 'info' },
  { id: 'aceptada', label: 'Aceptada', tone: 'success' },
  { id: 'rechazada', label: 'Rechazada', tone: 'danger' },
  { id: 'vencida', label: 'Vencida', tone: 'warning' },
  { id: 'convertida', label: 'Convertida en pedido', tone: 'success' },
]

function CotizacionesSection({ clients, products }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    client_json_id: '',
    vencimiento: (() => {
      const [y,mo,dy] = arToday().split('-').map(Number); return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(Date.UTC(y,mo-1,dy+15,3,0,0,0)))
    })(),
    items: [{ productId: '', qty: 1, unitPrice: 0 }],
    descuento: 0,
    notas: '',
  })

  const loadCotizaciones = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/cotizaciones', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.ok) setCotizaciones(data.cotizaciones || [])
    } catch { /* noop */ }
    setLoading(false)
    setLoaded(true)
  }

  useEffect(() => { if (!loaded) loadCotizaciones() }, []) // eslint-disable-line

  const resetForm = () => {
    setForm({
      client_json_id: '',
      vencimiento: (() => {
        const [y,mo,dy] = arToday().split('-').map(Number); return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(Date.UTC(y,mo-1,dy+15,3,0,0,0)))
      })(),
      items: [{ productId: '', qty: 1, unitPrice: 0 }],
      descuento: 0,
      notas: '',
    })
    setEditing(null)
    setShowForm(false)
  }

  const computeTotals = (items, descuento) => {
    const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0)
    const total = Math.max(subtotal - (Number(descuento) || 0), 0)
    return { subtotal, total }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_json_id) return alert('Seleccioná un cliente.')
    if (form.items.length === 0 || form.items.every((it) => !it.productId)) {
      return alert('Agregá al menos un producto.')
    }

    const validItems = form.items.filter((it) => it.productId && Number(it.qty) > 0)
    const itemsWithName = validItems.map((it) => {
      const p = products.find((x) => String(x.id) === String(it.productId))
      return {
        productId: it.productId,
        productName: p?.name || 'Producto',
        sku: p?.sku || '',
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.qty) * Number(it.unitPrice),
      }
    })

    const client = clients.find((c) => String(c.id) === String(form.client_json_id))
    const { subtotal, total } = computeTotals(itemsWithName, form.descuento)

    // Si es una respuesta a una solicitud de cliente, cambiar estado a 'enviada'
    const esSolicitudCliente = editing?.estado === 'solicitada' && editing?.origen === 'cliente'

    const payload = {
      client_json_id: Number(form.client_json_id),
      vencimiento: form.vencimiento,
      items: itemsWithName,
      subtotal,
      descuento: Number(form.descuento) || 0,
      total,
      datos_cliente: client ? {
        businessName: client.businessName,
        taxId: client.taxId,
        email: client.email,
      } : null,
      notas: form.notas || null,
      ...(esSolicitudCliente ? { estado: 'enviada' } : {}),
    }

    const token = getAuthToken()
    const method = editing ? 'PUT' : 'POST'
    const url = editing ? `/api/admin/cotizaciones/${editing.id}` : '/api/admin/cotizaciones'

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.ok) return alert(data.message || 'Error guardando la cotización.')
      resetForm()
      loadCotizaciones()
    } catch (err) {
      alert('Error de red: ' + err.message)
    }
  }

  const handleEdit = (c) => {
    const items = Array.isArray(c.items) ? c.items : []
    setForm({
      client_json_id: String(c.client_json_id),
      vencimiento: c.vencimiento?.slice(0, 10) || '',
      items: items.length ? items.map((it) => ({
        productId: String(it.productId),
        qty: it.qty,
        unitPrice: it.unitPrice,
      })) : [{ productId: '', qty: 1, unitPrice: 0 }],
      descuento: Number(c.descuento) || 0,
      notas: c.notas || '',
    })
    setEditing(c)
    setShowForm(true)
  }

  const handleChangeEstado = async (id, nuevoEstado) => {
    const token = getAuthToken()
    try {
      const res = await fetch(`/api/admin/cotizaciones/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      const data = await res.json()
      if (data.ok) loadCotizaciones()
    } catch { /* noop */ }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return
    const token = getAuthToken()
    try {
      const res = await fetch(`/api/admin/cotizaciones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) loadCotizaciones()
    } catch { /* noop */ }
  }

  const handlePrint = (c) => {
    const items = Array.isArray(c.items) ? c.items : []
    const datos = c.datos_cliente || {}
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${c.numero}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #18181b; max-width: 800px; margin: auto; }
        h1 { margin: 0 0 8px; font-size: 26px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #18181b; margin-bottom: 24px; }
        .brand { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
        .badge { display: inline-block; padding: 4px 10px; background: #f4f4f5; border-radius: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; font-size: 14px; }
        .meta strong { display: block; color: #71717a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { text-align: left; background: #f4f4f5; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #52525b; }
        td { padding: 10px; border-bottom: 1px solid #e4e4e7; }
        .totals { margin-left: auto; width: 280px; }
        .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
        .totals .total { border-top: 2px solid #18181b; margin-top: 6px; padding-top: 10px; font-size: 18px; font-weight: 700; }
        .footer { margin-top: 40px; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 16px; }
        .notas { background: #fafafa; padding: 12px; border-radius: 6px; margin-top: 24px; font-size: 13px; }
      </style>
      </head><body>
        <div class="header">
          <div>
            <div class="brand">Nexoft</div>
            <small>Plataforma mayorista</small>
          </div>
          <span class="badge">${c.numero}</span>
        </div>
        <h1>Cotización</h1>
        <div class="meta">
          <div><strong>Cliente</strong>${datos.businessName || 'Cliente'}<br><small>${datos.taxId || ''}</small></div>
          <div><strong>Vencimiento</strong>${c.vencimiento?.slice(0, 10) || '—'}</div>
          <div><strong>Fecha</strong>${c.fecha?.slice(0, 10) || ''}</div>
          <div><strong>Estado</strong>${c.estado}</div>
        </div>
        <table>
          <thead><tr><th>Producto</th><th>SKU</th><th>Cant.</th><th>Unitario</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${items.map((it) => `<tr><td>${it.productName}</td><td>${it.sku || '—'}</td><td>${it.qty}</td><td>$${Number(it.unitPrice).toLocaleString('es-AR')}</td><td>$${Number(it.subtotal).toLocaleString('es-AR')}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><strong>$${Number(c.subtotal).toLocaleString('es-AR')}</strong></div>
          ${Number(c.descuento) > 0 ? `<div><span>Descuento</span><strong>-$${Number(c.descuento).toLocaleString('es-AR')}</strong></div>` : ''}
          <div class="total"><span>Total</span><strong>$${Number(c.total).toLocaleString('es-AR')}</strong></div>
        </div>
        ${c.notas ? `<div class="notas"><strong>Notas:</strong> ${c.notas}</div>` : ''}
        <div class="footer">Esta cotización es válida hasta ${c.vencimiento?.slice(0, 10) || 'la fecha indicada'}. Sujeta a stock y aprobación crediticia.</div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const filteredCotizaciones = useMemo(() => {
    if (filtroEstado === 'todos') return cotizaciones
    return cotizaciones.filter((c) => c.estado === filtroEstado)
  }, [cotizaciones, filtroEstado])

  const { subtotal: formSubtotal, total: formTotal } = computeTotals(
    form.items.map((it) => ({
      qty: it.qty,
      unitPrice: it.unitPrice,
    })),
    form.descuento,
  )

  const solicitudesCliente = cotizaciones.filter((c) => c.estado === 'solicitada' && c.origen === 'cliente')

  const handleResponderSolicitud = (solicitud) => {
    // Pre-popula el form con los productos que pidió el cliente
    const itemsConPrecio = (Array.isArray(solicitud.items) ? solicitud.items : []).map((it) => {
      const p = products.find((x) => String(x.id) === String(it.productId))
      return {
        productId: String(it.productId),
        qty: Number(it.qty) || 1,
        unitPrice: p?.price || 0,
      }
    })
    setForm({
      client_json_id: String(solicitud.client_json_id),
      vencimiento: (() => { const [y,mo,dy] = arToday().split('-').map(Number); return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(Date.UTC(y,mo-1,dy+15,3,0,0,0))) })(),
      items: itemsConPrecio.length ? itemsConPrecio : [{ productId: '', qty: 1, unitPrice: 0 }],
      descuento: 0,
      notas: solicitud.notas || '',
    })
    setEditing(solicitud)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="admin-section">
      {/* ── SOLICITUDES DE CLIENTES ─────────────────────────────────── */}
      {solicitudesCliente.length > 0 && (
        <article className="admin-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="admin-section-header">
            <div>
              <span className="admin-card-eyebrow" style={{ color: '#b45309' }}>Acción requerida</span>
              <h2>Solicitudes de cotización de clientes ({solicitudesCliente.length})</h2>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head" style={{ gridTemplateColumns: '1fr 1fr auto auto' }}>
              <span>Cliente</span>
              <span>Productos solicitados</span>
              <span>Fecha</span>
              <span></span>
            </div>
            {solicitudesCliente.map((s) => {
              const clientObj = clients.find((c) => c.id === s.client_json_id || c.id === Number(s.client_json_id))
              const items = Array.isArray(s.items) ? s.items : []
              return (
                <div key={s.id} className="admin-table-row" style={{ gridTemplateColumns: '1fr 1fr auto auto', alignItems: 'center' }}>
                  <div>
                    <strong>{clientObj?.businessName || s.datos_cliente?.businessName || `Cliente #${s.client_json_id}`}</strong>
                    <small>{s.numero}</small>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                    {items.slice(0, 3).map((it, i) => (
                      <div key={i}>{it.productName} × {it.qty}</div>
                    ))}
                    {items.length > 3 && <small style={{ color: '#94a3b8' }}>+ {items.length - 3} más</small>}
                  </div>
                  <small style={{ color: '#94a3b8' }}>{s.creado_at?.slice(0, 10) || '—'}</small>
                  <button
                    type="button"
                    className="admin-primary-btn"
                    onClick={() => handleResponderSolicitud(s)}
                  >
                    Responder con precios
                  </button>
                </div>
              )
            })}
          </div>
        </article>
      )}

      <article className="admin-card">
        <div className="admin-section-header">
          <div>
            <span className="admin-card-eyebrow">Pre-ventas</span>
            <h2>Cotizaciones</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="admin-select"
            >
              <option value="todos">Todos los estados</option>
              {COTIZACION_ESTADOS.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="admin-primary-btn"
              onClick={() => { resetForm(); setShowForm(true) }}
            >
              + Nueva cotización
            </button>
          </div>
        </div>

        {showForm && (
          <form className="admin-cotizacion-form" onSubmit={handleSubmit}>
            <div className="admin-cotizacion-form-row">
              <label className="field">
                <span>Cliente</span>
                <select
                  value={form.client_json_id}
                  onChange={(e) => setForm({ ...form, client_json_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar cliente…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} {c.taxId ? `· ${c.taxId}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Válida hasta</span>
                <input
                  type="date"
                  value={form.vencimiento}
                  onChange={(e) => setForm({ ...form, vencimiento: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="admin-cotizacion-items">
              <div className="admin-cotizacion-items-head">
                <span>Producto</span>
                <span>Cant.</span>
                <span>Unitario</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              {form.items.map((item, idx) => {
                const lineSub = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)
                return (
                  <div key={idx} className="admin-cotizacion-item-row">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const next = [...form.items]
                        const p = products.find((x) => String(x.id) === e.target.value)
                        next[idx] = {
                          ...next[idx],
                          productId: e.target.value,
                          unitPrice: p?.price || next[idx].unitPrice || 0,
                        }
                        setForm({ ...form, items: next })
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="1" value={item.qty}
                      onChange={(e) => {
                        const next = [...form.items]
                        next[idx] = { ...next[idx], qty: Number(e.target.value) }
                        setForm({ ...form, items: next })
                      }}
                    />
                    <input
                      type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={(e) => {
                        const next = [...form.items]
                        next[idx] = { ...next[idx], unitPrice: Number(e.target.value) }
                        setForm({ ...form, items: next })
                      }}
                    />
                    <strong>{formatCurrency(lineSub)}</strong>
                    <button
                      type="button"
                      className="admin-action-btn danger"
                      onClick={() => {
                        const next = form.items.filter((_, i) => i !== idx)
                        setForm({ ...form, items: next.length ? next : [{ productId: '', qty: 1, unitPrice: 0 }] })
                      }}
                      disabled={form.items.length === 1}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                className="admin-action-btn neutral"
                onClick={() => setForm({ ...form, items: [...form.items, { productId: '', qty: 1, unitPrice: 0 }] })}
              >
                + Agregar línea
              </button>
            </div>

            <div className="admin-cotizacion-form-row">
              <label className="field">
                <span>Descuento ($)</span>
                <input
                  type="number" min="0" step="0.01" value={form.descuento}
                  onChange={(e) => setForm({ ...form, descuento: Number(e.target.value) })}
                />
              </label>
              <label className="field" style={{ gridColumn: 'span 2' }}>
                <span>Notas (opcional)</span>
                <textarea
                  rows="2" value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Condiciones, plazo de entrega, observaciones…"
                />
              </label>
            </div>

            <div className="admin-cotizacion-totals">
              <div><span>Subtotal</span><strong>{formatCurrency(formSubtotal)}</strong></div>
              {Number(form.descuento) > 0 && (
                <div><span>Descuento</span><strong>-{formatCurrency(form.descuento)}</strong></div>
              )}
              <div className="total"><span>Total</span><strong>{formatCurrency(formTotal)}</strong></div>
            </div>

            <div className="admin-cotizacion-form-actions">
              <button type="button" className="admin-action-btn neutral" onClick={resetForm}>
                Cancelar
              </button>
              <button type="submit" className="admin-primary-btn">
                {editing?.origen === 'cliente' && editing?.estado === 'solicitada'
                  ? 'Enviar cotización al cliente'
                  : editing
                  ? 'Actualizar cotización'
                  : 'Crear cotización'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="admin-empty-row">Cargando cotizaciones…</div>
        ) : filteredCotizaciones.length === 0 ? (
          <div className="admin-empty-state">
            <p>No hay cotizaciones {filtroEstado !== 'todos' ? `en estado "${filtroEstado}"` : 'todavía'}.</p>
            <small>Las cotizaciones te permiten armar propuestas comerciales antes de generar un pedido formal.</small>
          </div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-row admin-table-head admin-cotizaciones-grid">
              <span>N°</span>
              <span>Cliente</span>
              <span>Fecha</span>
              <span>Vence</span>
              <span>Total</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {filteredCotizaciones.map((c) => {
              const estado = COTIZACION_ESTADOS.find((e) => e.id === c.estado) || COTIZACION_ESTADOS[0]
              const datos = c.datos_cliente || {}
              return (
                <div key={c.id} className="admin-table-row admin-cotizaciones-grid">
                  <strong>{c.numero}</strong>
                  <div>
                    <strong>{datos.businessName || `Cliente ${c.client_json_id}`}</strong>
                    {datos.taxId ? <small>{datos.taxId}</small> : null}
                  </div>
                  <span>{c.fecha?.slice(0, 10)}</span>
                  <span>{c.vencimiento?.slice(0, 10)}</span>
                  <strong>{formatCurrency(c.total)}</strong>
                  <select
                    className={`admin-pill ${estado.tone}`}
                    style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    value={c.estado}
                    onChange={(e) => handleChangeEstado(c.id, e.target.value)}
                    disabled={c.estado === 'convertida'}
                  >
                    {COTIZACION_ESTADOS.map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button type="button" className="admin-action-btn neutral" onClick={() => handlePrint(c)}>PDF</button>
                    <button type="button" className="admin-action-btn neutral" onClick={() => handleEdit(c)}>Editar</button>
                    <button type="button" className="admin-action-btn danger" onClick={() => handleDelete(c.id)}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )
}

export function AdminDashboard() {
  const { session, logout } = useAuth()
  const {
    clients,
    products,
    orders,
    chats,
    redemptions,
    settings,
    auditLog,
    updateClientPoints,
    updateClientTier,
    updateClientNote,
    updateClientStatus,
    registerClientPayment,
    addQuickClientNote,
    deleteClient,
    saveClient,
    addClientActivity,
    updateProductStock,
    updateProductStockMinimo,
    adjustProductStock,
    deleteProduct,
    createProduct,
    updateProduct,
    importProducts,
    updateTierThreshold,
    updateTierBenefits,
    updateTierBenefitConfig,
    updateAdminSettings,
    updateOrderAdminNotes,
    approveOrder,
    changeOrderStatus,
    cancelOrder,
    approveRedemption,
    openChat,
    sendChatMessage,
    setChatTyping,
  } = useAppData()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')

  // Guard: si la sección activa no está permitida para mi rol, redirigir
  useEffect(() => {
    if (!canSeeSection(session.rol, activeSection)) {
      setActiveSection('dashboard')
    }
  }, [session.rol, activeSection])
  const [clientSearch, setClientSearch] = useState('')
  const [clientLevelFilter, setClientLevelFilter] = useState('Todos')
  const [clientStatusFilter, setClientStatusFilter] = useState('Todos')
  const [clientQuickFilter, setClientQuickFilter] = useState('Todos')
  const [clientSort, setClientSort] = useState({ key: 'businessName', direction: 'asc' })
  const [editingClientId, setEditingClientId] = useState(null)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [paymentClientId, setPaymentClientId] = useState(null)
  const [quickNoteClientId, setQuickNoteClientId] = useState(null)
  const [aiClientId, setAiClientId] = useState(null)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('Todos')
  const [stockSearch, setStockSearch] = useState('')
  const [stockPage, setStockPage] = useState(1)
  const [tierClientSearch, setTierClientSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [auditPage, setAuditPage] = useState(1)
  const [isProductImportOpen, setIsProductImportOpen] = useState(false)
  const [stockAdjustProduct, setStockAdjustProduct] = useState(null)
  const [stockOnlyAlerts, setStockOnlyAlerts] = useState(false)
  const [stockMovHistory, setStockMovHistory] = useState({ productId: null, movimientos: [], loading: false })
  const [facturas, setFacturas] = useState([])
  const [facturasLoading, setFacturasLoading] = useState(false)
  const [facturasLoaded, setFacturasLoaded] = useState(false)
  const [facturaFiltroEstado, setFacturaFiltroEstado] = useState('todos')
  const [usuariosAdmin, setUsuariosAdmin] = useState([])
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', rol: 'vendedor' })
  const [newUserSaving, setNewUserSaving] = useState(false)
  const [newUserError, setNewUserError] = useState('')
  const [usuariosLoaded, setUsuariosLoaded] = useState(false)
  const [listasPreciosData, setListasPreciosData] = useState([])
  const [listasPreciosLoaded, setListasPreciosLoaded] = useState(false)
  const [editingListaPrecio, setEditingListaPrecio] = useState(null)
  const [newListaForm, setNewListaForm] = useState({ nombre: '', descripcion: '' })
  const [selectedChatClientId, setSelectedChatClientId] = useState(null)
  const [adminChatDraft, setAdminChatDraft] = useState('')
  const [adminChatOrderReferenceId, setAdminChatOrderReferenceId] = useState('')
  const [tierBenefitConfigDrafts, setTierBenefitConfigDrafts] = useState({})
  const adminTypingTimeoutRef = useRef(null)
  const adminChatThreadRef = useRef(null)

  const clientsWithTier = useMemo(
    () =>
      clients.map((client) => ({
        ...client,
        loyaltyStatus: getLoyaltyStatus(getClientLifetimePoints(client), settings.tierThresholds),
        tier: getTierByPoints(getClientLifetimePoints(client), settings.tierThresholds).name,
        totalBilled: orders
          .filter((order) => order.clientId === client.id)
          .reduce((sum, order) => sum + (Number(order.total) || 0), 0),
        lastPurchase:
          orders
            .filter((order) => order.clientId === client.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null,
      })),
    [clients, orders, settings.tierThresholds],
  )

  const ordersWithClient = useMemo(
    () =>
      orders
        .map((order) => ({
          ...order,
          client: clientsWithTier.find((client) => client.id === order.clientId) ?? null,
          clientName:
            clientsWithTier.find((client) => client.id === order.clientId)?.businessName ??
            'Cliente sin asignar',
          productsPreview: summarizeOrderProducts(order, products),
          relativeTime: getRelativeTimeLabel(order.createdAt),
          isNew: Date.now() - new Date(order.createdAt).getTime() <= 60 * 60 * 1000,
          needsAttention:
            order.status === 'Pendiente' &&
            Date.now() - new Date(order.createdAt).getTime() > 24 * 60 * 60 * 1000,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders, clientsWithTier, products],
  )

  const lowStockItems = useMemo(
    () =>
      settings.operational?.criticalStockAlerts
        ? products.filter((product) => product.currentStock < 5)
        : [],
    [products, settings.operational?.criticalStockAlerts],
  )
  const deferredStockSearch = useDeferredValue(stockSearch)
  const productIdsInOrders = useMemo(
    () =>
      new Set(
        orders.flatMap((order) => order.items.map((item) => item.productId)),
      ),
    [orders],
  )

  const recentClientsCount = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000

    return clients.filter((client) => {
      const createdAt = new Date(client.createdAt).getTime()
      return Number.isFinite(createdAt) && createdAt >= cutoff
    }).length
  }, [clients])

  const metrics = useMemo(
    () => {
      const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000
      const revenue30d = orders.reduce((sum, order) => {
        const createdAt = new Date(order.createdAt).getTime()
        return createdAt >= cutoff30d ? sum + order.total : sum
      }, 0)

      return [
        {
          title: 'Ventas realizadas',
          value: formatCurrency(revenue30d),
          detail: 'Facturacion de los ultimos 30 dias',
          tone: 'blue',
        },
        {
          title: 'Accion requerida',
          value: String(
            orders.filter((order) => ['Pendiente', 'Aprobado', 'Preparando'].includes(order.status))
              .length,
          ),
          detail: 'Pedidos que requieren seguimiento',
          tone: 'slate',
        },
        {
          title: 'Nuevos clientes',
          value: String(recentClientsCount),
          detail: 'Altas en los ultimos 30 dias',
          tone: 'red',
        },
        {
          title: 'Alertas de stock',
          value: String(lowStockItems.length),
          detail: 'Productos con stock critico por debajo de 5 unidades',
          tone: lowStockItems.length > 0 ? 'red' : 'slate',
        },
      ]
    },
    [lowStockItems.length, orders, recentClientsCount],
  )

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase()
    const sortedClients = [...clientsWithTier]
      .filter((client) => {
        const matchesQuery =
          query.length === 0 ||
          `${client.businessName} ${client.name}`.toLowerCase().includes(query) ||
          client.taxId.toLowerCase().includes(query) ||
          client.city.toLowerCase().includes(query)
        const matchesLevel =
          clientLevelFilter === 'Todos' || client.tier === clientLevelFilter
        const matchesStatus =
          clientStatusFilter === 'Todos' || client.status === clientStatusFilter
        const flags = getClientFlags(client)
        const matchesQuickFilter =
          clientQuickFilter === 'Todos' ||
          (clientQuickFilter === 'Activos' && client.status === 'Activo') ||
          (clientQuickFilter === 'En riesgo' && flags.isInactiveLongTime) ||
          (clientQuickFilter === 'Inactivos' && client.status === 'Inactivo') ||
          (clientQuickFilter === 'Con saldo pendiente' && Number(client.pendingBalance) > 0) ||
          (clientQuickFilter === 'Bloqueados' && client.status === 'Bloqueado')

        return matchesQuery && matchesLevel && matchesStatus && matchesQuickFilter
      })
      .sort((left, right) => {
        if (clientQuickFilter === 'En riesgo') {
          const leftRisk = getClientFlags(left).isInactiveLongTime ? 1 : 0
          const rightRisk = getClientFlags(right).isInactiveLongTime ? 1 : 0

          if (leftRisk !== rightRisk) {
            return rightRisk - leftRisk
          }
        }

        const multiplier = clientSort.direction === 'asc' ? 1 : -1
        const getSortableValue = (client) => {
          switch (clientSort.key) {
            case 'taxId':
              return client.taxId
            case 'phone':
              return client.phone
            case 'email':
              return client.email
            case 'city':
              return client.city
            case 'tier':
              return client.tier
            case 'points':
              return getClientLifetimePoints(client)
            case 'creditLimit':
              return client.creditLimit
            case 'totalBilled':
              return client.totalBilled
            case 'pendingBalance':
              return client.pendingBalance
            case 'lastPurchase':
              return client.lastPurchase ? new Date(client.lastPurchase.createdAt).getTime() : 0
            case 'status':
              return client.status
            default:
              return client.businessName
          }
        }

        const leftValue = getSortableValue(left)
        const rightValue = getSortableValue(right)

        if (typeof leftValue === 'number' && typeof rightValue === 'number') {
          return (leftValue - rightValue) * multiplier
        }

        return String(leftValue).localeCompare(String(rightValue), 'es') * multiplier
      })

    return sortedClients
  }, [clientLevelFilter, clientQuickFilter, clientSearch, clientSort, clientStatusFilter, clientsWithTier])

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()

    return ordersWithClient.filter((order) => {
      const matchesQuery =
        query.length === 0 ||
        order.id.toLowerCase().includes(query) ||
        order.clientName.toLowerCase().includes(query)
      const matchesStatus =
        orderStatusFilter === 'Todos' || order.status === orderStatusFilter

      return matchesQuery && matchesStatus
    })
  }, [orderSearch, orderStatusFilter, ordersWithClient])

  const filteredStockProducts = useMemo(() => {
    const query = deferredStockSearch.trim().toLowerCase()

    if (!query) {
      return products
    }

    return products.filter((product) => {
      const name = String(product.name ?? '').toLowerCase()
      const sku = String(product.sku ?? '').toLowerCase()
      const brand = String(product.brand ?? '').toLowerCase()

      return name.includes(query) || sku.includes(query) || brand.includes(query)
    })
  }, [deferredStockSearch, products])
  const stockTotalPages = Math.max(Math.ceil(filteredStockProducts.length / STOCK_PAGE_SIZE), 1)
  const visibleStockProducts = useMemo(() => {
    const safePage = Math.min(stockPage, stockTotalPages)
    const startIndex = (safePage - 1) * STOCK_PAGE_SIZE

    return filteredStockProducts.slice(startIndex, startIndex + STOCK_PAGE_SIZE)
  }, [filteredStockProducts, stockPage, stockTotalPages])

  const orderSummary = useMemo(() => {
    // Usamos hora Argentina (UTC-3) para todos los cortes de "hoy" y "últimos 7 días"
    const todayAR = arToday()
    const start7d  = arStartOfDay(7)
    const start30d = arStartOfDay(30)
    const ordersLast7d = ordersWithClient.filter(
      (order) => order.createdAt && new Date(order.createdAt).getTime() >= start7d,
    )
    const ordersToday = ordersWithClient.filter(
      (o) => o.createdAt && arDateOf(o.createdAt) === todayAR,
    )

    return {
      totalToday: ordersToday.length,
      amountToday: ordersToday.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      pending: ordersWithClient.filter((order) => order.status === 'Pendiente').length,
      preparing: ordersWithClient.filter((order) => order.status === 'Preparando').length,
      dispatchedToday: ordersToday.filter((o) => o.status === 'Despachado').length,
      totalRecent: ordersLast7d.length,
      amountRecent: ordersLast7d.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
      dispatchedRecent: ordersLast7d.filter((order) => order.status === 'Despachado').length,
    }
  }, [ordersWithClient])

  const dashboardExtraMetrics = useMemo(() => {
    const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000
    const ordersLast30d = orders.filter(
      (order) => new Date(order.createdAt).getTime() >= cutoff30d,
    )
    const revenueLast30d = ordersLast30d.reduce((sum, order) => sum + order.total, 0)
    const pendingReceivables = clients.reduce(
      (sum, client) => sum + (Number(client.pendingBalance) || 0),
      0,
    )
    const inactiveClients = clientsWithTier.filter((client) => {
      if (!client.lastPurchase) {
        return true
      }

      const diffMs = Date.now() - new Date(client.lastPurchase.createdAt).getTime()
      return diffMs > 60 * 24 * 60 * 60 * 1000
    }).length

    return [
      {
        title: 'Capital a recuperar',
        value: formatCurrency(pendingReceivables),
        detail: 'Saldo pendiente de clientes',
        tone: pendingReceivables > 0 ? 'red' : 'slate',
      },
      {
        title: 'Despachados (7 dias)',
        value: String(orderSummary.dispatchedRecent),
        detail: 'Pedidos enviados en la semana',
        tone: 'blue',
      },
      {
        title: 'Clientes por reactivar',
        value: String(inactiveClients),
        detail: 'Sin compras hace mas de 60 dias',
        tone: inactiveClients > 0 ? 'blue' : 'slate',
      },
      {
        title: 'Ticket promedio',
        value: formatCurrency(
          ordersLast30d.length > 0 ? Math.round(revenueLast30d / ordersLast30d.length) : 0,
        ),
        detail: 'Promedio en los ultimos 30 dias',
        tone: 'navy',
      },
    ]
  }, [clients, clientsWithTier, orderSummary.dispatchedRecent, orders])

  const salesLast7Days = useMemo(() => {
    // Genera los 7 días usando hora Argentina para que "hoy" sea correcto
    const todayAR = arToday() // 'YYYY-MM-DD'
    const [y, m, d] = todayAR.split('-').map(Number)
    const days = Array.from({ length: 7 }, (_, index) => {
      // Fecha del día (6-index) días atrás en Argentina
      const date = new Date(Date.UTC(y, m - 1, d - (6 - index), 3, 0, 0, 0))
      const key = arDateOf(date) // 'YYYY-MM-DD' en Argentina
      return {
        key,
        label: new Intl.DateTimeFormat('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          day: '2-digit',
          month: '2-digit',
        }).format(date),
        value: 0,
      }
    })

    orders
      .filter((order) => ['Aprobado', 'Despachado'].includes(order.status))
      .forEach((order) => {
        if (!order.createdAt) return
        const key = arDateOf(order.createdAt) // fecha en hora Argentina
        const targetDay = days.find((day) => day.key === key)
        if (targetDay) {
          targetDay.value += order.total
        }
      })

    return days
  }, [orders])

  const ordersByStatus = useMemo(() => {
    const counts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})

    return [
      { label: 'Pendiente', value: counts.Pendiente || 0, tone: 'neutral' },
      { label: 'Aprobado', value: counts.Aprobado || 0, tone: 'info' },
      { label: 'Preparando', value: counts.Preparando || 0, tone: 'warning' },
      { label: 'Despachado', value: counts.Despachado || 0, tone: 'success' },
      { label: 'Cancelado', value: counts.Cancelado || 0, tone: 'danger' },
    ]
  }, [orders])

  const topClientsThisMonth = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const monthlyOrders = ordersWithClient.filter(
      (order) => new Date(order.createdAt).getMonth() === currentMonth,
    )

    return Object.values(
      monthlyOrders.reduce((accumulator, order) => {
        if (!accumulator[order.clientId]) {
          accumulator[order.clientId] = {
            clientId: order.clientId,
            name: order.clientName,
            orders: 0,
            total: 0,
          }
        }

        accumulator[order.clientId].orders += 1
        accumulator[order.clientId].total += order.total
        return accumulator
      }, {}),
    )
      .sort((left, right) => right.total - left.total)
      .slice(0, 5)
  }, [ordersWithClient])

  const attentionItems = useMemo(() => {
    const items = []

    ordersWithClient
      .filter((order) => order.status === 'Pendiente' && order.needsAttention)
      .forEach((order) => {
        items.push({
          id: `order-${order.id}`,
          tone: 'warning',
          text: `${order.id} lleva mas de 24 hs sin aprobacion`,
          actionLabel: 'Ver pedidos',
          action: () => navigateToSection('pedidos'),
        })
      })

    clientsWithTier
      .filter((client) => client.pendingBalance > 0 && client.status !== 'Activo')
      .forEach((client) => {
        items.push({
          id: `client-${client.id}`,
          tone: 'danger',
          text: `${client.businessName} tiene saldo vencido o cuenta restringida`,
          actionLabel: 'Ver clientes',
          action: () => navigateToSection('clientes'),
        })
      })

    lowStockItems.forEach((product) => {
      items.push({
        id: `stock-${product.id}`,
        tone: 'danger',
        text: `${product.name} quedo con stock critico (${product.currentStock} unidades)`,
        actionLabel: 'Ajustar stock',
        action: () => navigateToSection('stock'),
      })
    })

    return items
  }, [clientsWithTier, lowStockItems, ordersWithClient])

  const globalAlerts = useMemo(() => {
    const alerts = []
    const pendingCount = ordersWithClient.filter((o) => o.status === 'Pendiente').length
    if (pendingCount > 0) {
      alerts.push({
        kind: 'Pedidos',
        tone: 'warning',
        text: `${pendingCount} pedido${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'} de aprobación`,
        action: () => navigateToSection('pedidos'),
      })
    }
    if (lowStockItems.length > 0) {
      alerts.push({
        kind: 'Stock',
        tone: 'danger',
        text: `${lowStockItems.length} producto${lowStockItems.length === 1 ? '' : 's'} con stock crítico`,
        action: () => navigateToSection('stock'),
      })
    }
    const debtors = clientsWithTier.filter((c) => Number(c.pendingBalance) > 0).length
    if (debtors > 0) {
      alerts.push({
        kind: 'Cobranzas',
        tone: 'info',
        text: `${debtors} cliente${debtors === 1 ? '' : 's'} con saldo pendiente`,
        action: () => navigateToSection('cobranzas'),
      })
    }
    return alerts
  }, [ordersWithClient, lowStockItems, clientsWithTier])

  const chatConversations = useMemo(
    () =>
      chats
        .map((chat) => {
          const client = clientsWithTier.find((entry) => entry.id === chat.clientId) ?? null
          const lastMessage = chat.messages[chat.messages.length - 1] ?? null
          const unreadForAdmin =
            Boolean(chat.lastClientActivityAt) &&
            (!chat.adminLastSeenAt ||
              new Date(chat.lastClientActivityAt).getTime() >
                new Date(chat.adminLastSeenAt).getTime())

          return {
            ...chat,
            client,
            clientName: client?.businessName ?? 'Cliente sin asignar',
            lastMessage,
            unreadForAdmin,
          }
        })
        .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)),
    [chats, clientsWithTier],
  )

  const adminUnreadChatsCount = useMemo(
    () => chatConversations.filter((chat) => chat.unreadForAdmin).length,
    [chatConversations],
  )

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  useEffect(() => {
    if (!session?.token) return
    const load = () => {
      fetch('/api/admin/client-requests?status=pending', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setPendingRequestsCount((data.requests || []).length)
        })
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [session?.token])

  const handleCreateClientFromDashboard = () => {
    navigateToSection('clientes')
    setIsCreatingClient(true)
  }

  const handleViewPendingOrders = () => {
    setOrderStatusFilter('Pendiente')
    navigateToSection('pedidos')
  }

  const handleAdjustStock = () => {
    navigateToSection('stock')
  }

  const handleViewClientRanking = () => {
    navigateToSection('dashboard')

    window.setTimeout(() => {
      document.getElementById('dashboard-top-clients')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }

  const handleRefreshDashboard = () => {
    startTransition(() => {
      setActiveSection('dashboard')
      setIsSidebarOpen(false)
    })
  }

  const selectedOrder = ordersWithClient.find((order) => order.id === selectedOrderId) ?? null
  const selectedOrderClient =
    selectedOrder
      ? clientsWithTier.find((client) => client.id === selectedOrder.clientId) ?? null
      : null
  const selectedChatConversation =
    chatConversations.find((chat) => chat.clientId === selectedChatClientId) ?? null
  const selectedChatOrders = ordersWithClient.filter(
    (order) => order.clientId === selectedChatClientId,
  )
  const clientIsTyping =
    Boolean(selectedChatConversation?.clientTypingAt) &&
    Date.now() - new Date(selectedChatConversation.clientTypingAt).getTime() < 3000
  const selectedClient = clientsWithTier.find((client) => client.id === selectedClientId) ?? null
  const selectedClientOrders = ordersWithClient.filter((order) => order.clientId === selectedClientId)
  const aiClient = clientsWithTier.find((client) => client.id === aiClientId) ?? null
  const aiClientOrders = ordersWithClient.filter((order) => order.clientId === aiClientId)
  const editingClient = clients.find((client) => client.id === editingClientId) ?? null
  const paymentClient = clients.find((client) => client.id === paymentClientId) ?? null
  const quickNoteClient = clients.find((client) => client.id === quickNoteClientId) ?? null
  const activeSectionLabel =
    adminSections.find((section) => section.id === activeSection)?.label ?? 'Dashboard'

  useEffect(() => {
    if (activeSection !== 'chats') {
      return
    }

    if (!selectedChatClientId && chatConversations.length > 0) {
      setSelectedChatClientId(chatConversations[0].clientId)
    }

    if (
      selectedChatClientId &&
      !chatConversations.some((chat) => chat.clientId === selectedChatClientId)
    ) {
      setSelectedChatClientId(chatConversations[0]?.clientId ?? null)
    }
  }, [activeSection, chatConversations, selectedChatClientId])

  useEffect(() => {
    if (activeSection !== 'chats' || !selectedChatClientId) {
      return
    }

    openChat(selectedChatClientId, 'admin')
  }, [activeSection, selectedChatClientId])

  useEffect(() => {
    setAdminChatOrderReferenceId('')
  }, [selectedChatClientId])

  useEffect(() => {
    setStockPage(1)
  }, [deferredStockSearch])

  useEffect(() => {
    setStockPage((current) => Math.min(current, stockTotalPages))
  }, [stockTotalPages])

  useEffect(() => {
    if (!selectedChatConversation) {
      return
    }

    const element = adminChatThreadRef.current

    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [selectedChatConversation?.messages.length, clientIsTyping])

  useEffect(() => {
    if (!selectedChatConversation) {
      return
    }

    const isTyping = adminChatDraft.trim().length > 0
    setChatTyping(selectedChatConversation.clientId, 'admin', isTyping)

    if (adminTypingTimeoutRef.current) {
      window.clearTimeout(adminTypingTimeoutRef.current)
    }

    if (isTyping) {
      adminTypingTimeoutRef.current = window.setTimeout(() => {
        setChatTyping(selectedChatConversation.clientId, 'admin', false)
      }, 2200)
    }

    return () => {
      if (adminTypingTimeoutRef.current) {
        window.clearTimeout(adminTypingTimeoutRef.current)
      }
    }
  }, [adminChatDraft, selectedChatConversation?.clientId])

  const thresholds = useMemo(
    () =>
      TIER_ORDER.map((tierName) => ({
        name: tierName,
        value: settings.tierThresholds[tierName] ?? 0,
      })),
    [settings.tierThresholds],
  )

  const tierBenefits = useMemo(
    () =>
      TIER_ORDER.map((tierName) => ({
        name: tierName,
        benefits: settings.tierBenefits?.[tierName] ?? [],
        config: getTierBenefitConfig(settings, tierName),
      })),
    [settings],
  )

  const tierClients = useMemo(() => {
    const query = tierClientSearch.trim().toLowerCase()

    return clientsWithTier
      .filter((client) => {
        if (!query) {
          return true
        }

        return (
          `${client.businessName} ${client.name}`.toLowerCase().includes(query) ||
          String(client.taxId ?? '').toLowerCase().includes(query) ||
          String(client.city ?? '').toLowerCase().includes(query)
        )
      })
      .slice(0, 8)
  }, [clientsWithTier, tierClientSearch])

  useEffect(() => {
    setTierBenefitConfigDrafts(
      Object.fromEntries(
        TIER_ORDER.map((tierName) => [
          tierName,
          getTierBenefitConfig(settings, tierName),
        ]),
      ),
    )
  }, [settings])

  const handleTierBenefitConfigChange = (tierName, patch) => {
    setTierBenefitConfigDrafts((current) => ({
      ...current,
      [tierName]: {
        ...(current[tierName] ?? getTierBenefitConfig(settings, tierName)),
        ...patch,
      },
    }))
  }

  const handleTierCategoryDiscountChange = (tierName, category, nextValue) => {
    const currentConfig = tierBenefitConfigDrafts[tierName] ?? getTierBenefitConfig(settings, tierName)

    handleTierBenefitConfigChange(tierName, {
      categoryDiscounts: {
        ...currentConfig.categoryDiscounts,
        [category]: Math.max(0, Math.min(100, Number(nextValue) || 0)),
      },
    })
  }

  const handleSaveTierBenefits = (tierName) => {
    const nextConfig = tierBenefitConfigDrafts[tierName] ?? getTierBenefitConfig(settings, tierName)
    const nextBenefits = [
      nextConfig.shippingMode === 'free'
        ? 'Envio gratis'
        : nextConfig.shippingMode === 'discounted'
          ? `Envio con ${nextConfig.shippingDiscountPercent}% de descuento`
          : 'Envio sin beneficio',
      ...PRODUCT_BENEFIT_CATEGORIES.map((category) => ({
        category,
        percent: Number(nextConfig.categoryDiscounts?.[category] ?? 0),
      }))
        .filter((item) => item.percent > 0)
        .map((item) => `${item.percent}% en ${item.category}`),
    ]

    updateTierBenefitConfig(tierName, nextConfig, session.name)
    updateTierBenefits(tierName, nextBenefits, session.name)
  }

  const clientSummary = useMemo(
    () => ({
      total: clientsWithTier.length,
      active: clientsWithTier.filter((client) => client.status === 'Activo').length,
      risk: clientsWithTier.filter((client) => getClientFlags(client).isInactiveLongTime).length,
      inactive: clientsWithTier.filter((client) => client.status === 'Inactivo').length,
      blocked: clientsWithTier.filter((client) => client.status === 'Bloqueado').length,
      withDebtClients: clientsWithTier.filter((client) => Number(client.pendingBalance) > 0).length,
      withDebtAmount: clientsWithTier.reduce(
        (sum, client) => sum + (Number(client.pendingBalance) || 0),
        0,
      ),
      filtered: filteredClients.length,
    }),
    [clientsWithTier, filteredClients.length],
  )

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = session.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const toggleClientSort = (key) => {
    setClientSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }))
  }

  const handleOpenOrderFromClient = (orderId) => {
    setSelectedClientId(null)
    setSelectedOrderId(orderId)
    navigateToSection('pedidos')
  }

  const handleClientSortSelect = (value) => {
    const [key, direction] = String(value).split(':')
    setClientSort({
      key: key || 'businessName',
      direction: direction === 'desc' ? 'desc' : 'asc',
    })
  }

  const handleDispatchOrder = (order) => {
    const deliveryNote = window.prompt('Numero de remito (opcional):', order.deliveryNote ?? '')

    if (deliveryNote === null) {
      return
    }

    changeOrderStatus(order.id, 'Despachado', session.name, {
      deliveryNote: deliveryNote.trim(),
    })
  }

  const handleOrderStatusSelection = (order, nextStatus) => {
    if (!order || nextStatus === order.status) {
      return
    }

    if (nextStatus === 'Aprobado') {
      approveOrder(order.id, session.name)
      return
    }

    if (nextStatus === 'Cancelado') {
      handleCancelOrder(order)
      return
    }

    if (nextStatus === 'Despachado') {
      handleDispatchOrder(order)
      return
    }

    changeOrderStatus(order.id, nextStatus, session.name)
  }

  const openOrderDocumentWindow = (order, options) => {
    if (!order) {
      return
    }

    const client = clientsWithTier.find((entry) => entry.id === order.clientId) ?? null
    const rows = buildOrderRows(order.items, products)
    const grossSubtotal = rows.reduce((sum, row) => sum + row.totalValue, 0)
    const taxSubtotal = Math.round((order.total / 1.21) * 100) / 100
    const tax = Math.max(order.total - taxSubtotal, 0)
    const documentTitle = options?.title ?? `Pedido ${order.id}`
    const secondaryTitle = options?.subtitle ?? 'Resumen operativo'
    const actionLabel = options?.actionLabel ?? 'Documento'
    const popup = window.open('', '_blank', 'width=980,height=760')

    if (!popup) {
      return
    }

    popup.document.write(`
      <html lang="es">
        <head>
          <title>${documentTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #13212c; }
            h1 { margin: 0 0 6px; font-size: 28px; }
            h2 { margin: 24px 0 10px; font-size: 18px; }
            p { margin: 0 0 8px; color: #5c6d82; }
            .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #dbe3ef; border-radius: 8px; padding: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #ebeff5; }
            th { color: #6d7f93; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; }
            .summary .card strong { display:block; margin-top: 6px; font-size: 20px; }
          </style>
        </head>
        <body>
          <p>${actionLabel}</p>
          <h1>${documentTitle}</h1>
          <p>${secondaryTitle}</p>

          <div class="meta">
            <div class="card"><strong>Pedido</strong><p>${order.id}</p></div>
            <div class="card"><strong>Cliente</strong><p>${client?.businessName ?? order.clientName}</p></div>
            <div class="card"><strong>Fecha</strong><p>${formatDateTime(order.createdAt)}</p></div>
          </div>

          <h2>Cliente</h2>
          <div class="card">
            <p><strong>Telefono:</strong> ${client?.phone ?? 'Sin dato'}</p>
            <p><strong>Direccion:</strong> ${order.deliveryType === 'Retiro en sucursal' ? order.branch || 'Sucursal a confirmar' : client?.address || 'Direccion a confirmar'}</p>
            <p><strong>Condicion de pago:</strong> ${client?.paymentTerms ?? 'Contado'}</p>
          </div>

          <h2>Productos</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${row.name}</td>
                      <td>${row.sku}</td>
                      <td>x${row.qty}</td>
                      <td>${row.unitPrice}</td>
                      <td>${formatCurrency(row.totalValue)}</td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="card"><span>Subtotal</span><strong>${formatCurrency(taxSubtotal)}</strong></div>
            <div class="card"><span>IVA</span><strong>${formatCurrency(tax)}</strong></div>
            <div class="card"><span>Total final</span><strong>${formatCurrency(order.total)}</strong></div>
            <div class="card"><span>Lista</span><strong>${formatCurrency(grossSubtotal)}</strong></div>
          </div>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const handlePrintPackingSlip = (order) => {
    openOrderDocumentWindow(order, {
      title: `Packing slip ${order.id}`,
      subtitle: 'Hoja de preparacion para deposito y despacho.',
      actionLabel: 'Packing slip',
    })
  }

  const handleGenerateInvoice = (order) => {
    openOrderDocumentWindow(order, {
      title: `Factura preliminar ${order.id}`,
      subtitle: 'Resumen comercial previo a la emision fiscal definitiva.',
      actionLabel: 'Factura',
    })
  }

  const handleConfirmAndShip = (order) => {
    if (!order || ['Despachado', 'Cancelado'].includes(order.status)) {
      return
    }

    if (order.status === 'Pendiente') {
      approveOrder(order.id, session.name)
    }

    handleDispatchOrder(order)
  }

  const handleCancelOrder = (order) => {
    const confirmed = window.confirm(`Cancelar el pedido ${order.id}?`)

    if (!confirmed) {
      return
    }

    cancelOrder(order.id, session.name)
  }

  const handleExportOrdersCsv = () => {
    const headers = ['N Pedido', 'Cliente', 'Fecha', 'Productos', 'Total', 'Estado']
    const rows = filteredOrders.map((order) => [
      order.id,
      order.clientName,
      formatDateTime(order.createdAt),
      order.productsPreview,
      order.total,
      order.status,
    ])
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pedidos-entrantes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportClientsCsv = () => {
    const headers = [
      'Cliente',
      'CUIT',
      'Nivel',
      'Ultima compra',
      'Facturacion total',
      'Saldo pendiente',
      'Estado',
    ]
    const rows = filteredClients.map((client) => [
      client.businessName,
      client.taxId,
      client.tier,
      client.lastPurchase ? formatDateTime(client.lastPurchase.createdAt) : 'Sin compras',
      client.totalBilled,
      client.pendingBalance,
      client.status,
    ])
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'clientes-crm.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteProduct = (product) => {
    if (!product || productIdsInOrders.has(product.id)) {
      return
    }

    const confirmed = window.confirm(
      `¿Querés eliminar el producto "${product.name}" del control de stock?`,
    )

    if (!confirmed) {
      return
    }

    deleteProduct(product.id, session.name)
  }

  function navigateToSection(sectionId) {
    startTransition(() => {
      setActiveSection(sectionId)
      setIsSidebarOpen(false)
    })
  }

  const handleSendAdminChatMessage = () => {
    const selectedOrderReference = selectedChatOrders.find(
      (order) => order.id === adminChatOrderReferenceId,
    )

    if (!selectedChatConversation || (!adminChatDraft.trim() && !selectedOrderReference)) {
      return
    }

    setChatTyping(selectedChatConversation.clientId, 'admin', false)
    sendChatMessage(
      selectedChatConversation.clientId,
      'admin',
      session.name,
      adminChatDraft,
      {
        orderReference: selectedOrderReference
          ? {
              orderId: selectedOrderReference.id,
              orderCode: selectedOrderReference.id,
              status: selectedOrderReference.status,
              total: selectedOrderReference.total,
              createdAt: selectedOrderReference.createdAt,
            }
          : null,
      },
    )
    setAdminChatDraft('')
    setAdminChatOrderReferenceId('')
  }

  const clientFormInitialValues = useMemo(() => {
    if (editingClient) {
      return editingClient
    }

    if (!isCreatingClient) {
      return null
    }

    return {
      id: null,
      businessName: '',
      name: '',
      taxId: '',
      email: '',
      phone: '',
      altPhone: '',
      address: '',
      city: '',
      province: '',
      category: 'Ferreteria',
      status: 'Activo',
      points: 0,
      creditLimit: 0,
      pendingBalance: 0,
      paymentTerms: 'Contado',
      specialDiscount: 0,
      priceList: '',
      note: '',
    }
  }, [editingClient, isCreatingClient])

  return (
      <main className="admin-crm-page">
        <aside className={isSidebarOpen ? 'admin-sidebar open' : 'admin-sidebar'}>
          <div className="admin-sidebar-brand">
            <NexoftWordmark size="md" tone="light" />
            <div className="admin-sidebar-brand-meta">
              <span className="admin-sidebar-status-dot" aria-hidden="true"></span>
              <small>Panel operativo</small>
            </div>
          </div>

          <nav className="admin-sidebar-nav">
            {adminSectionGroups.map((group) => {
              // Filtramos los items del grupo según el sub-rol del usuario
              const allowedItems = group.items.filter((id) => canSeeSection(session.rol, id))
              if (allowedItems.length === 0) return null
              return (
              <div key={group.title} className="admin-sidebar-group">
                <span className="admin-sidebar-group-title">{group.title}</span>
                <div className="admin-sidebar-group-links">
                  {allowedItems.map((sectionId) => {
                    const section = adminSections.find((entry) => entry.id === sectionId)

                    if (!section) {
                      return null
                    }

                    return (
                      <button
                        key={section.id}
                        type="button"
                        className={
                          activeSection === section.id
                            ? 'admin-sidebar-link active'
                            : 'admin-sidebar-link'
                        }
                        onClick={() => navigateToSection(section.id)}
                      >
                        <span className="admin-sidebar-link-main">
                          <span className="admin-sidebar-link-icon">
                            <AdminSidebarIcon sectionId={section.id} />
                          </span>
                          <span>{section.label}</span>
                        </span>
                        {section.id === 'chats' && adminUnreadChatsCount > 0 ? (
                          <span className="admin-sidebar-badge">{adminUnreadChatsCount}</span>
                        ) : null}
                        {section.id === 'solicitudes' && pendingRequestsCount > 0 ? (
                          <span className="admin-sidebar-badge">{pendingRequestsCount}</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
              )
            })}
          </nav>

          <div className="admin-sidebar-profile">
            <div className="admin-profile-card">
              <div className="admin-profile-chip">
                <span>{initials}</span>
                <div>
                  <strong>{session.name}</strong>
                  <small>{session.email}</small>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 2,
                      background: (ROL_LABELS[session.rol] || ROL_LABELS.admin).bg,
                      color: (ROL_LABELS[session.rol] || ROL_LABELS.admin).color,
                    }}
                  >
                    {(ROL_LABELS[session.rol] || ROL_LABELS.admin).label}
                  </span>
                </div>
              </div>
              <button type="button" className="admin-profile-logout" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </div>
          </div>
        </aside>

        <section className="admin-main">
          <AdminGlobalTopbar
            session={session}
            clients={clients}
            products={products}
            orders={orders}
            alerts={globalAlerts}
            onLogout={logout}
            onNavigate={(sectionId, opts) => {
              navigateToSection(sectionId)
              if (opts?.clientId) setSelectedClientId(opts.clientId)
            }}
          />
          <header className="admin-topbar">
            <button
              type="button"
              className="admin-sidebar-toggle"
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            Menu
          </button>
            <div>
              <span className="admin-card-eyebrow">Panel administrador</span>
              <h1>
                {activeSection === 'dashboard'
                  ? settings.branding?.adminDashboardTitle || 'Panel operativo'
                  : activeSectionLabel}
              </h1>
            </div>
            <div className="admin-topbar-actions">
              {activeSection === 'dashboard' ? (
                <>
                  <button
                    type="button"
                    className="admin-topbar-action-btn"
                    onClick={handleRefreshDashboard}
                  >
                    ↻ Actualizar datos
                  </button>
                  <button
                    type="button"
                    className="admin-topbar-action-btn primary"
                    onClick={handleCreateClientFromDashboard}
                  >
                    + Nuevo cliente
                  </button>
                </>
              ) : null}

            </div>
          </header>

        <section className="admin-content">
          {activeSection === 'dashboard' ? (
            <section className="admin-section">
              <div className="admin-hero-grid">
                {metrics.map((metric) => (
                  <HeroMetricCard key={metric.title} {...metric} />
                ))}
              </div>

              <div className="admin-secondary-grid">
                {dashboardExtraMetrics.map((metric) => (
                  <SecondaryMetricCard key={metric.title} {...metric} />
                ))}
              </div>

              <article className="admin-card">
                <div className="admin-section-header">
                  <div>
                    <span className="admin-card-eyebrow">Accesos directos</span>
                    <h2>Acciones rapidas</h2>
                  </div>
                </div>

                <div className="admin-quick-actions-grid">
                  <button
                    type="button"
                    className="admin-quick-action-btn primary"
                    onClick={handleCreateClientFromDashboard}
                  >
                    Nuevo cliente
                  </button>
                  <button
                    type="button"
                    className="admin-quick-action-btn"
                    onClick={handleViewPendingOrders}
                  >
                    Ver pedidos pendientes
                  </button>
                  <button
                    type="button"
                    className="admin-quick-action-btn"
                    onClick={handleAdjustStock}
                  >
                    Ajustar stock
                  </button>
                  <button
                    type="button"
                    className="admin-quick-action-btn"
                    onClick={handleViewClientRanking}
                  >
                    Ver ranking de clientes
                  </button>
                </div>
              </article>

              <div className="admin-dashboard-chart-grid">
                <SalesChartCard data={salesLast7Days} />
                <OrderStatusChartCard data={ordersByStatus} />
              </div>

              <article className="admin-card" id="dashboard-top-clients">
                <div className="admin-section-header">
                  <div>
                    <span className="admin-card-eyebrow">Ranking</span>
                    <h2>Top 5 clientes del mes</h2>
                  </div>
                </div>

                <div className="admin-table">
                  <div className="admin-table-row admin-table-head admin-top-clients-grid">
                    <span>Cliente</span>
                    <span>Pedidos</span>
                    <span>Total comprado</span>
                  </div>

                  {topClientsThisMonth.map((client) => (
                    <div key={client.clientId} className="admin-table-row admin-top-clients-grid">
                      <strong>{client.name}</strong>
                      <span>{client.orders}</span>
                      <strong>{formatCurrency(client.total)}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="admin-card">
                <div className="admin-section-header">
                  <div>
                    <span className="admin-card-eyebrow">Atencion</span>
                    <h2>Requieren atencion</h2>
                  </div>
                </div>

                {attentionItems.length > 0 ? (
                  <div className="admin-card-stack admin-attention-list">
                    {attentionItems.map((item) => (
                      <div key={item.id} className={`admin-attention-row ${item.tone}`}>
                        <span>{item.text}</span>
                        <button
                          type="button"
                          className="admin-action-btn neutral"
                          onClick={item.action}
                        >
                          {item.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-all-clear">Todo en orden ✓</div>
                )}
              </article>

              <article className="admin-card">
                <div className="admin-section-header">
                  <div>
                    <span className="admin-card-eyebrow">Auditoria</span>
                    <h2>Historial de cambios</h2>
                  </div>
                </div>

                <div className="admin-card-stack">
                  {auditLog.slice(0, 3).map((entry) => {
                    const meta = getAuditEntryMeta(entry.message)

                    return (
                    <div key={entry.id} className={`admin-alert-row rich ${meta.tone}`}>
                      <div className="admin-alert-main">
                        <span className="admin-alert-icon" aria-hidden="true">
                          {meta.icon}
                        </span>
                        <strong>{entry.message}</strong>
                      </div>
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="admin-table-link admin-history-link"
                  onClick={() => {
                    setAuditPage(1)
                    setIsAuditModalOpen(true)
                  }}
                >
                  Ver historial completo →
                </button>
              </article>
            </section>
          ) : null}

          {activeSection === 'clientes' ? (
            <ClientesSection
              clientsWithTier={clientsWithTier}
              filteredClients={filteredClients}
              clientSummary={clientSummary}
              clientSearch={clientSearch} setClientSearch={setClientSearch}
              clientLevelFilter={clientLevelFilter} setClientLevelFilter={setClientLevelFilter}
              clientStatusFilter={clientStatusFilter} setClientStatusFilter={setClientStatusFilter}
              clientQuickFilter={clientQuickFilter} setClientQuickFilter={setClientQuickFilter}
              clientSort={clientSort}
              toggleClientSort={toggleClientSort}
              handleClientSortSelect={handleClientSortSelect}
              updateClientStatus={updateClientStatus}
              setSelectedClientId={setSelectedClientId}
              setEditingClientId={setEditingClientId}
              setIsCreatingClient={setIsCreatingClient}
              setPaymentClientId={setPaymentClientId}
              setQuickNoteClientId={setQuickNoteClientId}
              setAiClientId={setAiClientId}
              handleExportClientsCsv={handleExportClientsCsv}
              deleteClient={deleteClient}
              session={session}
            />
          ) : null}

          {activeSection === 'chats' ? (
            <section className="admin-section admin-chat-section">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '0.85rem' }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#94a3b8'
                }}>Mensajería interna</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Mensajes con clientes
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Conversaciones humanas con cada cliente. Para consultar a la IA, andá a <strong>Asistente IA</strong>.
                </p>
              </div>
              <div className="admin-chat-layout">
                <article className="admin-card admin-chat-list-card">
                  <div className="admin-chat-list">
                    {chatConversations.map((chat) => (
                      <button
                        key={chat.clientId}
                        type="button"
                        className={
                          selectedChatClientId === chat.clientId
                            ? 'admin-chat-list-item active'
                            : 'admin-chat-list-item'
                        }
                        onClick={() => setSelectedChatClientId(chat.clientId)}
                      >
                        <div className="admin-chat-list-head">
                          <strong>{chat.clientName}</strong>
                          {chat.unreadForAdmin ? (
                            <span className="admin-chat-unread-dot">Por responder</span>
                          ) : null}
                        </div>
                        <span>{chat.lastMessage?.text ?? 'El cliente abrio el chat.'}</span>
                        <small>
                          {chat.lastMessage
                            ? formatDateTime(chat.lastMessage.createdAt)
                            : formatDateTime(chat.updatedAt)}
                        </small>
                      </button>
                    ))}
                  </div>
                </article>

                <article className="admin-card admin-chat-thread-card">
                  {selectedChatConversation ? (
                    <>
                      <div className="admin-section-header">
                        <div>
                          <span className="admin-card-eyebrow">Conversacion activa</span>
                          <h3>{selectedChatConversation.clientName}</h3>
                          <div className="admin-chat-meta">
                            <span className="admin-chat-status-dot" aria-hidden="true" />
                            <span>Cliente conectado</span>
                          </div>
                        </div>
                        {selectedChatConversation.client ? (
                          <TierBadge tier={selectedChatConversation.client.tier} />
                        ) : null}
                      </div>

                      <div ref={adminChatThreadRef} className="admin-chat-thread">
                        <div className="admin-chat-thread-inner">
                        {selectedChatConversation.messages.length > 0 ? (
                          selectedChatConversation.messages.map((message) => (
                            <div
                              key={message.id}
                              className={
                                message.senderRole === 'admin'
                                  ? 'admin-chat-message admin'
                                  : 'admin-chat-message client'
                              }
                            >
                              <strong>{message.senderName}</strong>
                              <p>{message.text}</p>
                              {message.orderReference ? (
                                <button
                                  type="button"
                                  className="chat-order-reference admin-chat-order-reference"
                                  onClick={() => setSelectedOrderId(message.orderReference.orderId)}
                                >
                                  <span className="chat-order-reference-label">Pedido vinculado</span>
                                  <strong>
                                    {message.orderReference.orderCode ??
                                      message.orderReference.orderId}
                                  </strong>
                                  <small>
                                    {message.orderReference.status} ·{' '}
                                    {formatCurrency(message.orderReference.total ?? 0)}
                                  </small>
                                </button>
                              ) : null}
                              <small>{formatDateTime(message.createdAt)}</small>
                            </div>
                          ))
                        ) : (
                          <div className="admin-chat-empty">
                            El cliente abrio el chat. Ya podes responderle desde aca.
                          </div>
                        )}

                        {clientIsTyping ? (
                          <div className="admin-chat-typing">
                            {selectedChatConversation.clientName} esta escribiendo...
                          </div>
                        ) : null}
                        </div>
                      </div>

                      <div className="admin-chat-composer">
                        {selectedChatOrders.length > 0 ? (
                          <div className="client-chat-tools admin-chat-tools">
                            <select
                              value={adminChatOrderReferenceId}
                              onChange={(event) => setAdminChatOrderReferenceId(event.target.value)}
                            >
                              <option value="">Adjuntar un pedido...</option>
                              {selectedChatOrders.map((order) => (
                                <option key={order.id} value={order.id}>
                                  {order.id} · {formatCurrency(order.total)}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                        <div className="admin-chat-composer-row">
                          <textarea
                            value={adminChatDraft}
                            onChange={(event) => setAdminChatDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault()
                                handleSendAdminChatMessage()
                              }
                            }}
                            placeholder="Escribir respuesta para el cliente..."
                          />
                          <button
                            type="button"
                            className="admin-primary-btn admin-chat-send-btn"
                            onClick={handleSendAdminChatMessage}
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="admin-chat-empty full">
                      No hay conversaciones seleccionadas.
                    </div>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {activeSection === 'ia' ? <AdminAiSection /> : null}

          {activeSection === 'cobranzas' ? (
            <CobranzasSection
              clients={clients}
              orders={orders}
              onOpenClient={(id) => {
                setSelectedClientId(id)
                setActiveSection('clientes')
              }}
            />
          ) : null}

          {activeSection === 'solicitudes' ? (
            <SolicitudesSection
              session={session}
              onApproved={() => {
                // Forzar reload del estado para que el nuevo cliente aparezca
                setTimeout(() => {}, 500)
              }}
            />
          ) : null}

          {activeSection === 'reportes' ? (
            <ReportesSection
              orders={orders}
              products={products}
              clients={clients}
              ordersWithClient={ordersWithClient}
            />
          ) : null}

          {activeSection === 'promociones' ? <PromocionesSection /> : null}

          {activeSection === 'cotizaciones' ? (
            <CotizacionesSection clients={clients} products={products} />
          ) : null}

          {activeSection === 'pedidos' ? (
            <PedidosSection
              ordersWithClient={ordersWithClient}
              filteredOrders={filteredOrders}
              orderSearch={orderSearch}
              setOrderSearch={setOrderSearch}
              orderStatusFilter={orderStatusFilter}
              setOrderStatusFilter={setOrderStatusFilter}
              orderSummary={orderSummary}
              approveOrder={approveOrder}
              handleCancelOrder={handleCancelOrder}
              changeOrderStatus={changeOrderStatus}
              handleDispatchOrder={handleDispatchOrder}
              setSelectedOrderId={setSelectedOrderId}
              handleExportOrdersCsv={handleExportOrdersCsv}
              session={session}
            />
          ) : null}

          {activeSection === 'stock' ? (
            <StockSection
              products={products}
              filteredStockProducts={filteredStockProducts}
              visibleStockProducts={visibleStockProducts}
              stockPage={stockPage}
              setStockPage={setStockPage}
              stockTotalPages={stockTotalPages}
              stockSearch={stockSearch}
              setStockSearch={setStockSearch}
              stockOnlyAlerts={stockOnlyAlerts}
              setStockOnlyAlerts={setStockOnlyAlerts}
              stockAdjustProduct={stockAdjustProduct}
              setStockAdjustProduct={setStockAdjustProduct}
              productIdsInOrders={productIdsInOrders}
              updateProductStock={updateProductStock}
              updateProductStockMinimo={updateProductStockMinimo}
              deleteProduct={deleteProduct}
              createProduct={createProduct}
              updateProduct={updateProduct}
              handleDeleteProduct={handleDeleteProduct}
              setIsProductImportOpen={setIsProductImportOpen}
              session={session}
            />
          ) : null}

          {activeSection === 'stock__disabled' ? (
            <section className="admin-section">
            <div className="admin-section-header">
              <div className="admin-stock-toolbar">
                <label className="admin-search admin-search-wide">
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder="Buscar por producto, SKU o marca..."
                  />
                </label>

                <label className="admin-status-filter">
                  <select
                    value={stockOnlyAlerts ? 'alertas' : 'todos'}
                    onChange={(e) => setStockOnlyAlerts(e.target.value === 'alertas')}
                  >
                    <option value="todos">Todos los productos</option>
                    <option value="alertas">Solo alertas de stock</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => setIsProductImportOpen(true)}
                >
                  Importar productos
                </button>
              </div>
            </div>

            {(() => {
              const stockAlertCount = filteredStockProducts.filter((p) => {
                const minimo = Number(p.stockMinimo) || 5
                const reservado = Number(p.stockReservado) || 0
                return Math.max((Number(p.currentStock) || 0) - reservado, 0) < minimo
              }).length
              return stockAlertCount > 0 ? (
                <div className="admin-alert-row rich warning" style={{ marginBottom: '1rem' }}>
                  <span className="admin-alert-icon">⚠️</span>
                  <strong>{stockAlertCount} producto{stockAlertCount > 1 ? 's' : ''} con stock disponible por debajo del mínimo</strong>
                </div>
              ) : null
            })()}

            <div className="admin-card admin-stock-card">
              <div className="admin-stock-meta">
                <span>
                  Mostrando {visibleStockProducts.length} de {filteredStockProducts.length} productos
                </span>
                <span>
                  Pagina {Math.min(stockPage, stockTotalPages)} de {stockTotalPages}
                </span>
              </div>

              <div className="admin-table admin-stock-table-scroll">
                <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                  <span>Producto / SKU</span>
                  <span>Actual</span>
                  <span>Reservado</span>
                  <span>Disponible</span>
                  <span>Mínimo</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>

                {(stockOnlyAlerts
                  ? visibleStockProducts.filter((p) => {
                      const minimo = Number(p.stockMinimo) || 5
                      const reservado = Number(p.stockReservado) || 0
                      return Math.max((Number(p.currentStock) || 0) - reservado, 0) < minimo
                    })
                  : visibleStockProducts
                ).map((product) => {
                  const stockMinimo = Number(product.stockMinimo) || 5
                  const stockReservado = Number(product.stockReservado) || 0
                  const stockDisponible = Math.max((Number(product.currentStock) || 0) - stockReservado, 0)
                  const isLow = stockDisponible < stockMinimo
                  const isCritical = stockDisponible < Math.ceil(stockMinimo / 2)
                  return (
                    <div key={product.id} className={`admin-table-row${isLow ? ' alert' : ''}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 1rem', alignItems: 'center' }}>
                      <div>
                        <strong>{product.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{product.sku}</div>
                      </div>
                      <EditableNumberField
                        value={product.currentStock}
                        onCommit={(nextValue) =>
                          updateProductStock(product.id, nextValue, session.name)
                        }
                        suffix="uni"
                      />
                      <span style={{ color: '#64748b' }}>{stockReservado}</span>
                      <strong style={{ color: isCritical ? '#e53e3e' : isLow ? '#d97706' : undefined }}>
                        {stockDisponible}
                      </strong>
                      <EditableNumberField
                        value={stockMinimo}
                        onCommit={(nextValue) =>
                          updateProductStockMinimo(product.id, nextValue, session.name)
                        }
                        suffix="uni"
                      />
                      <span className={isCritical ? 'admin-stock-critical' : isLow ? 'admin-stock-critical' : undefined} style={{ fontSize: '0.75rem' }}>
                        {isCritical ? 'Crítico' : isLow ? 'Bajo' : 'Normal'}
                      </span>
                      <div className="admin-stock-actions">
                        <button
                          type="button"
                          className="admin-action-btn neutral"
                          onClick={() => setStockAdjustProduct(product)}
                          title="Registrar movimiento de stock"
                        >
                          Ajustar
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn cancel"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={productIdsInOrders.has(product.id)}
                          title={
                            productIdsInOrders.has(product.id)
                              ? 'No se puede eliminar porque ya forma parte de pedidos cargados.'
                              : 'Eliminar producto'
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })}

                {visibleStockProducts.length === 0 ? (
                  <div className="admin-stock-empty">
                    No encontramos productos con esa búsqueda.
                  </div>
                ) : null}
              </div>

              {filteredStockProducts.length > STOCK_PAGE_SIZE ? (
                <div className="admin-stock-pagination">
                  <button
                    type="button"
                    className="admin-action-btn neutral"
                    disabled={stockPage <= 1}
                    onClick={() => setStockPage((current) => Math.max(current - 1, 1))}
                  >
                    Anterior
                  </button>
                  <span>
                    Pagina {Math.min(stockPage, stockTotalPages)} de {stockTotalPages}
                  </span>
                  <button
                    type="button"
                    className="admin-action-btn neutral"
                    disabled={stockPage >= stockTotalPages}
                    onClick={() =>
                      setStockPage((current) => Math.min(current + 1, stockTotalPages))
                    }
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </div>
            </section>
          ) : null}
          {/* end stock__disabled */}

          {activeSection === 'facturacion' ? (
            <section className="admin-section">
              <FacturacionSection
                facturas={facturas}
                loading={facturasLoading}
                loaded={facturasLoaded}
                filtroEstado={facturaFiltroEstado}
                onFiltroEstadoChange={setFacturaFiltroEstado}
                clients={clientsWithTier}
                onLoad={() => {
                  if (facturasLoaded) return
                  setFacturasLoading(true)
                  fetch('/api/admin/facturas', { headers: { Authorization: `Bearer ${getAuthToken()}` } })
                    .then((r) => r.json())
                    .then((data) => { if (data.ok) { setFacturas(data.facturas); setFacturasLoaded(true) } })
                    .catch(() => {})
                    .finally(() => setFacturasLoading(false))
                }}
                onAnular={(id) => {
                  fetch(`/api/admin/facturas/${id}/anular`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${getAuthToken()}` },
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.ok) setFacturas((prev) => prev.map((f) => f.id === id ? { ...f, estado: 'anulada' } : f))
                    })
                    .catch(() => {})
                }}
                onCreateFromOrder={(order) => {
                  const orderData = ordersWithClient.find((o) => o.id === order.id)
                  const client = orderData?.client ?? null
                  const items = buildOrderRows(order.items, products)
                  const tipoFactura = client?.condicionIva === 'Responsable Inscripto' ? 'A' : 'B'
                  const subtotal = Math.round((order.total / 1.21) * 100) / 100
                  const iva = order.total - subtotal
                  fetch('/api/admin/facturas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                    body: JSON.stringify({
                      tipo: tipoFactura,
                      client_json_id: order.clientId,
                      pedido_json_id: order.id,
                      subtotal,
                      iva,
                      total: order.total,
                      items,
                      datos_cliente: client ? { businessName: client.businessName, taxId: client.taxId, address: client.address } : null,
                    }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.ok) {
                        setFacturas((prev) => [data.factura, ...prev])
                        setFacturasLoaded(true)
                      }
                    })
                    .catch(() => {})
                }}
              />
            </section>
          ) : null}

          {activeSection === 'fidelizacion' ? (
            <section className="px-section">
              {/* Header */}
              <div className="px-header">
                <div className="px-header-left">
                  <span className="px-eyebrow">Programa de fidelización</span>
                  <h2 className="px-title">Niveles y beneficios</h2>
                  <p className="px-subtitle">
                    1 punto cada{' '}
                    <strong>${settings.pointsRatio?.toLocaleString('es-AR') ?? '1.000'}</strong> facturado ·
                    Puntos se acreditan al despachar el pedido
                  </p>
                </div>
              </div>

              {/* KPI bar */}
              {(() => {
                const tierCounts = TIER_ORDER.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})
                clientsWithTier.forEach((c) => { tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1 })
                const totalClients = clientsWithTier.length
                const totalPts = clientsWithTier.reduce((s, c) => s + getClientLifetimePoints(c), 0)
                const avgPts = totalClients > 0 ? Math.round(totalPts / totalClients) : 0
                return (
                  <div className="px-kpi-bar">
                    <div className="px-kpi tone-blue">
                      <span className="px-kpi-label">Clientes en programa</span>
                      <span className="px-kpi-value">{totalClients}</span>
                      <span className="px-kpi-sub">{TIER_ORDER.length} niveles activos</span>
                    </div>
                    <div className="px-kpi tone-violet">
                      <span className="px-kpi-label">Puntos acumulados</span>
                      <span className="px-kpi-value">{totalPts.toLocaleString('es-AR')}</span>
                      <span className="px-kpi-sub">Total histórico del programa</span>
                    </div>
                    <div className="px-kpi tone-green">
                      <span className="px-kpi-label">Promedio por cliente</span>
                      <span className="px-kpi-value">{avgPts.toLocaleString('es-AR')} pts</span>
                      <span className="px-kpi-sub">Saldo medio acumulado</span>
                    </div>
                    <div className="px-kpi tone-amber">
                      <span className="px-kpi-label">Top nivel</span>
                      <span className="px-kpi-value">{tierCounts[TIER_ORDER[TIER_ORDER.length - 1]]}</span>
                      <span className="px-kpi-sub">Clientes en {TIER_ORDER[TIER_ORDER.length - 1]}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Distribution by tier */}
              <article className="px-card">
                <div className="px-card-head">
                  <div>
                    <h3 className="px-card-title">Distribución de clientes por nivel</h3>
                    <p className="px-card-sub">Composición actual del programa</p>
                  </div>
                </div>
                {(() => {
                  const tierCounts = TIER_ORDER.map((t) => ({
                    name: t,
                    count: clientsWithTier.filter((c) => c.tier === t).length,
                  }))
                  const total = tierCounts.reduce((s, t) => s + t.count, 0) || 1
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {tierCounts.map((t) => {
                        const pct = (t.count / total) * 100
                        const tierKey = t.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
                        return (
                          <div key={t.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span className={`px-tier tier-${tierKey}`}>{t.name}</span>
                              <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                                <strong style={{ color: '#0f172a' }}>{t.count}</strong> clientes · {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="px-progress" style={{ height: 8 }}>
                              <span style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </article>

              {/* Tier benefits configurator */}
              <article className="px-card">
                <div className="px-card-head">
                  <div>
                    <h3 className="px-card-title">Beneficios por nivel</h3>
                    <p className="px-card-sub">Configurá los descuentos y envíos para cada jerarquía</p>
                  </div>
                </div>
                <div className="px-grid-2">
                  {tierBenefits.map((tier) => {
                    const tierKey = tier.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
                    const shippingMode = tierBenefitConfigDrafts[tier.name]?.shippingMode ?? tier.config.shippingMode
                    return (
                      <section
                        key={tier.name}
                        style={{
                          border: '1px solid #e2e8f0',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          background: '#fafbfc',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <span className={`px-tier tier-${tierKey}`} style={{ fontSize: '0.78rem', padding: '4px 12px' }}>
                            {tier.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Umbral</span>
                            <EditableNumberField
                              value={settings.tierThresholds?.[tier.name] ?? 0}
                              onCommit={(nextValue) =>
                                updateTierThreshold(tier.name, nextValue, session.name)
                              }
                              suffix="pts"
                            />
                          </div>
                        </div>

                        <div className="px-field">
                          <label className="px-field-label">Envío</label>
                          <select
                            className="px-select"
                            value={shippingMode}
                            onChange={(event) =>
                              handleTierBenefitConfigChange(tier.name, { shippingMode: event.target.value })
                            }
                          >
                            <option value="none">Sin beneficio</option>
                            <option value="discounted">Envío con descuento</option>
                            <option value="free">Envío gratis</option>
                          </select>
                        </div>

                        {shippingMode === 'discounted' && (
                          <div className="px-field">
                            <label className="px-field-label">Descuento en envío (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="px-input"
                              value={
                                tierBenefitConfigDrafts[tier.name]?.shippingDiscountPercent ??
                                tier.config.shippingDiscountPercent
                              }
                              onChange={(event) =>
                                handleTierBenefitConfigChange(tier.name, {
                                  shippingDiscountPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                                })
                              }
                            />
                          </div>
                        )}

                        <div>
                          <div className="px-field-label" style={{ marginBottom: 4 }}>Descuentos por categoría (%)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {PRODUCT_BENEFIT_CATEGORIES.map((category) => (
                              <label key={category} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{category}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="px-input"
                                  style={{ height: 30, fontSize: '0.82rem' }}
                                  value={
                                    tierBenefitConfigDrafts[tier.name]?.categoryDiscounts?.[category] ??
                                    tier.config.categoryDiscounts?.[category] ??
                                    0
                                  }
                                  onChange={(event) =>
                                    handleTierCategoryDiscountChange(tier.name, category, event.target.value)
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-btn primary"
                          style={{ alignSelf: 'flex-start' }}
                          onClick={() => handleSaveTierBenefits(tier.name)}
                        >
                          Guardar beneficios
                        </button>
                      </section>
                    )
                  })}
                </div>
              </article>

              {/* Quick points adjustment */}
              <article className="px-card">
                <div className="px-card-head">
                  <div>
                    <h3 className="px-card-title">Ajuste rápido de puntos</h3>
                    <p className="px-card-sub">Buscá un cliente y corregí sus puntos acumulados</p>
                  </div>
                  <div className="px-search" style={{ maxWidth: 320 }}>
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    <input
                      type="text"
                      value={tierClientSearch}
                      onChange={(event) => setTierClientSearch(event.target.value)}
                      placeholder="Buscar cliente por nombre, CUIT o ciudad…"
                    />
                  </div>
                </div>
                {tierClients.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e2e8f0' }}>
                    {tierClients.map((client) => {
                      const tierKey = (client.tier || 'asociado').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
                      return (
                        <div
                          key={client.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.7rem 0.85rem',
                            borderBottom: '1px solid #f1f5f9',
                            gap: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{client.businessName}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span className={`px-tier tier-${tierKey}`} style={{ fontSize: '0.65rem' }}>{client.tier}</span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {getClientLifetimePoints(client).toLocaleString('es-AR')} pts actuales
                              </span>
                            </div>
                          </div>
                          <EditableNumberField
                            value={getClientLifetimePoints(client)}
                            onCommit={(nextValue) =>
                              updateClientPoints(client.id, nextValue, session.name)
                            }
                            suffix="pts"
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-empty">
                    {tierClientSearch
                      ? 'No encontramos clientes con esa búsqueda.'
                      : 'Empezá a escribir el nombre, CUIT o ciudad de un cliente para ajustar sus puntos.'}
                  </div>
                )}
              </article>
            </section>
          ) : null}

          {activeSection === 'configuracion' ? (
            <section className="admin-section">
            <div className="admin-config-grid">
              <article className="admin-card">
                <h3>Preferencias operativas</h3>
                <p className="admin-config-copy">
                  Define como queres operar pedidos y alertas desde el panel administrador.
                </p>
                <div className="admin-card-stack">
                  <div className="admin-config-row editable">
                    <div>
                      <strong>Aprobacion manual de pedidos</strong>
                      <span>Si esta activa, los pedidos nuevos quedan pendientes hasta revision.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.operational?.manualOrderApproval ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'operational',
                            { manualOrderApproval: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Activa</option>
                        <option value="off">Automatica</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-config-row editable">
                    <div>
                      <strong>Alertas de stock critico</strong>
                      <span>Controla si el CRM muestra productos con riesgo de quiebre de stock.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.operational?.criticalStockAlerts ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'operational',
                            { criticalStockAlerts: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Activas</option>
                        <option value="off">Ocultas</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-config-row editable">
                    <div>
                      <strong>Edicion de estados de pedido</strong>
                      <span>Permite mantener visible el control operativo del detalle de pedido.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.operational?.allowOrderStatusEditing ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'operational',
                            { allowOrderStatusEditing: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Habilitada</option>
                        <option value="off">Solo lectura</option>
                      </select>
                    </label>
                  </div>
                </div>
              </article>

              <article className="admin-card">
                <h3>Panel del cliente</h3>
                <p className="admin-config-copy">
                  Activa o desactiva bloques visibles del panel cliente desde administracion.
                </p>
                <div className="admin-card-stack">
                  <div className="admin-config-row editable">
                    <div>
                      <strong>Tarjeta de beneficios</strong>
                      <span>Muestra u oculta el bloque de descuentos activos en el inicio.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.clientPanel?.showBenefitsCard ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'clientPanel',
                            { showBenefitsCard: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Visible</option>
                        <option value="off">Oculta</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-config-row editable">
                    <div>
                      <strong>Tarjeta de pedido actual</strong>
                      <span>Controla si el seguimiento del ultimo pedido aparece en el inicio.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.clientPanel?.showCurrentOrderCard ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'clientPanel',
                            { showCurrentOrderCard: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Visible</option>
                        <option value="off">Oculta</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-config-row editable">
                    <div>
                      <strong>Repetir ultimo pedido</strong>
                      <span>Habilita el acceso rapido para repetir una compra anterior.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.clientPanel?.enableRepeatLastOrder ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'clientPanel',
                            { enableRepeatLastOrder: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Habilitado</option>
                        <option value="off">Oculto</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-config-row editable">
                    <div>
                      <strong>Modulo de chat</strong>
                      <span>Muestra u oculta la seccion de chat del panel cliente.</span>
                    </div>
                    <label className="admin-status-filter">
                      <select
                        value={settings.clientPanel?.enableChat ? 'on' : 'off'}
                        onChange={(event) =>
                          updateAdminSettings(
                            'clientPanel',
                            { enableChat: event.target.value === 'on' },
                            session.name,
                          )
                        }
                      >
                        <option value="on">Visible</option>
                        <option value="off">Oculto</option>
                      </select>
                    </label>
                  </div>
                </div>
              </article>

              <article className="admin-card">
                <h3>Branding y textos</h3>
                <p className="admin-config-copy">
                  Ajusta textos principales que impactan en la cabecera del admin y el inicio del cliente.
                </p>
                <div className="admin-card-stack">
                  <label className="admin-form-field">
                    <span>Titulo principal del dashboard admin</span>
                    <input
                      type="text"
                      defaultValue={settings.branding?.adminDashboardTitle}
                      onBlur={(event) =>
                        updateAdminSettings(
                          'branding',
                          { adminDashboardTitle: event.target.value.trim() || 'Panel operativo' },
                          session.name,
                        )
                      }
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Titulo del inicio del cliente</span>
                    <input
                      type="text"
                      defaultValue={settings.branding?.clientHomeTitle}
                      onBlur={(event) =>
                        updateAdminSettings(
                          'branding',
                          {
                            clientHomeTitle:
                              event.target.value.trim() || 'Promociones y oportunidades de la semana',
                          },
                          session.name,
                        )
                      }
                    />
                  </label>
                </div>
              </article>

              {/* Gestión de usuarios y roles */}
              <article className="px-card">
                <div className="px-card-head">
                  <div>
                    <h3 className="px-card-title">Usuarios y roles del sistema</h3>
                    <p className="px-card-sub">
                      Gestioná quién accede al panel y qué puede ver cada uno.
                    </p>
                  </div>
                  {!usuariosLoaded && (
                    <button
                      type="button"
                      className="px-btn primary"
                      onClick={() => {
                        fetch('/api/admin/usuarios', { headers: { Authorization: `Bearer ${getAuthToken()}` } })
                          .then((r) => r.json())
                          .then((data) => { if (data.ok) { setUsuariosAdmin(data.usuarios); setUsuariosLoaded(true) } })
                          .catch(() => {})
                      }}
                    >
                      Cargar usuarios
                    </button>
                  )}
                </div>

                {usuariosLoaded && (
                  <>
                    {/* Leyenda de roles */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.6rem',
                      marginBottom: '1rem',
                    }}>
                      {[
                        { rol: 'admin',    desc: 'Acceso completo: ve y edita todo.' },
                        { rol: 'vendedor', desc: 'Pedidos, cotizaciones, clientes, mensajes, stock.' },
                        { rol: 'deposito', desc: 'Sólo pedidos, stock y datos de cliente para despacho.' },
                      ].map(({ rol, desc }) => {
                        const meta = ROL_LABELS[rol]
                        return (
                          <div key={rol} style={{
                            background: '#fff',
                            border: `1px solid #e2e8f0`,
                            borderLeft: `3px solid ${meta.color}`,
                            padding: '0.65rem 0.85rem',
                          }}>
                            <span style={{
                              display: 'inline-block',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              background: meta.bg,
                              color: meta.color,
                              marginBottom: 4,
                            }}>
                              {meta.label}
                            </span>
                            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>{desc}</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Form crear nuevo usuario */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '0.9rem',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.6rem' }}>
                        Crear nuevo usuario
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'end',
                      }}>
                        <div className="px-field">
                          <label className="px-field-label">Nombre</label>
                          <input
                            type="text"
                            className="px-input"
                            placeholder="Juan Pérez"
                            value={newUserForm.name}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="px-field">
                          <label className="px-field-label">Email</label>
                          <input
                            type="email"
                            className="px-input"
                            placeholder="juan@empresa.com"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div className="px-field">
                          <label className="px-field-label">Contraseña</label>
                          <input
                            type="password"
                            className="px-input"
                            placeholder="Mín. 6 caracteres"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                          />
                        </div>
                        <div className="px-field">
                          <label className="px-field-label">Rol</label>
                          <select
                            className="px-select"
                            value={newUserForm.rol}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, rol: e.target.value }))}
                          >
                            <option value="admin">Administrador</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="deposito">Depósito</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="px-btn primary"
                          disabled={newUserSaving || !newUserForm.name || !newUserForm.email || !newUserForm.password}
                          onClick={async () => {
                            setNewUserSaving(true)
                            setNewUserError('')
                            try {
                              const res = await fetch('/api/admin/usuarios', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                                body: JSON.stringify(newUserForm),
                              })
                              const data = await res.json()
                              if (!data.ok) throw new Error(data.message || 'No se pudo crear el usuario')
                              setUsuariosAdmin((prev) => [...prev, data.usuario])
                              setNewUserForm({ name: '', email: '', password: '', rol: 'vendedor' })
                            } catch (e) {
                              setNewUserError(e.message)
                            } finally {
                              setNewUserSaving(false)
                            }
                          }}
                        >
                          {newUserSaving ? 'Creando…' : '+ Crear'}
                        </button>
                      </div>
                      {newUserError && (
                        <div style={{
                          marginTop: '0.5rem', padding: '0.4rem 0.65rem',
                          background: '#fef2f2', border: '1px solid #fecaca',
                          color: '#991b1b', fontSize: '0.78rem',
                        }}>
                          {newUserError}
                        </div>
                      )}
                    </div>

                    {/* Tabla de usuarios existentes */}
                    <div className="px-table-wrap">
                      <table className="px-table">
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th className="center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuariosAdmin.map((u) => {
                            const rolKey = u.rol === 'superadmin' ? 'admin' : (u.rol || 'admin')
                            const meta = ROL_LABELS[rolKey] || ROL_LABELS.admin
                            const isMe = u.id === session.id
                            return (
                              <tr key={u.id}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                                    {u.name}
                                    {isMe && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#1A1FBE', fontWeight: 700 }}>(vos)</span>}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.email}</div>
                                </td>
                                <td>
                                  <select
                                    className="px-select"
                                    style={{ height: 28, fontSize: '0.78rem' }}
                                    value={rolKey}
                                    disabled={isMe}
                                    onChange={(e) => {
                                      fetch(`/api/admin/usuarios/${u.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                                        body: JSON.stringify({ rol: e.target.value }),
                                      })
                                        .then((r) => r.json())
                                        .then((data) => {
                                          if (data.ok) setUsuariosAdmin((prev) => prev.map((x) => x.id === u.id ? { ...x, rol: e.target.value } : x))
                                        })
                                        .catch(() => {})
                                    }}
                                  >
                                    <option value="admin">Administrador</option>
                                    <option value="vendedor">Vendedor</option>
                                    <option value="deposito">Depósito</option>
                                  </select>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                                      background: u.is_active ? '#dcfce7' : '#fee2e2',
                                      color: u.is_active ? '#166534' : '#991b1b',
                                      letterSpacing: '0.04em', textTransform: 'uppercase',
                                    }}
                                  >
                                    {u.is_active ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td className="center">
                                  <button
                                    type="button"
                                    className={`px-btn px-btn-sm ${u.is_active ? 'danger' : 'success'}`}
                                    disabled={isMe}
                                    onClick={() => {
                                      fetch(`/api/admin/usuarios/${u.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                                        body: JSON.stringify({ is_active: !u.is_active }),
                                      })
                                        .then((r) => r.json())
                                        .then((data) => {
                                          if (data.ok) setUsuariosAdmin((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
                                        })
                                        .catch(() => {})
                                    }}
                                  >
                                    {u.is_active ? 'Desactivar' : 'Activar'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </article>

              {/* Módulo 2 — Listas de precios */}
              <article className="admin-card">
                <h3>Listas de precios</h3>
                <p className="admin-config-copy">Administrá las listas de precios para asignar a clientes.</p>

                {!listasPreciosLoaded ? (
                  <button
                    type="button"
                    className="admin-primary-btn"
                    style={{ marginBottom: '1rem' }}
                    onClick={() => {
                      fetch('/api/admin/listas-precios', { headers: { Authorization: `Bearer ${getAuthToken()}` } })
                        .then((r) => r.json())
                        .then((data) => { if (data.ok) { setListasPreciosData(data.listas); setListasPreciosLoaded(true) } })
                        .catch(() => {})
                    }}
                  >
                    Cargar listas
                  </button>
                ) : null}

                {listasPreciosLoaded ? (
                  <div>
                    <div className="admin-activity-form" style={{ marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Nombre de la lista"
                        value={newListaForm.nombre}
                        onChange={(e) => setNewListaForm((f) => ({ ...f, nombre: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="Descripción (opcional)"
                        value={newListaForm.descripcion}
                        onChange={(e) => setNewListaForm((f) => ({ ...f, descripcion: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="admin-primary-btn"
                        onClick={() => {
                          if (!newListaForm.nombre.trim()) return
                          fetch('/api/admin/listas-precios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                            body: JSON.stringify({ nombre: newListaForm.nombre, descripcion: newListaForm.descripcion }),
                          })
                            .then((r) => r.json())
                            .then((data) => {
                              if (data.ok) {
                                setListasPreciosData((prev) => [...prev, data.lista])
                                setNewListaForm({ nombre: '', descripcion: '' })
                              }
                            })
                            .catch(() => {})
                        }}
                      >
                        + Agregar lista
                      </button>
                    </div>

                    <div className="admin-table">
                      <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.5rem' }}>
                        <span>Nombre</span>
                        <span>Descripción</span>
                        <span>Estado</span>
                        <span>Acciones</span>
                      </div>
                      {listasPreciosData.map((lista) => (
                        <div key={lista.id} className="admin-table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                          {editingListaPrecio === lista.id ? (
                            <input
                              type="text"
                              defaultValue={lista.nombre}
                              onBlur={(e) => {
                                fetch(`/api/admin/listas-precios/${lista.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
                                  body: JSON.stringify({ nombre: e.target.value }),
                                })
                                  .then((r) => r.json())
                                  .then((data) => {
                                    if (data.ok) setListasPreciosData((prev) => prev.map((l) => l.id === lista.id ? data.lista : l))
                                    setEditingListaPrecio(null)
                                  })
                                  .catch(() => setEditingListaPrecio(null))
                              }}
                            />
                          ) : (
                            <strong>{lista.nombre}</strong>
                          )}
                          <span>{lista.descripcion || '—'}</span>
                          <span className={`admin-status-badge ${lista.activa ? 'aprobado' : 'cancelado'}`}>
                            {lista.activa ? 'Activa' : 'Inactiva'}
                          </span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button type="button" className="admin-action-btn neutral" onClick={() => setEditingListaPrecio(lista.id)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn cancel"
                              onClick={() => {
                                if (!window.confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return
                                fetch(`/api/admin/listas-precios/${lista.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${getAuthToken()}` },
                                })
                                  .then((r) => r.json())
                                  .then((data) => {
                                    if (data.ok) setListasPreciosData((prev) => prev.filter((l) => l.id !== lista.id))
                                  })
                                  .catch(() => {})
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                      {listasPreciosData.length === 0 ? (
                        <div className="admin-empty-inline">No hay listas de precios configuradas.</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            </div>
            </section>
          ) : null}
        </section>
      </section>

      <OrderDetailModal
        order={selectedOrder}
        client={selectedOrderClient}
        products={products}
        adminNotes={selectedOrder?.adminNotes ?? ''}
        onAdminNotesChange={(nextValue) =>
          selectedOrder ? updateOrderAdminNotes(selectedOrder.id, nextValue) : null
        }
        onStatusChange={(nextStatus) =>
          selectedOrder ? handleOrderStatusSelection(selectedOrder, nextStatus) : null
        }
        onPrintPackingSlip={() =>
          selectedOrder ? handlePrintPackingSlip(selectedOrder) : null
        }
        onGenerateInvoice={() =>
          selectedOrder ? handleGenerateInvoice(selectedOrder) : null
        }
        onConfirmShip={() =>
          selectedOrder ? handleConfirmAndShip(selectedOrder) : null
        }
        onClose={() => setSelectedOrderId(null)}
      />

      <ClientDetailModal
        client={selectedClient}
        clientOrders={selectedClientOrders}
        session={session}
        onOpenOrderDetail={handleOpenOrderFromClient}
        onAddActivity={(activity) =>
          selectedClient
            ? addClientActivity(
                selectedClient.id,
                { ...activity, user: session.name },
                session.name,
              )
            : null
        }
        onDelete={() => {
          if (!selectedClient) return

          const confirmed = window.confirm(`Eliminar a ${selectedClient.businessName}?`)

          if (confirmed) {
            deleteClient(selectedClient.id, session.name)
            setSelectedClientId(null)
          }
        }}
        onClose={() => setSelectedClientId(null)}
      />

      {isAuditModalOpen ? (
        <AuditHistoryModal
          entries={auditLog}
          page={auditPage}
          onPageChange={setAuditPage}
          onClose={() => setIsAuditModalOpen(false)}
        />
      ) : null}

      <ClientFormModal
        initialValues={clientFormInitialValues}
        onSave={(payload) => {
          saveClient(payload, session.name)
          setEditingClientId(null)
          setIsCreatingClient(false)
        }}
        onClose={() => {
          setEditingClientId(null)
          setIsCreatingClient(false)
        }}
      />

      <PaymentModal
        client={paymentClient}
        onClose={() => setPaymentClientId(null)}
        onSave={(payment) => {
          registerClientPayment(paymentClient.id, payment, session.name)
          setPaymentClientId(null)
        }}
      />

      <ProductImportModal
        isOpen={isProductImportOpen}
        onClose={() => setIsProductImportOpen(false)}
        existingProducts={products}
        onImport={(importedProducts, options) =>
          importProducts(importedProducts, options, session.name)
        }
      />

      <QuickNoteModal
        client={quickNoteClient}
        onClose={() => setQuickNoteClientId(null)}
        onSave={(note) => {
          addQuickClientNote(quickNoteClient.id, note, session.name)
          setQuickNoteClientId(null)
        }}
      />

      <ClientAiModal
        client={aiClient}
        clientOrders={aiClientOrders}
        products={products}
        onClose={() => setAiClientId(null)}
      />

      {stockAdjustProduct ? (
        <StockAdjustModal
          product={stockAdjustProduct}
          onClose={() => setStockAdjustProduct(null)}
          onAdjust={(product, delta, motivo, tipo) => {
            adjustProductStock(product.id, delta, motivo, session.name)
            const token = getAuthToken()
            fetch('/api/admin/stock-movimientos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                producto_json_id: String(product.id),
                tipo,
                cantidad: delta,
                motivo,
              }),
            }).catch(() => {})
          }}
        />
      ) : null}
    </main>
  )
}
