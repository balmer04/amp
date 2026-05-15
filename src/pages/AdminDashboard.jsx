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
} from '../lib/businessLogic'

const adminSections = [
  { id: 'dashboard', label: 'Inicio' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'facturacion', label: 'Facturación' },
  { id: 'promociones', label: 'Promociones' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'cobranzas', label: 'Cobranzas' },
  { id: 'chats', label: 'Chats' },
  { id: 'stock', label: 'Productos y stock' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'ia', label: 'Asistente IA' },
  { id: 'fidelizacion', label: 'Fidelización' },
  { id: 'configuracion', label: 'Configuración' },
]
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
    items: ['clientes', 'cobranzas', 'chats'],
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
    <section className="admin-section">
      <ChatAdmin />
    </section>
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
  const [formValues, setFormValues] = useState(initialValues)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
  }, [initialValues])

  if (!initialValues || !formValues) {
    return null
  }

  const updateField = (key, value) => {
    setFormValues((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = () => {
    const nextErrors = validateClientForm(formValues)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    onSave({
      ...formValues,
      points: Number(formValues.points) || 0,
      creditLimit: Number(formValues.creditLimit) || 0,
      pendingBalance: Number(formValues.pendingBalance) || 0,
      specialDiscount: Number(formValues.specialDiscount) || 0,
    })
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
            <span className="admin-card-eyebrow">Formulario</span>
            <h3>{formValues.id ? 'Editar cliente' : 'Alta de cliente'}</h3>
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

        <div className="admin-modal-footer">
          <button type="button" className="admin-action-btn neutral" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="admin-primary-btn" onClick={handleSubmit}>
            Guardar
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

// ─── Cobranzas: vista dedicada de cuentas por cobrar con aging buckets ─────
function CobranzasSection({ clients, orders, onOpenClient }) {
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
      return { ...c, daysSinceLastOrder: days, bucket, debtAmount: amount }
    })

    const total = Object.values(buckets).reduce((a, b) => a + b, 0)
    debtorsWithAging.sort((a, b) => b.debtAmount - a.debtAmount)

    return { debtors: debtorsWithAging, buckets, total }
  }, [clients, orders])

  return (
    <section className="admin-section">
      <div className="admin-metrics-grid">
        <MetricCard
          title="Deuda total"
          value={formatCurrency(data.total)}
          detail={`${data.debtors.length} clientes con saldo`}
          tone={data.total > 0 ? 'red' : 'slate'}
        />
        <MetricCard
          title="0–30 días"
          value={formatCurrency(data.buckets['0-30'])}
          detail="Reciente, riesgo bajo"
          tone="slate"
        />
        <MetricCard
          title="31–60 días"
          value={formatCurrency(data.buckets['31-60'])}
          detail="Atención comercial"
          tone="blue"
        />
        <MetricCard
          title="61–90 días"
          value={formatCurrency(data.buckets['61-90'])}
          detail="Riesgo medio"
          tone="navy"
        />
        <MetricCard
          title="90+ días"
          value={formatCurrency(data.buckets['90+'])}
          detail="Riesgo alto"
          tone={data.buckets['90+'] > 0 ? 'red' : 'slate'}
        />
      </div>

      <article className="admin-card">
        <div className="admin-section-header">
          <div>
            <span className="admin-card-eyebrow">Cuentas por cobrar</span>
            <h2>Ranking de deudores</h2>
          </div>
        </div>

        {data.debtors.length === 0 ? (
          <div className="admin-all-clear">Sin saldos pendientes ✓</div>
        ) : (
          <div className="admin-table">
            <div className="admin-table-row admin-table-head admin-cobranzas-grid">
              <span>Cliente</span>
              <span>Saldo</span>
              <span>% Límite</span>
              <span>Aging</span>
              <span></span>
            </div>
            {data.debtors.slice(0, 30).map((c) => {
              const usage = c.creditLimit > 0
                ? Math.round((c.debtAmount / c.creditLimit) * 100)
                : 0
              const agingTone =
                c.bucket === '90+' ? 'danger'
                : c.bucket === '61-90' ? 'warning'
                : c.bucket === '31-60' ? 'info'
                : 'neutral'
              return (
                <div key={c.id} className="admin-table-row admin-cobranzas-grid">
                  <div>
                    <strong>{c.businessName}</strong>
                    <small>{c.taxId || c.email}</small>
                  </div>
                  <strong>{formatCurrency(c.debtAmount)}</strong>
                  <span className={usage > 80 ? 'admin-pill danger' : 'admin-pill neutral'}>
                    {usage}%
                  </span>
                  <span className={`admin-pill ${agingTone}`}>{c.bucket} días</span>
                  <button
                    type="button"
                    className="admin-action-btn neutral"
                    onClick={() => onOpenClient(c.id)}
                  >
                    Abrir cliente
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )
}

// ─── Reportes: análisis profundo de ventas, productos y clientes ───────────
function ReportesSection({ orders, products, clients, ordersWithClient }) {
  const [periodo, setPeriodo] = useState(30)

  const data = useMemo(() => {
    const cutoff = Date.now() - periodo * 24 * 60 * 60 * 1000
    const ordersInPeriod = ordersWithClient.filter(
      (o) => new Date(o.createdAt).getTime() >= cutoff,
    )

    // Top productos
    const productMap = new Map()
    ordersInPeriod.forEach((o) => {
      ;(o.items || []).forEach((item) => {
        const cur = productMap.get(item.productId) || { units: 0, revenue: 0 }
        cur.units += Number(item.qty) || 0
        cur.revenue += (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)
        productMap.set(item.productId, cur)
      })
    })
    const topProducts = [...productMap.entries()]
      .map(([pid, v]) => {
        const p = products.find((x) => x.id === pid)
        return { id: pid, name: p?.name || `Producto ${pid}`, sku: p?.sku || '—', ...v }
      })
      .sort((a, b) => b.units - a.units)
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
        return { id: cid, name: c?.businessName || 'Desconocido', ...v }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Totales
    const revenue = ordersInPeriod.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const avgTicket = ordersInPeriod.length > 0 ? Math.round(revenue / ordersInPeriod.length) : 0
    const uniqueClients = new Set(ordersInPeriod.map((o) => o.clientId)).size

    return {
      ordersInPeriod,
      topProducts,
      topClients,
      revenue,
      avgTicket,
      uniqueClients,
      orderCount: ordersInPeriod.length,
    }
  }, [ordersWithClient, products, clients, periodo])

  return (
    <section className="admin-section">
      <article className="admin-card">
        <div className="admin-section-header">
          <div>
            <span className="admin-card-eyebrow">Período de análisis</span>
            <h2>Reportes de venta</h2>
          </div>
          <div className="admin-segmented">
            {[7, 30, 90, 180].map((d) => (
              <button
                key={d}
                type="button"
                className={periodo === d ? 'active' : ''}
                onClick={() => setPeriodo(d)}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>

        <div className="admin-metrics-grid">
          <MetricCard
            title="Facturación"
            value={formatCurrency(data.revenue)}
            detail={`${data.orderCount} pedidos`}
            tone="blue"
          />
          <MetricCard
            title="Ticket promedio"
            value={formatCurrency(data.avgTicket)}
            detail="Promedio por pedido"
            tone="navy"
          />
          <MetricCard
            title="Clientes activos"
            value={String(data.uniqueClients)}
            detail="Con al menos un pedido"
            tone="slate"
          />
          <MetricCard
            title="Frecuencia"
            value={data.uniqueClients > 0 ? (data.orderCount / data.uniqueClients).toFixed(1) : '0'}
            detail="Pedidos por cliente"
            tone="slate"
          />
        </div>
      </article>

      <div className="admin-reportes-grid">
        <article className="admin-card">
          <div className="admin-section-header">
            <div>
              <span className="admin-card-eyebrow">Productos</span>
              <h2>Top 10 más vendidos</h2>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head admin-reportes-products-grid">
              <span>#</span>
              <span>Producto</span>
              <span>Unidades</span>
              <span>Facturado</span>
            </div>
            {data.topProducts.length === 0 ? (
              <div className="admin-empty-row">Sin ventas en el período</div>
            ) : (
              data.topProducts.map((p, i) => (
                <div key={p.id} className="admin-table-row admin-reportes-products-grid">
                  <span className="admin-rank">{i + 1}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.sku}</small>
                  </div>
                  <strong>{p.units}</strong>
                  <span>{formatCurrency(p.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-section-header">
            <div>
              <span className="admin-card-eyebrow">Clientes</span>
              <h2>Top 10 facturación</h2>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head admin-reportes-clients-grid">
              <span>#</span>
              <span>Cliente</span>
              <span>Pedidos</span>
              <span>Facturado</span>
            </div>
            {data.topClients.length === 0 ? (
              <div className="admin-empty-row">Sin clientes en el período</div>
            ) : (
              data.topClients.map((c, i) => (
                <div key={c.id} className="admin-table-row admin-reportes-clients-grid">
                  <span className="admin-rank">{i + 1}</span>
                  <strong>{c.name}</strong>
                  <span>{c.orders}</span>
                  <strong>{formatCurrency(c.revenue)}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
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
    inicio: new Date().toISOString().slice(0, 10),
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
      tier: 'Asociado', inicio: new Date().toISOString().slice(0, 10), fin: '', activa: true,
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
  { id: 'borrador', label: 'Borrador', tone: 'neutral' },
  { id: 'enviada', label: 'Enviada', tone: 'info' },
  { id: 'aceptada', label: 'Aceptada', tone: 'success' },
  { id: 'rechazada', label: 'Rechazada', tone: 'danger' },
  { id: 'vencida', label: 'Vencida', tone: 'warning' },
  { id: 'convertida', label: 'Convertida', tone: 'success' },
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
      const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10)
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
        const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10)
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

  return (
    <section className="admin-section">
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
                {editing ? 'Actualizar' : 'Crear cotización'}
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
    const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000
    const ordersLast7d = ordersWithClient.filter(
      (order) => new Date(order.createdAt).getTime() >= cutoff7d,
    )

    return {
      totalRecent: ordersLast7d.length,
      amountRecent: ordersLast7d.reduce((sum, order) => sum + order.total, 0),
      pending: ordersWithClient.filter((order) => order.status === 'Pendiente').length,
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
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(today.getDate() - (6 - index))
      return {
        key: date.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
          month: '2-digit',
        }).format(date),
        value: 0,
      }
    })

    orders
      .filter((order) => ['Aprobado', 'Despachado'].includes(order.status))
      .forEach((order) => {
        const key = new Date(order.createdAt).toISOString().slice(0, 10)
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
            {adminSectionGroups.map((group) => (
              <div key={group.title} className="admin-sidebar-group">
                <span className="admin-sidebar-group-title">{group.title}</span>
                <div className="admin-sidebar-group-links">
                  {group.items.map((sectionId) => {
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
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="admin-sidebar-profile">
            <div className="admin-profile-card">
              <div className="admin-profile-chip">
                <span>{initials}</span>
                <div>
                  <strong>{session.name}</strong>
                  <small>{session.email}</small>
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

              {activeSection === 'clientes' ? (
                <div className="admin-orders-filters admin-clients-toolbar admin-clients-topbar-actions">
                  <label className="admin-search admin-search-wide">
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Buscar por nombre, CUIT o ciudad..."
                    />
                  </label>

                  <button
                    type="button"
                    className="admin-action-btn neutral"
                    onClick={handleExportClientsCsv}
                  >
                    Exportar
                  </button>

                  <button
                    type="button"
                    className="admin-primary-btn"
                    onClick={() => setIsCreatingClient(true)}
                  >
                    + Nuevo cliente
                  </button>

                  <label className="admin-status-filter">
                    <select
                      value={clientLevelFilter}
                      onChange={(event) => setClientLevelFilter(event.target.value)}
                    >
                      <option value="Todos">Todos los niveles</option>
                      {TIER_ORDER.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-status-filter">
                    <select
                      value={clientStatusFilter}
                      onChange={(event) => setClientStatusFilter(event.target.value)}
                    >
                      <option value="Todos">Todos los estados</option>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Bloqueado">Bloqueado</option>
                    </select>
                  </label>
                </div>
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
            <section className="admin-section">
              <div className="admin-clients-summary admin-clients-summary-main">
                <div className="admin-clients-summary-item accent-blue">
                  <span>Total clientes</span>
                  <strong>{clientSummary.total}</strong>
                  <small>Registrados en el sistema</small>
                </div>
                <div className="admin-clients-summary-item accent-green">
                  <span>Activos</span>
                  <strong>{clientSummary.active}</strong>
                  <small>Compraron en los ultimos 60 dias</small>
                </div>
                <div className="admin-clients-summary-item accent-orange">
                  <span>En riesgo</span>
                  <strong>{clientSummary.risk}</strong>
                  <small>Sin compras hace +60 dias</small>
                </div>
                <div className="admin-clients-summary-item accent-red">
                  <span>Saldo pendiente</span>
                  <strong>{formatCurrency(clientSummary.withDebtAmount)}</strong>
                  <small>Clientes con deuda activa</small>
                </div>
              </div>

              <div className="admin-clients-controls-row">
                <div className="admin-client-quick-filters">
                  {[
                    ['Todos', clientSummary.total],
                    ['Activos', clientSummary.active],
                    ['En riesgo', clientSummary.risk],
                    ['Inactivos', clientSummary.inactive],
                    ['Con saldo pendiente', clientSummary.withDebtClients],
                    ['Bloqueados', clientSummary.blocked],
                  ].map(([filter, count]) => (
                    <button
                      key={filter}
                      type="button"
                      className={
                        clientQuickFilter === filter
                          ? filter === 'En riesgo'
                            ? 'admin-client-filter-pill active risk'
                            : 'admin-client-filter-pill active'
                          : filter === 'En riesgo'
                            ? 'admin-client-filter-pill risk'
                            : 'admin-client-filter-pill'
                      }
                      onClick={() => setClientQuickFilter(filter)}
                    >
                      <span>{filter}</span>
                      <strong>{count}</strong>
                    </button>
                  ))}
                </div>

                <label className="admin-clients-sort-select">
                  <span>Ordenar por</span>
                  <select
                    value={`${clientSort.key}:${clientSort.direction}`}
                    onChange={(event) => handleClientSortSelect(event.target.value)}
                  >
                    <option value="lastPurchase:desc">Ultima compra</option>
                    <option value="businessName:asc">Nombre</option>
                    <option value="tier:asc">Nivel</option>
                    <option value="totalBilled:desc">Facturacion total</option>
                    <option value="pendingBalance:desc">Saldo pendiente</option>
                    <option value="status:asc">Estado</option>
                  </select>
                </label>
              </div>

              <div className="admin-card admin-card-table-scroll admin-clients-card">
                <div className="admin-table">
                  <div className="admin-table-row admin-table-head admin-client-crm-grid">
                    <button type="button" className="admin-sort-btn" onClick={() => toggleClientSort('businessName')}>
                      Cliente
                    </button>
                    <button type="button" className="admin-sort-btn" onClick={() => toggleClientSort('tier')}>
                      Nivel
                    </button>
                    <button type="button" className="admin-sort-btn" onClick={() => toggleClientSort('lastPurchase')}>
                      Ultima compra
                    </button>
                    <button type="button" className="admin-sort-btn" onClick={() => toggleClientSort('totalBilled')}>
                      Facturacion total
                    </button>
                    <button type="button" className="admin-sort-btn" onClick={() => toggleClientSort('pendingBalance')}>
                      Saldo pend.
                    </button>
                    <button type="button" className="admin-sort-btn" onClick={() => toggleClientSort('status')}>
                      Estado
                    </button>
                    <span>Acciones</span>
                  </div>

                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className={
                        getClientFlags(client).hasOverdueBalance
                          ? 'admin-table-row admin-client-crm-grid admin-client-row alert'
                          : 'admin-table-row admin-client-crm-grid admin-client-row'
                      }
                    >
                      <div className="admin-client-cell">
                        <div className="admin-client-avatar">
                          {client.businessName
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="admin-client-main">
                          <strong>{client.businessName}</strong>
                          <span>
                            {client.category} · CUIT {client.taxId}
                          </span>
                          <div className="admin-client-flags-row">
                            {getClientFlags(client).isInactiveLongTime ? (
                              <span className="admin-client-flag warning" title="Sin compras en mas de 60 dias">
                                Sin compras +60 dias
                              </span>
                            ) : null}
                            {getClientFlags(client).hasOverdueBalance ? (
                              <span className="admin-client-flag danger" title="Saldo pendiente">
                                Saldo pendiente
                              </span>
                            ) : null}
                            {getClientFlags(client).isCloseToNextTier ? (
                              <span className="admin-client-flag star" title="Cerca de subir de nivel">
                                Cerca de subir
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="admin-tier-summary">
                        <TierBadge tier={client.tier} />
                        <small>{getClientLifetimePoints(client).toLocaleString('es-AR')} pts</small>
                      </div>
                      <div className="admin-client-last-purchase">
                        <strong>
                          {client.lastPurchase ? formatDate(client.lastPurchase.createdAt) : 'Sin compras'}
                        </strong>
                        <small>
                          {client.lastPurchase ? getRelativeTimeLabel(client.lastPurchase.createdAt) : 'Sin registros'}
                        </small>
                      </div>
                      <strong>{formatCurrency(client.totalBilled)}</strong>
                      <span>{formatCurrency(client.pendingBalance)}</span>
                      <button
                        type="button"
                        className={
                          client.status === 'Bloqueado'
                            ? 'admin-status-badge admin-status-toggle cancelado'
                            : client.status === 'Inactivo'
                              ? 'admin-status-badge admin-status-toggle pendiente'
                              : 'admin-status-badge admin-status-toggle aprobado'
                        }
                        title={`Cambiar a ${getNextClientStatus(client.status)}`}
                        onClick={() =>
                          updateClientStatus(
                            client.id,
                            getNextClientStatus(client.status),
                            session.name,
                          )
                        }
                      >
                        {client.status}
                      </button>
                      <div className="admin-order-actions admin-client-actions">
                        <button
                          type="button"
                          className="admin-table-link admin-client-action-view"
                          onClick={() => setSelectedClientId(client.id)}
                        >
                          Ver ficha
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn neutral admin-client-action-ai"
                          onClick={() => setAiClientId(client.id)}
                        >
                          IA
                        </button>
                        {client.pendingBalance > 0 ? (
                          <button
                            type="button"
                            className="admin-action-btn approve admin-client-action-payment"
                            onClick={() => setPaymentClientId(client.id)}
                          >
                            Reg. pago
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="admin-action-btn neutral admin-client-action-note"
                          onClick={() => setQuickNoteClientId(client.id)}
                        >
                          Nota
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-clients-footer">
                  <span>
                    {filteredClients.length} clientes
                    {clientSummary.risk > 0 ? ` · ${clientSummary.risk} alerta activa` : ''}
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'chats' ? (
            <section className="admin-section admin-chat-section">
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
            <section className="admin-section">
            <div className="admin-orders-summary-grid">
              <MetricCard title="Pedidos del dia" value={String(orderSummary.totalToday)} detail="Ingresados hoy" tone="navy" />
              <MetricCard title="Monto del dia" value={formatCurrency(orderSummary.amountToday)} detail="Facturacion del dia" tone="blue" />
              <MetricCard title="Pendientes" value={String(orderSummary.pending)} detail="Sin atencion definitiva" tone="red" />
              <MetricCard title="Despachados hoy" value={String(orderSummary.dispatchedToday)} detail="Pedidos ya enviados" tone="slate" />
            </div>

            <div className="admin-section-header admin-orders-header">
              <div className="admin-orders-filters admin-orders-filters-full">
                <button
                  type="button"
                  className="admin-action-btn neutral"
                  onClick={handleExportOrdersCsv}
                >
                  Exportar CSV
                </button>

                <label className="admin-search">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Buscar por pedido o cliente..."
                  />
                </label>

                <label className="admin-status-filter">
                  <select
                    value={orderStatusFilter}
                    onChange={(event) => setOrderStatusFilter(event.target.value)}
                  >
                    <option value="Todos">Todos los estados</option>
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-table">
                <div className="admin-table-row admin-table-head admin-orders-grid">
                  <span>N° Pedido</span>
                  <span>Cliente</span>
                  <span>Fecha</span>
                  <span>Productos</span>
                  <span>Total</span>
                  <span>Estado</span>
                  <span>Acciones</span>
                </div>

                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={
                      order.client?.pendingBalance > 0 && order.client?.status !== 'Activo'
                        ? 'admin-table-row admin-orders-grid admin-order-row alert'
                        : 'admin-table-row admin-orders-grid admin-order-row'
                    }
                  >
                    <div className="admin-order-id-cell">
                      <strong>{order.id}</strong>
                      <div className="admin-order-row-flags">
                        {order.isNew ? <span className="admin-order-flag new">NUEVO</span> : null}
                        {order.needsAttention ? <span className="admin-order-flag warning">⚠</span> : null}
                      </div>
                    </div>
                    <span>{order.clientName}</span>
                    <div className="admin-order-date-cell">
                      <span>{formatDate(order.createdAt)}</span>
                      <small>{order.relativeTime}</small>
                    </div>
                    <span>{order.productsPreview}</span>
                    <strong>{formatCurrency(order.total)}</strong>
                    <span className={`admin-status-badge ${getOrderStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                    <OrderActions
                      order={order}
                      onOpenDetail={() => setSelectedOrderId(order.id)}
                      onApprove={() => approveOrder(order.id, session.name)}
                      onCancel={() => handleCancelOrder(order)}
                      onChangeStatus={(nextStatus) =>
                        nextStatus === 'Despachado'
                          ? handleDispatchOrder(order)
                          : changeOrderStatus(order.id, nextStatus, session.name)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            </section>
          ) : null}

          {activeSection === 'stock' ? (
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
            <section className="admin-section">
            <div className="admin-fidelity-summary-grid">
              <article className="admin-card admin-fidelity-summary-card">
                <span className="admin-card-eyebrow">Regla de acumulacion</span>
                <strong>1 punto cada ${settings.pointsRatio?.toLocaleString('es-AR') ?? '1.000'}</strong>
                <p>Los puntos historicos se acreditan cuando el pedido pasa a estado despachado.</p>
              </article>

              <article className="admin-card admin-fidelity-summary-card">
                <span className="admin-card-eyebrow">Niveles activos</span>
                <strong>{TIER_ORDER.length} niveles configurados</strong>
                <p>Asociado, Socio, Preferencial y Estratégico con progresion automatica.</p>
              </article>

              <article className="admin-card admin-fidelity-summary-card">
                <span className="admin-card-eyebrow">Beneficios configurados</span>
                <strong>{tierBenefits.reduce((total, tier) => total + tier.benefits.length, 0)}</strong>
                <p>Lineas de beneficios activas para cada nivel comercial del programa.</p>
              </article>
            </div>

            <article className="admin-card admin-fidelity-benefits-card">
              <div className="admin-fidelity-benefits-header">
                <div>
                  <h3>Beneficios por nivel</h3>
                  <p className="admin-fidelity-helper">
                    Define los beneficios comerciales que ve el equipo para cada jerarquia.
                  </p>
                </div>
              </div>

              <div className="admin-fidelity-benefits-grid">
                {tierBenefits.map((tier) => (
                  <section key={tier.name} className="admin-tier-benefit-editor">
                    <div className="admin-tier-benefit-top">
                      <TierBadge tier={tier.name} />
                      <div className="admin-tier-threshold-inline">
                        <span>Umbral</span>
                        <EditableNumberField
                          value={settings.tierThresholds?.[tier.name] ?? 0}
                          onCommit={(nextValue) =>
                            updateTierThreshold(tier.name, nextValue, session.name)
                          }
                          suffix="pts"
                        />
                      </div>
                    </div>

                    <div className="admin-tier-benefit-form">
                      <label className="admin-form-field">
                        <span>Beneficio de envio</span>
                        <select
                          value={tierBenefitConfigDrafts[tier.name]?.shippingMode ?? tier.config.shippingMode}
                          onChange={(event) =>
                            handleTierBenefitConfigChange(tier.name, {
                              shippingMode: event.target.value,
                            })
                          }
                        >
                          <option value="none">Sin beneficio</option>
                          <option value="discounted">Envio con descuento</option>
                          <option value="free">Envio gratis</option>
                        </select>
                      </label>

                      {(tierBenefitConfigDrafts[tier.name]?.shippingMode ?? tier.config.shippingMode) ===
                      'discounted' ? (
                        <label className="admin-form-field">
                          <span>Descuento en envio (%)</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={
                              tierBenefitConfigDrafts[tier.name]?.shippingDiscountPercent ??
                              tier.config.shippingDiscountPercent
                            }
                            onChange={(event) =>
                              handleTierBenefitConfigChange(tier.name, {
                                shippingDiscountPercent: Math.max(
                                  0,
                                  Math.min(100, Number(event.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>
                      ) : null}

                      <div className="admin-tier-discount-grid">
                        {PRODUCT_BENEFIT_CATEGORIES.map((category) => (
                          <label key={category} className="admin-form-field">
                            <span>Descuento {category} (%)</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                tierBenefitConfigDrafts[tier.name]?.categoryDiscounts?.[category] ??
                                tier.config.categoryDiscounts?.[category] ??
                                0
                              }
                              onChange={(event) =>
                                handleTierCategoryDiscountChange(
                                  tier.name,
                                  category,
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="admin-tier-benefit-actions">
                      <button
                        type="button"
                        className="admin-action-btn primary"
                        onClick={() => handleSaveTierBenefits(tier.name)}
                      >
                        Guardar beneficios
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <article className="admin-card admin-fidelity-points-card">
              <div className="admin-fidelity-benefits-header">
                <div>
                  <h3>Ajuste rapido de puntos</h3>
                  <p className="admin-fidelity-helper">
                    Busca un cliente y suma o corrige sus puntos acumulados desde esta misma vista.
                  </p>
                </div>

                <label className="admin-search admin-search-wide admin-tier-client-search">
                  <input
                    type="text"
                    value={tierClientSearch}
                    onChange={(event) => setTierClientSearch(event.target.value)}
                    placeholder="Buscar cliente por nombre, CUIT o ciudad..."
                  />
                </label>
              </div>

              <div className="admin-tier-client-list">
                {tierClients.length > 0 ? (
                  tierClients.map((client) => (
                    <div key={client.id} className="admin-tier-client-row">
                      <div>
                        <strong>{client.businessName}</strong>
                        <span>
                          {client.tier} · {getClientLifetimePoints(client).toLocaleString('es-AR')} pts
                        </span>
                      </div>

                      <EditableNumberField
                        value={getClientLifetimePoints(client)}
                        onCommit={(nextValue) =>
                          updateClientPoints(client.id, nextValue, session.name)
                        }
                        suffix="pts"
                      />
                    </div>
                  ))
                ) : (
                  <div className="admin-stock-empty">
                    No encontramos clientes con esa busqueda.
                  </div>
                )}
              </div>
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

              {/* Módulo 7 — Gestión de Usuarios / Roles */}
              <article className="admin-card">
                <h3>Usuarios del sistema</h3>
                <p className="admin-config-copy">Administrá los usuarios con acceso al panel de administración.</p>
                <button
                  type="button"
                  className="admin-primary-btn"
                  style={{ marginBottom: '1rem' }}
                  onClick={() => {
                    if (usuariosLoaded) return
                    fetch('/api/admin/usuarios', { headers: { Authorization: `Bearer ${getAuthToken()}` } })
                      .then((r) => r.json())
                      .then((data) => { if (data.ok) { setUsuariosAdmin(data.usuarios); setUsuariosLoaded(true) } })
                      .catch(() => {})
                  }}
                >
                  {usuariosLoaded ? 'Usuarios cargados' : 'Cargar usuarios'}
                </button>

                {usuariosLoaded ? (
                  <div className="admin-table">
                    <div className="admin-table-row admin-table-head" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                      <span>Nombre / Email</span>
                      <span>Rol</span>
                      <span>Estado</span>
                      <span>Acciones</span>
                    </div>
                    {usuariosAdmin.map((u) => (
                      <div key={u.id} className="admin-table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <div>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                        </div>
                        <select
                          value={u.rol || 'admin'}
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
                          <option value="superadmin">Superadmin</option>
                          <option value="admin">Admin</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="deposito">Depósito</option>
                        </select>
                        <span className={`admin-status-badge ${u.is_active ? 'aprobado' : 'cancelado'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <button
                          type="button"
                          className={`admin-action-btn ${u.is_active ? 'cancel' : 'neutral'}`}
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
                      </div>
                    ))}
                  </div>
                ) : null}
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
