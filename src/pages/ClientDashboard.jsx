import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import ChatCliente from '../components/ChatCliente'
import { NexoftWordmark } from '../components/NexoftLogo'
import {
  buildOrderRows,
  buildQuantityMap,
  calculatePointsFromTotal,
  calculateShippingCost,
  formatCurrency,
  formatDate,
  formatDateTime,
  getDiscountedProductPrice,
  getLastOrderPreset,
  getLatestOrderStatusMeta,
  getTierBenefitSummary,
  getLoyaltyStatus,
} from '../lib/businessLogic'

const tabs = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'pedido', label: 'Armar pedido' },
  { id: 'historial', label: 'Mis pedidos' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'cuentacorriente', label: 'Cuenta corriente' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'cuenta', label: 'Mi cuenta' },
  { id: 'ia', label: 'Asistente IA' },
  { id: 'chat', label: 'Chat' },
]

const clientTabGroups = [
  { title: 'Inicio', items: ['inicio'] },
  { title: 'Comprar', items: ['catalogo', 'pedido', 'historial', 'cotizaciones'] },
  { title: 'Finanzas', items: ['cuentacorriente', 'beneficios'] },
  { title: 'Cuenta', items: ['cuenta'] },
  { title: 'Soporte', items: ['ia', 'chat'] },
]
const CLIENT_PRODUCT_PAGE_SIZE = 36
const CLIENT_VIEW_META = {
  inicio: {
    eyebrow: 'Panel cliente',
    title: 'Inicio',
    description: 'Promociones, descuentos y seguimiento comercial.',
  },
  pedido: {
    eyebrow: 'Panel cliente',
    title: 'Armar pedido',
    description: 'Buscador de productos, filtros y carga del pedido.',
  },
  checkout: {
    eyebrow: 'Panel cliente',
    title: 'Finalizar compra',
    description: 'Entrega, pago y validacion final del pedido.',
  },
  cuenta: {
    eyebrow: 'Panel cliente',
    title: 'Mi cuenta',
    description: 'Datos del cliente, puntos e historial comercial.',
  },
  ia: {
    eyebrow: 'Panel cliente',
    title: 'Asistente IA',
    description: 'Espacio preparado para ayuda inteligente comercial y operativa.',
  },
  chat: {
    eyebrow: 'Panel cliente',
    title: 'Chat',
    description: 'Conversacion directa con administracion.',
  },
  catalogo: {
    eyebrow: 'Productos',
    title: 'Catálogo',
    description: 'Explorá nuestro catálogo completo y agregá productos al pedido.',
  },
  historial: {
    eyebrow: 'Compras',
    title: 'Mis pedidos',
    description: 'Historial de pedidos, estado actual y recompra rápida.',
  },
  cotizaciones: {
    eyebrow: 'Pre-venta',
    title: 'Cotizaciones',
    description: 'Propuestas comerciales recibidas. Aceptalas y convertilas en pedido.',
  },
  cuentacorriente: {
    eyebrow: 'Finanzas',
    title: 'Cuenta corriente',
    description: 'Saldo, vencimientos y movimientos.',
  },
  beneficios: {
    eyebrow: 'Tu nivel',
    title: 'Beneficios y promociones',
    description: 'Descuentos activos y promos exclusivas por tu nivel.',
  },
}

const paymentMethods = [
  {
    id: 'transfer',
    title: 'Transferencia bancaria',
    text: 'Acreditacion rapida para cerrar el pedido comercial.',
  },
  {
    id: 'account',
    title: 'Cuenta corriente',
    text: 'Ideal para clientes con acuerdo y limite vigente.',
  },
  {
    id: 'card',
    title: 'Tarjeta',
    text: 'Pago inmediato para retirar o coordinar envio.',
  },
]

const deliveryOptions = [
  {
    id: 'pickup',
    title: 'Retiro en sucursal',
    text: 'Selecciona la sucursal habilitada para retirar tu pedido.',
  },
  {
    id: 'shipping',
    title: 'Envio a obra',
    text: 'Coordinamos direccion, franja horaria y costo logistico.',
  },
]

function normalizeTierClassName(tierName) {
  return String(tierName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function getClientLifetimePoints(client) {
  return Number(client?.lifetime_points ?? client?.points ?? 0)
}

function ClientSidebarIcon({ tabId }) {
  switch (tabId) {
    case 'inicio':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M7 10v9h10v-9" />
        </svg>
      )
    case 'pedido':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="19" r="1.6" />
          <circle cx="17" cy="19" r="1.6" />
          <path d="M4 5h2l2.2 9.2h9.4l2.1-6.4H7.3" />
        </svg>
      )
    case 'cuenta':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c1.7-3 4.1-4.5 6.5-4.5S16.8 16 18.5 19" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6.5h14v9H9.5L6 18v-2.5H5z" />
        </svg>
      )
    case 'catalogo':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="7" height="6" rx="1" />
          <rect x="13" y="5" width="7" height="6" rx="1" />
          <rect x="4" y="13" width="7" height="6" rx="1" />
          <rect x="13" y="13" width="7" height="6" rx="1" />
        </svg>
      )
    case 'historial':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'cotizaciones':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4M10 12h6M10 16h4" />
        </svg>
      )
    case 'cuentacorriente':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="1.5" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      )
    case 'beneficios':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.2l5-.7z" />
        </svg>
      )
    case 'ia':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 1.6 3.6L17 9l-3.4 1.4L12 14l-1.6-3.6L7 9l3.4-1.4z" />
          <path d="M18 15.5 19 18l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
        </svg>
      )
    default:
      return null
  }
}

function ClientSidebar({
  activeTab,
  onTabChange,
  tabs,
  client,
  session,
  loyaltyStatus,
  unreadCount,
  onLogout,
}) {
  const initials = (client.businessName || session.name || 'CL')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="client-sidebar">
      <div className="client-sidebar-brand">
        <NexoftWordmark size="md" tone="light" />
        <div className="client-sidebar-brand-meta">
          <span className="client-sidebar-status-dot" aria-hidden="true"></span>
          <small>Portal mayorista</small>
        </div>
      </div>

      <article className="client-sidebar-level-card">
        <span className="client-sidebar-level-label">Tu nivel</span>
        <div className="client-sidebar-level-tier">
          <strong className={`client-sidebar-tier-${normalizeTierClassName(loyaltyStatus.currentTier.name)}`}>
            {loyaltyStatus.currentTier.name}
          </strong>
        </div>
        <div className="client-sidebar-level-points">
          {loyaltyStatus.points.toLocaleString('es-AR')}
        </div>
        <span className="client-sidebar-level-caption">puntos acumulados</span>
        <div className="client-sidebar-level-progress">
          <span style={{ width: `${loyaltyStatus.progress}%` }}></span>
        </div>
        <small>
          {loyaltyStatus.nextTier
            ? `Faltan ${loyaltyStatus.pointsToNext.toLocaleString('es-AR')} para ${loyaltyStatus.nextTier.name}`
            : 'Nivel maximo alcanzado'}
        </small>
      </article>

      <nav className="client-sidebar-nav">
        {clientTabGroups.map((group) => (
          <div key={group.title} className="client-sidebar-group">
            <span className="client-sidebar-group-title">{group.title}</span>
            <div className="client-sidebar-group-links">
              {group.items.map((tabId) => {
                const tab = tabs.find((t) => t.id === tabId)
                if (!tab) return null
                const isActive =
                  activeTab === tab.id || (activeTab === 'checkout' && tab.id === 'pedido')
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={isActive ? 'client-sidebar-link active' : 'client-sidebar-link'}
                    onClick={() => onTabChange(tab.id)}
                  >
                    <span className="client-sidebar-link-main">
                      <span className="client-sidebar-link-icon">
                        <ClientSidebarIcon tabId={tab.id} />
                      </span>
                      <span>{tab.label}</span>
                    </span>
                    {tab.id === 'chat' && unreadCount > 0 ? (
                      <span className="client-sidebar-badge">{unreadCount}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="client-sidebar-profile">
        <div className="client-profile-card">
          <div className="client-profile-chip">
            <span>{initials}</span>
            <div>
              <strong>{client.businessName || session.name}</strong>
              <small>{session.email}</small>
            </div>
          </div>
          <button type="button" className="client-profile-logout" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </aside>
  )
}

function ClientPageHeader({
  activeTab,
  client,
  cartCount,
  onRepeatLastOrder,
  onCartClick,
  settings,
  onEditAccount,
}) {
  const meta = CLIENT_VIEW_META[activeTab] ?? CLIENT_VIEW_META.inicio
  const showQuickActions = activeTab !== 'checkout'
  const greetingDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const greetingHour = new Date().getHours()
  const greetingLabel =
    greetingHour < 12 ? 'Buen dia' : greetingHour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <header className="client-page-header">
      <div>
        {activeTab === 'inicio' ? (
          <div className="client-page-greeting">
            <h1>
              {greetingLabel}, {client.businessName || client.name}
            </h1>
            <p>{greetingDate}</p>
          </div>
        ) : (
          <>
            <span className="client-card-eyebrow">{meta.eyebrow}</span>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </>
        )}
      </div>

      {showQuickActions ? (
        <div className="client-page-actions">
          {activeTab === 'cuenta' ? (
            <button type="button" className="client-page-action-btn" onClick={onEditAccount}>
              Editar mis datos
            </button>
          ) : null}
          {settings.clientPanel?.enableRepeatLastOrder ? (
            <button type="button" className="client-page-action-btn" onClick={onRepeatLastOrder}>
              ↻ Repetir ultimo pedido
            </button>
          ) : null}
          <button type="button" className="client-page-action-btn" onClick={onCartClick}>
            Carrito
            <span className="client-page-action-badge">{cartCount}</span>
          </button>
        </div>
      ) : null}
    </header>
  )
}

function ChatOrderReference({ reference, onOpen }) {
  if (!reference?.orderId) {
    return null
  }

  return (
    <button type="button" className="chat-order-reference" onClick={onOpen}>
      <span className="chat-order-reference-label">Pedido vinculado</span>
      <strong>{reference.orderCode ?? reference.orderId}</strong>
      <small>
        {reference.status} · {formatCurrency(reference.total ?? 0)}
      </small>
    </button>
  )
}

function ClientChatOrderModal({ order, client, products, onClose }) {
  if (!order) {
    return null
  }

  const rows = buildOrderRows(order.items ?? [], products, client?.tier)
  const orderStatus = getLatestOrderStatusMeta(order.status)

  return (
    <div className="client-modal-backdrop" role="presentation">
      <div className="client-modal-card client-order-reference-modal">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Pedido referenciado</span>
            <h2>{order.id}</h2>
          </div>
          <span className={`order-status-pill ${orderStatus.tone}`}>{order.status}</span>
        </div>

        <div className="client-order-reference-grid">
          <div className="client-order-reference-item">
            <span>Fecha</span>
            <strong>{formatDateTime(order.createdAt)}</strong>
          </div>
          <div className="client-order-reference-item">
            <span>Entrega</span>
            <strong>{order.deliveryType}</strong>
          </div>
          <div className="client-order-reference-item">
            <span>Destino</span>
            <strong>{order.branch || client?.address || 'A confirmar'}</strong>
          </div>
          <div className="client-order-reference-item">
            <span>Total</span>
            <strong>{formatCurrency(order.total)}</strong>
          </div>
        </div>

        <div className="client-order-reference-list">
          {rows.map((row) => (
            <div key={row.productId} className="client-order-reference-row">
              <div>
                <strong>{row.name}</strong>
                <small>{row.sku}</small>
              </div>
              <span>x{row.qty}</span>
              <strong>{formatCurrency(row.totalValue)}</strong>
            </div>
          ))}
        </div>

        <div className="client-modal-actions">
          <button type="button" className="client-modal-btn secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientChatPage({
  chat,
  onSend,
  onTypingChange,
  unreadCount,
  typingLabel,
  orderOptions,
  selectedOrderId,
  onSelectedOrderChange,
  onOpenOrderReference,
}) {
  return (
    <section className="client-account-layout">
      <ClientChatCard
        chat={chat}
        onSend={onSend}
        onTypingChange={onTypingChange}
        unreadCount={unreadCount}
        typingLabel={typingLabel}
        orderOptions={orderOptions}
        selectedOrderId={selectedOrderId}
        onSelectedOrderChange={onSelectedOrderChange}
        onOpenOrderReference={onOpenOrderReference}
      />
    </section>
  )
}

function ClientAiPage() {
  return (
    <section className="client-ai-layout">
      <ChatCliente />
    </section>
  )
}

function QuantitySelector({ value, onDecrease, onIncrease, onChange, compact = false }) {
  const [draftValue, setDraftValue] = useState(String(value ?? 0))

  useEffect(() => {
    setDraftValue(String(value ?? 0))
  }, [value])

  return (
    <div className={compact ? 'qty-selector compact' : 'qty-selector'}>
      <button type="button" onClick={onDecrease} aria-label="Restar cantidad">
        -
      </button>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={draftValue}
        title="Escribi la cantidad con el teclado"
        onFocus={(event) => {
          event.target.select()
        }}
        onChange={(event) => {
          const nextRawValue = event.target.value
          setDraftValue(nextRawValue)

          if (nextRawValue === '') {
            return
          }

          onChange(nextRawValue)
        }}
        onBlur={() => {
          if (draftValue === '') {
            setDraftValue('0')
            onChange('0')
            return
          }

          onChange(draftValue)
        }}
        aria-label="Cantidad del producto"
      />
      <button type="button" onClick={onIncrease} aria-label="Sumar cantidad">
        +
      </button>
    </div>
  )
}

function AddToOrderControl({
  quantity,
  onDecrease,
  onIncrease,
  onChange,
  onAdd,
  compact = false,
  disabled = false,
}) {
  return (
    <div className={compact ? 'product-order-control compact' : 'product-order-control'}>
      <QuantitySelector
        value={quantity}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onChange={onChange}
        compact={compact}
      />
      <button
        type="button"
        className="product-add-icon"
        onClick={onAdd}
        aria-label="Agregar al pedido"
        disabled={disabled || quantity <= 0}
      >
        +
      </button>
    </div>
  )
}

function ViewSwitcher({ viewMode, onChange }) {
  return (
    <div className="view-switcher" role="group" aria-label="Selector de vista">
      <button
        type="button"
        className={viewMode === 'list' ? 'view-switcher-btn active' : 'view-switcher-btn'}
        onClick={() => onChange('list')}
        aria-label="Vista de lista"
        title="Vista de lista"
      >
        <span aria-hidden="true">≣</span>
      </button>
      <button
        type="button"
        className={viewMode === 'grid' ? 'view-switcher-btn active' : 'view-switcher-btn'}
        onClick={() => onChange('grid')}
        aria-label="Vista de galeria"
        title="Vista de galeria"
      >
        <span aria-hidden="true">▥</span>
      </button>
    </div>
  )
}

function getCatalogStockMeta(product) {
  const stock = Number(product?.currentStock) || 0

  if (stock <= 0) {
    return { label: 'Sin stock', tone: 'danger' }
  }

  if (stock <= 5) {
    return { label: 'Pocas unidades', tone: 'warning' }
  }

  return { label: 'Disponible', tone: 'success' }
}

function normalizeCategoryTone(category) {
  const normalized = String(category ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized.includes('latex')) return 'latex'
  if (normalized.includes('esmalte')) return 'esmalte'
  if (normalized.includes('impermeabil')) return 'impermeabilizante'
  if (normalized.includes('herramient')) return 'herramientas'
  return 'general'
}

function getCategoryMonogram(product) {
  const categoryWords = String(product?.category ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (categoryWords.length > 0) {
    return categoryWords.map((word) => word[0]).join('').toUpperCase()
  }

  return String(product?.code ?? product?.sku ?? 'PR').slice(0, 2).toUpperCase()
}

function ProductCard({ product, tierName, settings, quantity, onDecrease, onIncrease, onChange, onAdd }) {
  const discountedPrice = getDiscountedProductPrice(product, tierName, settings)
  const oldPriceCandidate =
    discountedPrice !== product.price ? Number(product.price) : Number(product.oldPrice)
  const effectiveOldPrice =
    Number.isFinite(oldPriceCandidate) && oldPriceCandidate > discountedPrice
      ? oldPriceCandidate
      : null
  const presentation = product.detail || 'Presentacion a confirmar'
  const stockMeta = getCatalogStockMeta(product)
  const categoryTone = normalizeCategoryTone(product.category)
  const categoryMonogram = getCategoryMonogram(product)

  return (
    <article className="product-card">
      <div className={`product-card-visual ${product.accent}`}>
        {product.badge ? <span className="product-badge">{product.badge}</span> : null}
        <span className={`product-category-chip ${categoryTone}`}>{categoryMonogram}</span>
      </div>
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p>
          {product.detail} · {product.brand}
        </p>
        <div className="product-meta-line">
          <span>Presentacion: {presentation}</span>
          <span>Min. 1</span>
        </div>
        <div className="product-stock-inline">
          <span className={`stock-badge compact ${stockMeta.tone}`}>{stockMeta.label}</span>
        </div>
        <div className="product-price-block">
          <strong>{formatCurrency(discountedPrice)}</strong>
          {effectiveOldPrice ? <span>{formatCurrency(effectiveOldPrice)}</span> : null}
        </div>
        {quantity > 0 ? (
          <small className="product-subtotal">Subtotal: {formatCurrency(discountedPrice * quantity)}</small>
        ) : null}
        {product.note ? <small>{product.note}</small> : null}
      </div>
      <div className="product-card-footer">
        <AddToOrderControl
          quantity={quantity}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onChange={onChange}
          onAdd={onAdd}
          disabled={product.currentStock <= 0}
        />
      </div>
    </article>
  )
}

function ProductListRow({ product, tierName, settings, quantity, onDecrease, onIncrease, onChange, onAdd }) {
  const discountedPrice = getDiscountedProductPrice(product, tierName, settings)
  const oldPriceCandidate =
    discountedPrice !== product.price ? Number(product.price) : Number(product.oldPrice)
  const effectiveOldPrice =
    Number.isFinite(oldPriceCandidate) && oldPriceCandidate > discountedPrice
      ? oldPriceCandidate
      : null
  const presentation = product.detail || 'Presentacion a confirmar'
  const stockMeta = getCatalogStockMeta(product)
  const categoryTone = normalizeCategoryTone(product.category)
  const categoryMonogram = getCategoryMonogram(product)

  return (
    <article className={quantity > 0 ? 'product-list-row selected' : 'product-list-row'}>
      <div className={`product-list-thumb ${product.accent}`}>
        <span className={`product-category-chip small ${categoryTone}`}>{categoryMonogram}</span>
      </div>
      <div className="product-list-info">
        <strong>{product.name}</strong>
        <span>
          SKU {product.sku} · {product.brand}
        </span>
        <small className="product-list-meta">
          Presentacion: {presentation} · Min. 1
        </small>
        <div className="product-list-stock">
          <span className={`stock-badge compact ${stockMeta.tone}`}>{stockMeta.label}</span>
        </div>
      </div>
      <div className="product-list-price">
        <strong>{formatCurrency(discountedPrice)}</strong>
        {effectiveOldPrice ? <span>{formatCurrency(effectiveOldPrice)}</span> : null}
        {quantity > 0 ? (
          <small className="product-subtotal">Subtotal: {formatCurrency(discountedPrice * quantity)}</small>
        ) : null}
      </div>
      <AddToOrderControl
        quantity={quantity}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onChange={onChange}
        onAdd={onAdd}
        compact
        disabled={product.currentStock <= 0}
      />
    </article>
  )
}

function CatalogToolbar({
  categories,
  brands,
  activeCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  brand,
  onBrandChange,
  viewMode,
  onViewModeChange,
  onOpenQuickOrder,
}) {
  return (
    <div className="catalog-toolbar">
      <label className="client-search catalog-search">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <label className="brand-filter">
        <select value={activeCategory} onChange={(event) => onCategoryChange(event.target.value)}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === 'Todos' ? 'Productos' : category}
            </option>
          ))}
        </select>
      </label>

      <label className="brand-filter">
        <select value={brand} onChange={(event) => onBrandChange(event.target.value)}>
          {brands.map((option) => (
            <option key={option} value={option}>
              {option === 'Todas' ? 'Marcas' : option}
            </option>
          ))}
        </select>
      </label>

      <ViewSwitcher viewMode={viewMode} onChange={onViewModeChange} />
      <button
        type="button"
        className="repeat-order-btn quick-order-full-btn"
        onClick={onOpenQuickOrder}
        aria-label="Pedido rapido"
        title="Pedido rapido"
      >
        Pedido rapido
      </button>
    </div>
  )
}

function QuickOrderModal({ draft, summary, onDraftChange, onClose, onApply }) {
  return (
    <div className="client-modal-backdrop" role="presentation">
      <div className="client-modal-card quick-order-modal">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Pedido rapido</span>
            <h2>Cargar varios productos</h2>
            <p className="checkout-subtitle">
              Pega una lista con formato <strong>SKU,cantidad</strong> o <strong>SKU TAB cantidad</strong>, una linea por producto.
            </p>
          </div>
        </div>

        <div className="client-form-field">
          <span>Listado</span>
          <textarea
            className="quick-order-textarea"
            rows="10"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={'ALB-LTX-INT-20,24\nSIN-LTX-EXT-20,12\n20600,48'}
          />
        </div>

        <div className="quick-order-help">
          <span>{summary.validCount} lineas validas</span>
          {summary.invalidCount > 0 ? (
            <strong>{summary.invalidCount} con error</strong>
          ) : (
            <strong>Sin errores</strong>
          )}
        </div>

        {summary.errors.length > 0 ? (
          <div className="quick-order-errors">
            {summary.errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        ) : null}

        <div className="client-modal-actions">
          <button type="button" className="client-modal-btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="client-modal-btn primary" onClick={onApply}>
            Cargar al pedido
          </button>
        </div>
      </div>
    </div>
  )
}
function OrderSummaryCard({ items, products, tierName, settings, onRepeatLastOrder, onCheckout }) {
  const orderRows = buildOrderRows(items, products, tierName, settings)
  const orderTotal = orderRows.reduce((sum, item) => sum + item.totalValue, 0)
  const estimatedPoints = Math.floor(orderTotal / 1000)

  return (
    <article className="client-panel-card order-summary-card">
      <div className="client-card-header">
        <div>
          <span className="client-card-eyebrow">Pedido</span>
          <h2>Tu pedido actual</h2>
        </div>
        {settings.clientPanel?.enableRepeatLastOrder ? (
          <button type="button" className="mini-link-btn" onClick={onRepeatLastOrder}>
            Repetir ultimo pedido
          </button>
        ) : null}
      </div>

      <div className="order-summary-list">
        {orderRows.length === 0 ? (
          <span className="client-card-meta">Todavia no agregaste productos al pedido.</span>
        ) : null}

        {orderRows.map((item) => (
          <div key={item.productId} className="order-item">
            <div>
              <strong>
                {item.name} x{item.qty}
              </strong>
              <span>{item.unitPrice} c/u</span>
            </div>
            <strong>{formatCurrency(item.totalValue)}</strong>
          </div>
        ))}
      </div>

      <div className="order-summary-total">
        <div>
          <span>Total del pedido</span>
          <p>+{estimatedPoints} puntos al confirmar</p>
        </div>
        <strong>{formatCurrency(orderTotal)}</strong>
      </div>

      <div className="order-summary-action">
        <button type="button" className="client-secondary-wide" onClick={onCheckout}>
          Finalizar compra / Ver pedido
        </button>
      </div>
    </article>
  )
}

function ProductCatalog({
  products,
  categories,
  brands,
  activeCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  brand,
  onBrandChange,
  viewMode,
  onViewModeChange,
  visibleProducts,
  totalProducts,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  productQuantities,
  orderItems,
  tierName,
  settings,
  onQuantityChange,
  onAddToOrder,
  onRepeatLastOrder,
  onOpenQuickOrder,
  onCheckout,
  canCheckout,
}) {
  const orderRows = buildOrderRows(orderItems, products, tierName, settings)
  const orderSubtotal = orderRows.reduce((sum, item) => sum + item.totalValue, 0)
  const orderUnits = orderItems.reduce((sum, item) => sum + item.qty, 0)

  return (
    <article className="client-panel-card product-catalog-card">
      <CatalogToolbar
        categories={categories}
        brands={brands}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        brand={brand}
        onBrandChange={onBrandChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onOpenQuickOrder={settings.clientPanel?.enableQuickOrder !== false ? onOpenQuickOrder : undefined}
      />

      <div className="product-catalog-scroll">
        {viewMode === 'grid' ? (
          <div className="product-grid featured">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                tierName={tierName}
                settings={settings}
                quantity={productQuantities[product.id] ?? 0}
                onDecrease={() => onQuantityChange(product.id, -1)}
                onIncrease={() => onQuantityChange(product.id, 1)}
                onChange={(value) => onQuantityChange(product.id, value, true)}
                onAdd={() => onAddToOrder(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="product-list">
            {visibleProducts.map((product) => (
              <ProductListRow
                key={product.id}
                product={product}
                tierName={tierName}
                settings={settings}
                quantity={productQuantities[product.id] ?? 0}
                onDecrease={() => onQuantityChange(product.id, -1)}
                onIncrease={() => onQuantityChange(product.id, 1)}
                onChange={(value) => onQuantityChange(product.id, value, true)}
                onAdd={() => onAddToOrder(product.id)}
              />
            ))}
          </div>
        )}
      </div>

      {totalProducts > CLIENT_PRODUCT_PAGE_SIZE ? (
        <div className="client-catalog-pagination">
          <button
            type="button"
            className="repeat-order-btn client-pagination-arrow"
            disabled={page <= 1}
            onClick={onPrevPage}
            aria-label="Pagina anterior"
            title="Pagina anterior"
          >
            ←
          </button>
          <span className="client-pagination-meta">
            <strong>{page}</strong>
            <small>de {totalPages}</small>
          </span>
          <button
            type="button"
            className="repeat-order-btn client-pagination-arrow"
            disabled={page >= totalPages}
            onClick={onNextPage}
            aria-label="Pagina siguiente"
            title="Pagina siguiente"
          >
            →
          </button>
        </div>
      ) : null}

      <div className="batch-action-bar">
        <div className="catalog-sticky-summary">
          <div>
            <span>Pedido actual</span>
            <strong>
              {orderItems.length} productos · {orderUnits} unidades
            </strong>
            <small>
              Carga las cantidades y usa el boton + de cada producto para sumarlo al pedido.
            </small>
          </div>
          <strong className="catalog-sticky-total">{formatCurrency(orderSubtotal)}</strong>
        </div>
        <button
          type="button"
          className="client-secondary-wide batch-secondary-btn"
          onClick={onCheckout}
          disabled={!canCheckout}
        >
          Ver pedido y continuar
        </button>
      </div>
    </article>
  )
}

function HomeSection({
  client,
  clientOrders,
  products,
  loyaltyStatus,
  tierBenefitSummary,
  settings,
  latestOrder,
  orderItems,
  onGoToOrderPage,
  onGoToCheckout,
  onRepeatLastOrder,
}) {
  const latestOrderState = latestOrder
    ? getLatestOrderStatusMeta(latestOrder.status)
    : getLatestOrderStatusMeta()
  const latestOrderUpdate =
    latestOrder?.history?.[0]?.createdAt ?? latestOrder?.dispatchedAt ?? latestOrder?.createdAt ?? null
  const featuredOffers = products.filter((product) => product.badge || product.oldPrice)
  const promoProducts = featuredOffers.length > 0 ? featuredOffers : products.slice(0, 3)
  const orderTrackerSteps = [
    {
      key: 'received',
      label: 'Recibido',
      isActive: Boolean(latestOrder),
    },
    {
      key: 'approved',
      label: 'Confirmado',
      isActive: ['Aprobado', 'Preparando', 'Despachado'].includes(latestOrder?.status),
    },
    {
      key: 'preparing',
      label: 'Preparando',
      isActive: ['Preparando', 'Despachado'].includes(latestOrder?.status),
    },
    {
      key: 'dispatched',
      label: latestOrder?.deliveryType === 'Retiro en sucursal' ? 'Listo' : 'Despachado',
      isActive: latestOrder?.status === 'Despachado',
    },
  ]
  const unlockedCategoryBenefits = tierBenefitSummary.categoryDiscounts
    .filter((item) => Number(item.percent) > 0)
    .slice(0, 3)
  const shippingBenefit =
    tierBenefitSummary.shippingMode === 'free'
      ? { value: '100%', label: 'Envio gratis' }
      : tierBenefitSummary.shippingMode === 'discounted' &&
          Number(tierBenefitSummary.shippingDiscountPercent) > 0
        ? {
            value: `${tierBenefitSummary.shippingDiscountPercent}%`,
            label: 'Envio con descuento',
          }
        : null
  const hasUnlockedBenefits = unlockedCategoryBenefits.length > 0 || Boolean(shippingBenefit)
  const frequentProducts = useMemo(() => {
    const productUsage = new Map()

    clientOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const current = productUsage.get(item.productId) ?? {
          qty: 0,
          orders: 0,
        }

        productUsage.set(item.productId, {
          qty: current.qty + (Number(item.qty) || 0),
          orders: current.orders + 1,
        })
      })
    })

    return Array.from(productUsage.entries())
      .map(([productId, usage]) => {
        const product = products.find((entry) => entry.id === productId)

        if (!product) {
          return null
        }

        return {
          product,
          qty: usage.qty,
          orders: usage.orders,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.qty - a.qty || b.orders - a.orders)
      .slice(0, 3)
  }, [clientOrders, products])

  return (
    <section className="client-home-layout">
      <div className="client-home-main">
        <article className="client-panel-card promo-hero-card">
          <div className="promo-hero-copy">
            <span className="client-card-eyebrow">Novedades</span>
            <h2>{settings.branding?.clientHomeTitle || 'Promociones y oportunidades de la semana'}</h2>
            <p>Ofertas activas y productos destacados para que entres directo a la compra.</p>
          </div>

          <div className="promo-grid">
            {promoProducts.map((product) => (
              <article key={product.id} className="promo-card">
                <div className={`product-card-visual ${product.accent}`}>
                  {product.badge ? <span className="product-badge">{product.badge}</span> : null}
                  <span className={`product-category-chip ${normalizeCategoryTone(product.category)}`}>
                    {getCategoryMonogram(product)}
                  </span>
                </div>
                <div className="promo-card-body">
                  <strong>{product.name}</strong>
                  <span>
                      {product.detail} · {product.brand}
                  </span>
                  <div className="product-price-block">
                    {(() => {
                      const discountedPrice = getDiscountedProductPrice(
                        product,
                        loyaltyStatus.currentTier.name,
                        settings,
                      )
                      const oldPriceCandidate =
                        discountedPrice !== product.price ? Number(product.price) : Number(product.oldPrice)
                      const effectiveOldPrice =
                        Number.isFinite(oldPriceCandidate) && oldPriceCandidate > discountedPrice
                          ? oldPriceCandidate
                          : null

                      return (
                        <>
                          <strong>{formatCurrency(discountedPrice)}</strong>
                          {effectiveOldPrice ? <span>{formatCurrency(effectiveOldPrice)}</span> : null}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="promo-actions promo-actions-bottom">
            <button type="button" className="client-primary-wide promo-action-btn promo-action-btn--brand" onClick={onGoToOrderPage}>
              Ir a armar pedido
            </button>
          </div>
        </article>

        {frequentProducts.length > 0 ? (
          <article className="client-panel-card frequent-products-card">
            <div className="client-card-header">
              <div>
                <span className="client-card-eyebrow">Recompra</span>
                <h2>Productos que soles pedir</h2>
              </div>
            </div>

            <div className="frequent-products-list">
              {frequentProducts.map(({ product, qty, orders }) => (
                <article key={product.id} className="frequent-product-row">
                  <span className={`product-category-chip small ${normalizeCategoryTone(product.category)}`}>
                    {getCategoryMonogram(product)}
                  </span>
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      SKU {product.sku} · {product.brand}
                    </span>
                  </div>
                  <div className="frequent-product-meta">
                    <strong>{qty.toLocaleString('es-AR')} u.</strong>
                    <span>{orders} pedidos</span>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {settings.clientPanel?.showCurrentOrderCard ? (
        <article className="client-panel-card">
          <div className="client-card-header">
            <div>
              <span className="client-card-eyebrow">Seguimiento</span>
              <h2>Tu ultimo pedido</h2>
            </div>
          </div>

          <div className="order-tracking-card">
            <div className="order-tracking-head">
              <div>
                <strong>{latestOrder ? `Pedido ${latestOrder.id}` : 'Sin pedidos recientes'}</strong>
                <span>
                  {latestOrder
                    ? `${latestOrder.deliveryType} · ${latestOrder.branch}`
                    : 'Todavia no registramos movimientos en tu cuenta.'}
                </span>
              </div>
              <span className={`order-status-pill ${latestOrderState.tone}`}>
                {latestOrderState.pill}
              </span>
            </div>

            <div className="home-order-progress">
              {orderTrackerSteps.map((step, index) => (
                <div
                  key={step.key}
                  className={step.isActive ? 'home-order-progress-step active' : 'home-order-progress-step'}
                >
                  <span className="home-order-progress-dot">{index + 1}</span>
                  <strong>{step.label}</strong>
                  {index !== orderTrackerSteps.length - 1 ? (
                    <span className="home-order-progress-line" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="tracking-status-card tracking-status-card--strong">
              <strong>{latestOrderState.title}</strong>
              <span>{latestOrderState.detail}</span>
              <small>
                {latestOrderUpdate ? `Ultima actualizacion: ${formatDate(latestOrderUpdate)}` : 'Sin actualizaciones'}
              </small>
            </div>

            <div className="order-tracking-footer">
              <span>
                {latestOrder
                  ? `Total del pedido: ${formatCurrency(latestOrder.total)}`
                  : 'Cuando confirmes una compra vas a ver el seguimiento aca.'}
              </span>
              <button type="button" className="repeat-order-btn" onClick={onGoToOrderPage}>
                Ver pedido
              </button>
            </div>
          </div>
        </article>
        ) : null}
      </div>

      <aside className="client-home-sidebar">
        {settings.clientPanel?.showBenefitsCard ? (
        <article className="client-panel-card discount-card">
          <div className="client-card-header">
            <div>
              <span className="client-card-eyebrow">Beneficios</span>
              <h2>Tus descuentos activos</h2>
              <p className="discount-subtitle">
                Beneficios habilitados por tu nivel {loyaltyStatus.currentTier.name}
              </p>
            </div>
          </div>

          {hasUnlockedBenefits ? (
            <div className="discount-grid">
              {unlockedCategoryBenefits.map((item) => (
                <div key={item.category} className="discount-item">
                  <strong>{item.percent}%</strong>
                  <span>{item.category}</span>
                </div>
              ))}
              {shippingBenefit ? (
                <div className="discount-item">
                  <strong>{shippingBenefit.value}</strong>
                  <span>{shippingBenefit.label}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="discount-empty-state">
              <strong>Subi de nivel para desbloquear descuentos</strong>
              <span>
                {loyaltyStatus.nextTier
                  ? `Te faltan ${loyaltyStatus.pointsToNext.toLocaleString('es-AR')} pts para ${loyaltyStatus.nextTier.name}.`
                  : 'Ya alcanzaste el nivel mas alto del programa.'}
              </span>
              <div className="discount-empty-progress">
                <span style={{ width: `${loyaltyStatus.progress}%` }}></span>
              </div>
            </div>
          )}
        </article>
        ) : null}

        <OrderSummaryCard
          items={orderItems}
          products={products}
          tierName={loyaltyStatus.currentTier.name}
          settings={settings}
          onRepeatLastOrder={onRepeatLastOrder}
          onCheckout={onGoToCheckout}
        />
      </aside>
    </section>
  )
}

function OrderPage(props) {
  return (
    <section className="client-section-stack order-page-section">
      <ProductCatalog {...props} />
    </section>
  )
}

function CheckoutPage({
  client,
  products,
  settings,
  orderItems,
  onBackToOrder,
  onConfirmOrder,
}) {
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [billingName, setBillingName] = useState(client.businessName || client.name)
  const [taxId, setTaxId] = useState(client.taxId || '')
  const [notes, setNotes] = useState('Avisar cuando quede listo para retirar por sucursal.')
  const orderRows = buildOrderRows(orderItems, products, client.tier, settings)
  const subtotal = orderRows.reduce((sum, item) => sum + item.totalValue, 0)
  const shippingCost =
    deliveryMethod === 'shipping' ? calculateShippingCost(6500, client.tier, settings) : 0
  const total = subtotal + shippingCost
  const pointsToEarn = calculatePointsFromTotal(total)

  return (
    <section className="client-checkout-page">
      <header className="client-checkout-header">
        <span className="client-checkout-brand">Finalizar compra</span>
        <button type="button" className="client-checkout-back-btn" onClick={onBackToOrder}>
          ← Volver al pedido
        </button>
      </header>

      <section className="client-checkout-layout">
        <article className="client-panel-card checkout-main-card">
          <div className="client-card-header checkout-header">
            <div>
              <span className="client-card-eyebrow">Checkout</span>
              <h2>Finalizar compra</h2>
              <p className="checkout-subtitle">
                Revisa entrega, pago y datos de facturacion antes de confirmar.
              </p>
            </div>
          </div>

          <div className="checkout-stepper" aria-label="Pasos del checkout">
            <div className="checkout-step active">
              <span>1</span>
              <strong>Entrega</strong>
            </div>
            <div className="checkout-step-line" />
            <div className="checkout-step active">
              <span>2</span>
              <strong>Pago</strong>
            </div>
            <div className="checkout-step-line" />
            <div className="checkout-step active current">
              <span>3</span>
              <strong>Revision final</strong>
            </div>
          </div>

          <div className="checkout-section">
            <h3>1. Forma de entrega</h3>
            <div className="checkout-option-grid">
              {deliveryOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={
                    deliveryMethod === option.id
                      ? 'checkout-option-card active'
                      : 'checkout-option-card'
                  }
                  onClick={() => setDeliveryMethod(option.id)}
                >
                  <span className="checkout-option-check" aria-hidden="true">
                    {deliveryMethod === option.id ? '✓' : ''}
                  </span>
                  <strong>{option.title}</strong>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="checkout-section">
            <h3>2. Forma de pago</h3>
            <div className="checkout-option-grid">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={
                    paymentMethod === method.id
                      ? 'checkout-option-card active'
                      : 'checkout-option-card'
                  }
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <span className="checkout-option-check" aria-hidden="true">
                    {paymentMethod === method.id ? '✓' : ''}
                  </span>
                  <strong>{method.title}</strong>
                  <span>{method.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="checkout-section">
            <h3>3. Facturacion y observaciones</h3>
            <div className="checkout-form-grid">
              <label className="checkout-field">
                <span>Razon social / Nombre</span>
                <input
                  type="text"
                  value={billingName}
                  onChange={(event) => setBillingName(event.target.value)}
                />
              </label>
              <label className="checkout-field">
                <span>CUIT / DNI</span>
                <input
                  type="text"
                  value={taxId}
                  onChange={(event) => setTaxId(event.target.value)}
                />
              </label>
              <label className="checkout-field checkout-field-full">
                <span>Observaciones del pedido</span>
                <textarea
                  rows="4"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
          </div>
        </article>

        <aside className="checkout-summary-side">
          <article className="client-panel-card checkout-summary-card">
            <div className="client-card-header">
              <div>
                <span className="client-card-eyebrow">Resumen final</span>
                <h2>Tu compra</h2>
              </div>
            </div>

            <div className="order-summary-list">
              {orderRows.map((item) => (
                <div key={item.productId} className="order-item">
                  <div>
                    <strong>
                      {item.name} x{item.qty}
                    </strong>
                    <span>{item.unitPrice} c/u</span>
                  </div>
                  <strong>{formatCurrency(item.totalValue)}</strong>
                </div>
              ))}
            </div>

            <div className="checkout-total-block">
              <div className="checkout-total-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="checkout-total-row">
                <span>Entrega</span>
                <strong>
                  {shippingCost === 0 ? 'A convenir en sucursal' : formatCurrency(shippingCost)}
                </strong>
              </div>
              <div className="checkout-total-row">
                <span>IVA</span>
                <strong>Incluido en los precios</strong>
              </div>
              <div className="checkout-total-row final">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>

            <div className="checkout-points-earned">
              <span>★ Vas a ganar {pointsToEarn.toLocaleString('es-AR')} puntos con este pedido</span>
            </div>

            <button
              type="button"
              className="client-primary-wide checkout-confirm-btn"
              onClick={() =>
                onConfirmOrder({
                  deliveryType: deliveryMethod,
                  paymentMethod,
                  branch: client.preferredBranch,
                  billingName,
                  taxId,
                  notes,
                  shippingCost,
                })
              }
            >
              Confirmar compra
            </button>
          </article>
        </aside>
      </section>
    </section>
  )
}

function AccountEditModal({ formValues, onChange, onClose, onSave, isSaving, saveError }) {
  return (
    <div className="client-modal-backdrop" role="presentation">
      <div className="client-modal-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Mi cuenta</span>
            <h2>Actualizar datos</h2>
          </div>
        </div>

        <div className="client-account-form-grid">
          <label className="client-form-field">
            <span>Nombre / razon social</span>
            <input
              type="text"
              value={formValues.businessName}
              onChange={(event) => onChange('businessName', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>Email</span>
            <input
              type="email"
              value={formValues.email}
              disabled
              readOnly
            />
          </label>
          <label className="client-form-field">
            <span>Telefono</span>
            <input
              type="text"
              value={formValues.phone}
              onChange={(event) => onChange('phone', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>Telefono alternativo</span>
            <input
              type="text"
              value={formValues.altPhone}
              onChange={(event) => onChange('altPhone', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>CUIT / DNI</span>
            <input
              type="text"
              value={formValues.taxId}
              onChange={(event) => onChange('taxId', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>Categoria</span>
            <select
              value={formValues.category}
              onChange={(event) => onChange('category', event.target.value)}
            >
              <option value="Ferreteria">Ferreteria</option>
              <option value="Pintureria">Pintureria</option>
              <option value="Constructora">Constructora</option>
              <option value="Particular">Particular</option>
            </select>
          </label>
          <label className="client-form-field">
            <span>Sucursal habitual</span>
            <input
              type="text"
              value={formValues.preferredBranch}
              onChange={(event) => onChange('preferredBranch', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>Direccion</span>
            <input
              type="text"
              value={formValues.address}
              onChange={(event) => onChange('address', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>Ciudad</span>
            <input
              type="text"
              value={formValues.city}
              onChange={(event) => onChange('city', event.target.value)}
            />
          </label>
          <label className="client-form-field">
            <span>Provincia</span>
            <input
              type="text"
              value={formValues.province}
              onChange={(event) => onChange('province', event.target.value)}
            />
          </label>
        </div>

        {saveError ? <p className="form-error">{saveError}</p> : null}

        <div className="client-modal-actions">
          <button type="button" className="client-modal-btn secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="client-modal-btn primary" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientChatCard({
  chat,
  onSend,
  onTypingChange,
  unreadCount,
  typingLabel,
  orderOptions,
  selectedOrderId,
  onSelectedOrderChange,
  onOpenOrderReference,
}) {
  const threadRef = useRef(null)
  const textareaRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)

  useEffect(() => {
    const element = threadRef.current

    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [chat.messages.length, typingLabel])

  useEffect(() => {
    const element = threadRef.current

    if (!element) {
      return
    }

    const handleScroll = () => {
      const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight
      setShowJumpToLatest(distanceToBottom > 120)
    }

    handleScroll()
    element.addEventListener('scroll', handleScroll)

    return () => {
      element.removeEventListener('scroll', handleScroll)
    }
  }, [chat.messages.length])

  useEffect(() => {
    const element = textareaRef.current

    if (!element) {
      return
    }

    element.style.height = '0px'
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`
  }, [draft])

  useEffect(() => {
    const isTyping = draft.trim().length > 0

    if (isTyping) {
      onTypingChange(true)
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      onTypingChange(false)
    }, 2200)

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [draft])

  const selectedOrder = orderOptions.find((order) => order.id === selectedOrderId) ?? null

  return (
    <article className="client-panel-card account-span-two client-chat-card">
      <div className="client-card-header">
        <div>
          <span className="client-card-eyebrow">Soporte</span>
          <h2>Chat con administracion</h2>
        </div>
        {unreadCount > 0 ? (
          <span className="client-chat-badge">
            {unreadCount} nuevo{unreadCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="client-chat-statusbar">
        <div className="client-chat-identity">
          <strong>Administración — Nexoft</strong>
          <span className="client-chat-presence">
            <span className="client-chat-presence-dot"></span>
            En linea
          </span>
        </div>
      </div>

      <div ref={threadRef} className="client-chat-thread">
        <div className="client-chat-thread-inner">
          {chat.messages.length > 0 ? (
            chat.messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.senderRole === 'admin'
                    ? 'client-chat-message admin'
                    : 'client-chat-message client'
                }
              >
                <strong>{message.senderName}</strong>
                <p>{message.text}</p>
                {message.orderReference ? (
                  <ChatOrderReference
                    reference={message.orderReference}
                    onOpen={() => onOpenOrderReference(message.orderReference.orderId)}
                  />
                ) : null}
                <small>{formatDateTime(message.createdAt)}</small>
              </div>
            ))
          ) : (
            <div className="client-chat-empty">
              Abriste el canal general con administracion. Podes escribir tu consulta cuando quieras.
            </div>
          )}
          {typingLabel ? <div className="client-chat-typing">{typingLabel}</div> : null}
        </div>
        {showJumpToLatest ? (
          <button
            type="button"
            className="client-chat-jump-btn"
            aria-label="Ir al ultimo mensaje"
            title="Ir al ultimo mensaje"
            onClick={() => {
              const element = threadRef.current

              if (!element) {
                return
              }

              element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
            }}
          >
            ↓
          </button>
        ) : null}
      </div>

      <div className="client-chat-composer">
        {orderOptions.length > 0 ? (
          <div className="client-chat-tools">
            <button
              type="button"
              className={isOrderPickerOpen ? 'client-chat-attach-btn active' : 'client-chat-attach-btn'}
              onClick={() => setIsOrderPickerOpen((current) => !current)}
            >
              Adjuntar pedido
            </button>

            {selectedOrder ? (
              <button
                type="button"
                className="client-chat-selected-order"
                onClick={() => onOpenOrderReference(selectedOrder.id)}
              >
                {selectedOrder.id} · {formatCurrency(selectedOrder.total)}
              </button>
            ) : null}
          </div>
        ) : null}

        {isOrderPickerOpen && orderOptions.length > 0 ? (
          <div className="client-chat-order-picker">
            {orderOptions.slice(0, 6).map((order) => (
              <button
                key={order.id}
                type="button"
                className={selectedOrderId === order.id ? 'client-chat-order-option active' : 'client-chat-order-option'}
                onClick={() => {
                  onSelectedOrderChange(selectedOrderId === order.id ? '' : order.id)
                  setIsOrderPickerOpen(false)
                }}
              >
                <strong>{order.id}</strong>
                <span>{order.status}</span>
                <small>{formatCurrency(order.total)}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="client-chat-composer-row">
          <textarea
            ref={textareaRef}
            rows="1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSend(draft)
                setDraft('')
              }
            }}
            placeholder="Escribi tu mensaje para administracion..."
          />
          <button
            type="button"
            className="client-chat-send-inline"
            onClick={() => {
              onSend(draft)
              setDraft('')
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </article>
  )
}

function AccountPage({
  session,
  client,
  loyaltyStatus,
  tierBenefitSummary,
  latestOrder,
  clientOrders,
  previousOrders,
  orderItems,
}) {
  const hasActiveOrder = Boolean(latestOrder)
  const activeOrderStatus = latestOrder?.status ?? (orderItems.length > 0 ? 'Pendiente' : 'Sin pedido')
  const accountMessage = loyaltyStatus.nextTier
    ? `Tu nivel actual: ${loyaltyStatus.currentTier.name} - Te faltan ${loyaltyStatus.pointsToNext.toLocaleString(
        'es-AR',
      )} pts para alcanzar el nivel ${loyaltyStatus.nextTier.name}.`
    : 'Tu nivel actual: Estratégico - Alcanzaste el nivel premium maximo.'
  const activeBenefits = [
    ...(tierBenefitSummary.shippingMode === 'free'
      ? ['Envio gratis']
      : tierBenefitSummary.shippingMode === 'discounted'
        ? [`Envio con ${tierBenefitSummary.shippingDiscountPercent}% off`]
        : []),
    ...tierBenefitSummary.categoryDiscounts
      .filter((benefit) => benefit.percent > 0)
      .map((benefit) => `${benefit.category} ${benefit.percent}%`),
  ].slice(0, 6)
  const monthlyOrders = clientOrders.filter((order) => {
    const orderDate = new Date(order.createdAt)
    const now = new Date()
    return (
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    )
  })
  const monthlySpend = monthlyOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const monthlyPoints = monthlyOrders.reduce(
    (sum, order) => sum + calculatePointsFromTotal(Number(order.total) || 0),
    0,
  )
  const orderTrackerSteps = [
    {
      key: 'received',
      label: 'Pedido recibido',
      icon: '01',
      isActive: hasActiveOrder,
    },
    {
      key: 'approved',
      label: 'Confirmado',
      icon: '02',
      isActive: ['Aprobado', 'Preparando', 'Despachado'].includes(activeOrderStatus),
    },
    {
      key: 'preparing',
      label: 'En preparacion',
      icon: '03',
      isActive: ['Preparando', 'Despachado'].includes(activeOrderStatus),
    },
    {
      key: 'dispatched',
      label: latestOrder?.deliveryType === 'Retiro en sucursal' ? 'Listo para retirar' : 'Despachado',
      icon: '04',
      isActive: activeOrderStatus === 'Despachado',
    },
  ]

  return (
    <section className="client-account-layout">
      <article className="client-panel-card account-span-two">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Pedido activo</span>
            <h2>Seguimiento de tu pedido</h2>
          </div>
        </div>

        {latestOrder ? (
          <div className="account-order-hero">
            <div className="account-order-hero-head">
              <div>
                <strong>{latestOrder.id}</strong>
                <span>
                  {latestOrder.deliveryType} · {latestOrder.branch || client.preferredBranch || 'A confirmar'}
                </span>
              </div>
              <span className={`order-status-pill ${getLatestOrderStatusMeta(latestOrder.status).tone}`}>
                {latestOrder.status}
              </span>
            </div>

            <div className="account-order-tracker" aria-label="Estado del pedido">
              {orderTrackerSteps.map((step, index) => (
                <div
                  key={step.key}
                  className={
                    step.isActive
                      ? 'account-order-tracker-step active'
                      : 'account-order-tracker-step'
                  }
                >
                  <span className="account-order-tracker-dot">{step.icon}</span>
                  <strong>{step.label}</strong>
                  {index !== orderTrackerSteps.length - 1 ? (
                    <span className="account-order-tracker-line" aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="account-order-summary-strip">
              <div>
                <span>Ultima actualizacion</span>
                <strong>
                  {latestOrder?.history?.[0]?.createdAt
                    ? formatDateTime(latestOrder.history[0].createdAt)
                    : formatDateTime(latestOrder.createdAt)}
                </strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(latestOrder.total)}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="client-chat-empty">
            No tenes un pedido activo en este momento.
          </div>
        )}
      </article>

      <article className="client-panel-card account-side-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Puntos</span>
            <h2>Estado del programa</h2>
          </div>
        </div>

        <div className={`points-hero-card ${loyaltyStatus.currentTier.theme}`}>
          <div className="points-hero-top">
            <div>
              <span className="points-hero-label">Puntos acumulados</span>
              <strong>{loyaltyStatus.points.toLocaleString('es-AR')}</strong>
            </div>
            <div className="points-pill">
              <span>Nivel actual</span>
              <strong>{loyaltyStatus.currentTier.name}</strong>
            </div>
          </div>

          <p className="points-hero-message">{accountMessage}</p>

          <div className="points-progress-block">
            <div className="points-progress-copy">
              <span>Progreso al siguiente nivel</span>
              <strong>
                {loyaltyStatus.nextTier
                  ? `${Math.round(loyaltyStatus.progress)}% hacia ${loyaltyStatus.nextTier.name}`
                  : 'Nivel maximo alcanzado'}
              </strong>
            </div>
            <div className="client-sidebar-level-progress points-progress-bar">
              <span style={{ width: `${loyaltyStatus.progress}%` }}></span>
            </div>
          </div>

          <div className="points-period-summary">
            <span>Este mes</span>
            <strong>
              {formatCurrency(monthlySpend)} · +{monthlyPoints.toLocaleString('es-AR')} puntos
            </strong>
          </div>

          <div className="points-expiration-box">
            <span>Proximo vencimiento</span>
            <strong>1.250 puntos el 30 Sep 2026</strong>
          </div>

          <div className="points-benefits-box">
            <span className="points-benefits-title">Beneficios activos</span>
            <div className="points-benefits-list">
              {activeBenefits.length > 0 ? (
                activeBenefits.map((benefit) => (
                  <span key={benefit} className="points-benefit-chip">
                    {benefit}
                  </span>
                ))
              ) : (
                <span className="points-benefit-chip muted">Sin beneficios adicionales</span>
              )}
            </div>
          </div>

          <div className="points-tier-track">
            {loyaltyStatus.tiers.map((tier) => {
              const isActive = tier.key === loyaltyStatus.currentTier.key
              const isUnlocked = loyaltyStatus.points >= tier.minPoints

              return (
                <div
                  key={tier.key}
                  className={
                    isActive
                      ? 'points-tier-step active'
                      : isUnlocked
                        ? 'points-tier-step unlocked'
                        : 'points-tier-step'
                  }
                >
                  <span>{tier.name}</span>
                  <strong>{tier.minPoints.toLocaleString('es-AR')} pts</strong>
                </div>
              )
            })}
          </div>
        </div>
      </article>

      <article className="client-panel-card account-side-card account-history-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Historial</span>
            <h2>Pedidos anteriores</h2>
          </div>
        </div>

        <div className="history-table">
          <div className="history-row history-row-head">
            <span>Pedido</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Puntos</span>
            <span>Total</span>
          </div>
          {previousOrders.map((order) => (
            <div key={order.code} className="history-row">
              <strong>{order.code}</strong>
              <span>{order.date}</span>
              <span>{order.status}</span>
              <span>{order.points}</span>
              <strong>{order.total}</strong>
            </div>
          ))}
        </div>
      </article>

      <ClientCuentaCorrienteCard session={session} />
      <ClientDireccionesCard session={session} />
    </section>
  )
}

// ─── Catálogo: navegación de productos sin compromiso de pedido ─────────────
function CatalogPage({ products, onAddToOrder, onGoToOrder }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category || 'General'))
    return ['Todos', ...Array.from(cats).sort()]
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQ = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      const matchesCat = category === 'Todos' || (p.category || 'General') === category
      return matchesQ && matchesCat
    })
  }, [products, search, category])

  return (
    <section className="client-section">
      <article className="client-panel-card">
        <div className="catalog-filters">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto, SKU o marca…"
            className="catalog-search"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="catalog-cat-select">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" className="client-cta-btn" onClick={onGoToOrder}>
            Ir al pedido →
          </button>
        </div>

        <p className="catalog-count">{filtered.length} productos</p>

        {filtered.length === 0 ? (
          <div className="client-empty-state">
            <p>Sin resultados</p>
            <small>Probá con otros términos de búsqueda.</small>
          </div>
        ) : (
          <div className="catalog-grid">
            {filtered.slice(0, 60).map((p) => (
              <article key={p.id} className="catalog-card">
                <div className="catalog-card-image">
                  <span>{(p.name || '?')[0].toUpperCase()}</span>
                </div>
                <div className="catalog-card-body">
                  <strong>{p.name}</strong>
                  <small>{p.brand || 'Marca'} · SKU {p.sku || '—'}</small>
                  <div className="catalog-card-footer">
                    <strong>{formatCurrency(p.price || 0)}</strong>
                    <button
                      type="button"
                      className="client-cta-btn small"
                      onClick={() => onAddToOrder(p.id)}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

// ─── Mis pedidos: historial con recompra rápida ─────────────────────────────
function OrderHistoryPage({ clientOrders, products, onRepeatOrder, onGoToOrder }) {
  const [statusFilter, setStatusFilter] = useState('todos')

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return clientOrders
    return clientOrders.filter((o) => o.status === statusFilter)
  }, [clientOrders, statusFilter])

  return (
    <section className="client-section">
      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Historial</span>
            <h2>{clientOrders.length} pedidos en total</h2>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="catalog-cat-select"
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Preparando">Preparando</option>
            <option value="Despachado">Despachado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="client-empty-state">
            <p>No tenés pedidos {statusFilter !== 'todos' ? `en estado "${statusFilter}"` : 'todavía'}</p>
            <button type="button" className="client-cta-btn" onClick={onGoToOrder}>
              Armar primer pedido
            </button>
          </div>
        ) : (
          <div className="client-orders-table">
            {filtered.map((o) => {
              const itemCount = (o.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0)
              return (
                <div key={o.id} className="client-order-row">
                  <div>
                    <strong>Pedido {o.id}</strong>
                    <small>{o.createdAt ? formatDate(o.createdAt) : '—'} · {itemCount} unidades</small>
                  </div>
                  <span className={`client-pill ${
                    o.status === 'Despachado' ? 'success'
                    : o.status === 'Cancelado' ? 'danger'
                    : o.status === 'Pendiente' ? 'warning'
                    : 'info'
                  }`}>
                    {o.status}
                  </span>
                  <strong>{formatCurrency(o.total || 0)}</strong>
                  <button
                    type="button"
                    className="client-cta-btn small ghost"
                    onClick={() => onRepeatOrder(o.id)}
                  >
                    Repetir
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

// ─── Cotizaciones recibidas ─────────────────────────────────────────────────
function ClientCotizacionesPage({ session, products }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  // Solicitud form state
  const [showForm, setShowForm] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [solicitudItems, setSolicitudItems] = useState([]) // [{ productId, productName, sku, qty }]
  const [notas, setNotas] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  const loadCotizaciones = () => {
    const token = session?.token
    if (!token) return
    setLoading(true)
    fetch('/api/client/cotizaciones', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.ok) setCotizaciones(res.cotizaciones || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCotizaciones() }, [session])

  const handleAccept = async (id) => {
    if (!window.confirm('¿Aceptar esta cotización y convertirla en pedido?')) return
    const token = session?.token
    await fetch(`/api/admin/cotizaciones/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'aceptada' }),
    })
    setCotizaciones((prev) => prev.map((c) => c.id === id ? { ...c, estado: 'aceptada' } : c))
  }

  const handleReject = async (id) => {
    if (!window.confirm('¿Rechazar esta cotización?')) return
    const token = session?.token
    await fetch(`/api/admin/cotizaciones/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'rechazada' }),
    })
    setCotizaciones((prev) => prev.map((c) => c.id === id ? { ...c, estado: 'rechazada' } : c))
  }

  // Solicitud helpers
  const filteredProducts = useMemo(() => {
    if (!searchQ.trim()) return (products || []).slice(0, 12)
    const q = searchQ.toLowerCase()
    return (products || []).filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 12)
  }, [products, searchQ])

  const addProduct = (product) => {
    setSolicitudItems((prev) => {
      const exists = prev.find((i) => i.productId === product.id)
      if (exists) return prev.map((i) => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { productId: product.id, productName: product.name, sku: product.sku, qty: 1 }]
    })
  }

  const updateQty = (productId, qty) => {
    const n = parseInt(qty, 10)
    if (n <= 0) return setSolicitudItems((prev) => prev.filter((i) => i.productId !== productId))
    setSolicitudItems((prev) => prev.map((i) => i.productId === productId ? { ...i, qty: n } : i))
  }

  const handleSend = async () => {
    if (solicitudItems.length === 0) { setSendError('Agregá al menos un producto.'); return }
    setSending(true); setSendError('')
    try {
      const res = await fetch('/api/client/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.token}` },
        body: JSON.stringify({ items: solicitudItems, notas }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.message || 'Error al enviar')
      setSendSuccess(true)
      setSolicitudItems([])
      setNotas('')
      setSearchQ('')
      loadCotizaciones()
      setTimeout(() => { setSendSuccess(false); setShowForm(false) }, 3000)
    } catch (e) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  const recibidas = cotizaciones.filter((c) => c.estado === 'enviada' || c.estado === 'aceptada' || c.estado === 'rechazada' || c.estado === 'convertida' || c.estado === 'vencida')
  const enviadas = cotizaciones.filter((c) => c.estado === 'solicitada')

  return (
    <section className="client-section">
      {/* ── SOLICITAR COTIZACIÓN ─────────────────────────────────────── */}
      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Nueva solicitud</span>
            <h2>Pedir cotización</h2>
          </div>
          {!showForm && (
            <button type="button" className="client-cta-btn" onClick={() => setShowForm(true)}>
              + Nueva solicitud
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {sendSuccess ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', color: '#166534', fontWeight: 600 }}>
                ✓ Solicitud enviada. El equipo de ventas te va a responder con los precios a la brevedad.
              </div>
            ) : (
              <>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    Buscá los productos que querés cotizar y agregálos. Podés incluir una nota para el equipo de ventas.
                  </p>
                  <input
                    type="text"
                    className="client-search-input"
                    placeholder="Buscar producto por nombre o SKU…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    style={{ marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredProducts.map((p) => {
                      const inList = solicitudItems.find((i) => i.productId === p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          style={{
                            background: inList ? '#eff6ff' : '#f8fafc',
                            border: `1px solid ${inList ? '#93c5fd' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            padding: '0.6rem 0.75rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ color: '#94a3b8' }}>SKU {p.sku} · {p.category}</div>
                          {inList && <div style={{ color: '#1A1FBE', marginTop: '2px' }}>× {inList.qty} en lista ✓</div>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {solicitudItems.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
                      Productos seleccionados ({solicitudItems.length}):
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {solicitudItems.map((item) => (
                        <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                          <span style={{ flex: 1 }}>{item.productName}</span>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateQty(item.productId, e.target.value)}
                            style={{ width: '60px', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}
                          />
                          <button type="button" onClick={() => setSolicitudItems((p) => p.filter((i) => i.productId !== item.productId))} style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                    Nota para ventas (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Necesito entrega para fin de mes, consulto por volumen mayor..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                {sendError && <p style={{ color: '#e53e3e', fontSize: '0.85rem' }}>{sendError}</p>}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="client-cta-btn ghost small" onClick={() => { setShowForm(false); setSolicitudItems([]); setNotas('') }}>
                    Cancelar
                  </button>
                  <button type="button" className="client-cta-btn small" onClick={handleSend} disabled={sending || solicitudItems.length === 0}>
                    {sending ? 'Enviando…' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!showForm && (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Pedí precios para los productos que te interesan. El equipo de ventas te va a responder con una cotización detallada.
          </p>
        )}
      </article>

      {/* ── SOLICITUDES ENVIADAS (pendientes de respuesta) ───────────── */}
      {enviadas.length > 0 && (
        <article className="client-panel-card">
          <div className="client-card-header">
            <div>
              <span className="client-card-eyebrow">En revisión</span>
              <h2>Solicitudes enviadas</h2>
            </div>
          </div>
          <div className="client-orders-table">
            {enviadas.map((c) => {
              const items = Array.isArray(c.items) ? c.items : []
              return (
                <div key={c.id} className="client-cotizacion-card">
                  <div className="client-cotizacion-head">
                    <div>
                      <strong>{c.numero}</strong>
                      <small>Enviada el {c.creado_at?.slice(0, 10) || '—'}</small>
                    </div>
                    <span className="client-pill info">En revisión</span>
                  </div>
                  <div className="client-cotizacion-items">
                    {items.slice(0, 4).map((it, i) => (
                      <div key={i}><span>{it.productName} × {it.qty}</span></div>
                    ))}
                    {items.length > 4 && <small style={{ color: '#71717a' }}>+ {items.length - 4} productos más</small>}
                  </div>
                  {c.notas && <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>"{c.notas}"</p>}
                </div>
              )
            })}
          </div>
        </article>
      )}

      {/* ── COTIZACIONES RECIBIDAS ───────────────────────────────────── */}
      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Propuestas recibidas</span>
            <h2>Cotizaciones del equipo de ventas</h2>
          </div>
        </div>

        {loading ? (
          <p style={{ padding: '1rem', color: '#71717a' }}>Cargando…</p>
        ) : recibidas.length === 0 ? (
          <div className="client-empty-state">
            <p>Todavía no recibiste ninguna cotización</p>
            <small>Cuando el equipo de ventas responda tu solicitud, la verás acá con el precio detallado.</small>
          </div>
        ) : (
          <div className="client-orders-table">
            {recibidas.map((c) => {
              const items = Array.isArray(c.items) ? c.items : []
              const vencida = c.vencimiento && new Date(c.vencimiento) < new Date()
              return (
                <div key={c.id} className="client-cotizacion-card">
                  <div className="client-cotizacion-head">
                    <div>
                      <strong>{c.numero}</strong>
                      <small>
                        Vence: {c.vencimiento?.slice(0, 10) || '—'}
                        {vencida && c.estado === 'enviada' ? ' · VENCIDA' : ''}
                      </small>
                    </div>
                    <span className={`client-pill ${
                      c.estado === 'aceptada' || c.estado === 'convertida' ? 'success'
                      : c.estado === 'rechazada' || c.estado === 'vencida' ? 'danger'
                      : c.estado === 'enviada' ? 'info' : 'neutral'
                    }`}>
                      {c.estado === 'enviada' ? 'Pendiente tu respuesta'
                        : c.estado === 'aceptada' ? 'Aceptada'
                        : c.estado === 'rechazada' ? 'Rechazada'
                        : c.estado === 'convertida' ? 'Convertida en pedido'
                        : c.estado}
                    </span>
                  </div>
                  <div className="client-cotizacion-items">
                    {items.slice(0, 3).map((it, i) => (
                      <div key={i}>
                        <span>{it.productName} × {it.qty}</span>
                        <strong>{formatCurrency(it.subtotal || it.unitPrice * it.qty || 0)}</strong>
                      </div>
                    ))}
                    {items.length > 3 && <small style={{ color: '#71717a' }}>+ {items.length - 3} productos más</small>}
                  </div>
                  {c.notas && <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>Nota: "{c.notas}"</p>}
                  <div className="client-cotizacion-footer">
                    <div>
                      <small>Total</small>
                      <strong>{formatCurrency(c.total || 0)}</strong>
                    </div>
                    {c.estado === 'enviada' && !vencida ? (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="client-cta-btn ghost small" onClick={() => handleReject(c.id)}>
                          Rechazar
                        </button>
                        <button type="button" className="client-cta-btn small" onClick={() => handleAccept(c.id)}>
                          Aceptar
                        </button>
                      </div>
                    ) : null}
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

// ─── Cuenta corriente (página dedicada, reutiliza el card existente) ────────
function ClientCuentaCorrientePage({ session }) {
  return (
    <section className="client-section">
      <ClientCuentaCorrienteCard session={session} />
      <ClientDireccionesCard session={session} />
    </section>
  )
}

// ─── Beneficios y promociones para el tier actual ───────────────────────────
function BeneficiosPage({ loyaltyStatus, tierBenefitSummary, client }) {
  const [activePromos, setActivePromos] = useState([])
  const tierName = loyaltyStatus?.currentTier?.name

  useEffect(() => {
    if (!tierName) return
    try {
      const stored = JSON.parse(localStorage.getItem('nexo-promociones') || '[]')
      // Filter active and applicable to this client's tier or "todos"
      const today = new Date().toISOString().slice(0, 10)
      const applicable = stored.filter((p) =>
        p.activa &&
        (p.alcance === 'todos' || p.tier === tierName) &&
        (!p.fin || p.fin >= today),
      )
      setActivePromos(applicable)
    } catch { /* noop */ }
  }, [tierName])

  // categoryDiscounts is an array of { category, percent }
  const categoryDiscounts = Array.isArray(tierBenefitSummary?.categoryDiscounts)
    ? tierBenefitSummary.categoryDiscounts
    : []
  const shippingMode = tierBenefitSummary?.shippingMode || 'none'

  if (!loyaltyStatus?.currentTier) {
    return (
      <section className="client-section">
        <article className="client-panel-card">
          <p style={{ padding: '1rem', color: '#64748b' }}>Cargando beneficios…</p>
        </article>
      </section>
    )
  }

  return (
    <section className="client-section">
      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Tu nivel actual</span>
            <h2>
              <span className="client-tier-name">{loyaltyStatus.currentTier.name}</span> · {loyaltyStatus.points.toLocaleString('es-AR')} pts
            </h2>
          </div>
        </div>

        <div className="beneficios-progress">
          <div className="beneficios-progress-bar">
            <span style={{ width: `${loyaltyStatus.progress}%` }}></span>
          </div>
          <small>
            {loyaltyStatus.nextTier
              ? `Faltan ${loyaltyStatus.pointsToNext.toLocaleString('es-AR')} puntos para alcanzar ${loyaltyStatus.nextTier.name}`
              : 'Alcanzaste el nivel máximo'}
          </small>
        </div>
      </article>

      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Descuentos por categoría</span>
            <h2>Tus beneficios activos</h2>
          </div>
        </div>

        <div className="beneficios-grid">
          {categoryDiscounts.map(({ category, percent }) => (
            <div key={category} className={`beneficios-card ${percent > 0 ? 'active' : ''}`}>
              <strong>{percent}%</strong>
              <small>{category}</small>
            </div>
          ))}
          <div className={`beneficios-card ${shippingMode !== 'none' ? 'active' : ''}`}>
            <strong>
              {shippingMode === 'free' ? '100%' : shippingMode === 'discounted' ? `${tierBenefitSummary?.shippingDiscountPercent}%` : '—'}
            </strong>
            <small>Envío</small>
          </div>
        </div>
      </article>

      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Campañas</span>
            <h2>Promociones activas para vos</h2>
          </div>
        </div>

        {activePromos.length === 0 ? (
          <div className="client-empty-state">
            <p>No hay promociones activas en este momento</p>
            <small>Cuando lancemos campañas para tu nivel, las verás acá.</small>
          </div>
        ) : (
          <div className="promos-active-grid">
            {activePromos.map((p) => (
              <div key={p.id} className="promo-active-card">
                <strong>{p.nombre}</strong>
                <div className="promo-active-value">
                  {p.tipo === 'percent' && `${p.valor}% off`}
                  {p.tipo === 'fixed' && `${formatCurrency(p.valor)} off`}
                  {p.tipo === 'shipping' && 'Envío gratis'}
                </div>
                <small>
                  Vigencia: {p.inicio}{p.fin ? ` → ${p.fin}` : ' en adelante'}
                </small>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

function ClientCuentaCorrienteCard({ session }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadCC = () => {
    setLoading(true)
    const token = session?.token || null
    fetch('/api/client/cuenta-corriente', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setData(res)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCC()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <article className="client-panel-card account-span-two">
      <div className="client-card-header">
        <div>
          <span className="client-card-eyebrow">Finanzas</span>
          <h2>Cuenta corriente</h2>
        </div>
        <button type="button" className="client-cta-btn" onClick={loadCC} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {loading && !data ? <p style={{ padding: '1rem', color: '#64748b' }}>Cargando...</p> : null}

      {data ? (
        <div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="account-kpi-pill">
              <span>Saldo</span>
              <strong style={{ color: data.saldo > 0 ? '#e53e3e' : '#38a169' }}>
                {formatCurrency(Math.abs(data.saldo))} {data.saldo > 0 ? '(deuda)' : data.saldo < 0 ? '(a favor)' : ''}
              </strong>
            </div>
            <div className="account-kpi-pill">
              <span>Límite de crédito</span>
              <strong>{formatCurrency(data.creditLimit || 0)}</strong>
            </div>
            <div className="account-kpi-pill">
              <span>Crédito disponible</span>
              <strong>{formatCurrency(Math.max((data.creditLimit || 0) - (data.pendingBalance || 0), 0))}</strong>
            </div>
          </div>

          {data.movimientos.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Descripción</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.map((mov) => (
                    <tr key={mov.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem' }}>{formatDate(mov.fecha)}</td>
                      <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{mov.tipo}</td>
                      <td style={{ padding: '0.5rem', color: '#64748b' }}>{mov.descripcion || '—'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: parseFloat(mov.monto) < 0 ? '#38a169' : '#e53e3e' }}>
                        {parseFloat(mov.monto) < 0 ? '-' : '+'}{formatCurrency(Math.abs(parseFloat(mov.monto)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No hay movimientos registrados en la cuenta corriente.</p>
          )}
        </div>
      ) : null}
    </article>
  )
}

function ClientDireccionesCard({ session }) {
  const [direcciones, setDirecciones] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nombre: '', calle: '', ciudad: '', provincia: '', codigo_postal: '', predeterminada: false })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const token = session?.token || null

  const loadDirecciones = () => {
    if (loaded) return
    setLoading(true)
    fetch('/api/client/direcciones', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.ok) { setDirecciones(data.direcciones); setLoaded(true) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleSave = () => {
    if (!form.calle.trim()) return
    setSaving(true)
    fetch('/api/client/direcciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setDirecciones((prev) => form.predeterminada
            ? [data.direccion, ...prev.map((d) => ({ ...d, predeterminada: false }))]
            : [...prev, data.direccion])
          setForm({ nombre: '', calle: '', ciudad: '', provincia: '', codigo_postal: '', predeterminada: false })
          setShowForm(false)
        }
      })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  const handleDelete = (id) => {
    fetch(`/api/client/direcciones/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.ok) setDirecciones((prev) => prev.filter((d) => d.id !== id)) })
      .catch(() => {})
  }

  return (
    <article className="client-panel-card account-side-card">
      <div className="client-card-header">
        <div>
          <span className="client-card-eyebrow">Logística</span>
          <h2>Direcciones de entrega</h2>
        </div>
        <button type="button" className="client-cta-btn" onClick={() => { loadDirecciones(); setShowForm(!showForm) }}>
          {showForm ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      {!loaded && !loading ? (
        <button type="button" className="client-secondary-btn" onClick={loadDirecciones} style={{ marginBottom: '1rem' }}>
          Ver mis direcciones
        </button>
      ) : null}

      {loading ? <p style={{ padding: '0.5rem', color: '#64748b' }}>Cargando...</p> : null}

      {showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
          <input placeholder="Nombre de la dirección (ej: Depósito principal)" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          <input placeholder="Calle y número" value={form.calle} onChange={(e) => setForm((f) => ({ ...f, calle: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          <input placeholder="Ciudad" value={form.ciudad} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          <input placeholder="Provincia" value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.predeterminada} onChange={(e) => setForm((f) => ({ ...f, predeterminada: e.target.checked }))} />
            Marcar como predeterminada
          </label>
          <button type="button" className="client-cta-btn" onClick={handleSave} disabled={saving || !form.calle.trim()}>
            {saving ? 'Guardando...' : 'Guardar dirección'}
          </button>
        </div>
      ) : null}

      {loaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {direcciones.length > 0 ? direcciones.map((dir) => (
            <div key={dir.id} style={{ padding: '0.75rem', border: `1px solid ${dir.predeterminada ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', background: dir.predeterminada ? '#eff6ff' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {dir.predeterminada ? <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginBottom: '4px', display: 'inline-block' }}>Predeterminada</span> : null}
                  <p style={{ fontWeight: '600', margin: '0 0 2px' }}>{dir.nombre || 'Sin nombre'}</p>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>{dir.calle}{dir.ciudad ? `, ${dir.ciudad}` : ''}{dir.provincia ? `, ${dir.provincia}` : ''}</p>
                </div>
                <button type="button" onClick={() => handleDelete(dir.id)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.75rem' }}>
                  Eliminar
                </button>
              </div>
            </div>
          )) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No tenés direcciones de entrega guardadas.</p>
          )}
        </div>
      ) : null}
    </article>
  )
}

export function ClientDashboard() {
  const [activeTab, setActiveTab] = useState('inicio')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [brand, setBrand] = useState('Todas')
  const [viewMode, setViewMode] = useState('list')
  const [productPage, setProductPage] = useState(1)
  const [orderItems, setOrderItems] = useState([])
  const [productQuantities, setProductQuantities] = useState({})
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false)
  const [quickOrderDraft, setQuickOrderDraft] = useState('')
  const [isAccountEditOpen, setIsAccountEditOpen] = useState(false)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [accountSaveError, setAccountSaveError] = useState('')
  const [clientChatOrderReferenceId, setClientChatOrderReferenceId] = useState('')
  const [selectedChatOrderId, setSelectedChatOrderId] = useState(null)
  const { logout, session, updateProfile } = useAuth()
  const {
    clients,
    products,
    orders,
    settings,
    chats,
    createOrder,
    saveClient,
    openChat,
    sendChatMessage,
    setChatTyping,
  } = useAppData()
  const navigate = useNavigate()
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const fallbackClient = useMemo(
    () => ({
      id: session.id,
      name: session.name,
      businessName: session.profile?.business_name || session.name,
      email: session.email,
      phone: session.profile?.phone || '',
      altPhone: session.profile?.alt_phone || '',
      taxId: session.profile?.tax_id || '',
      category: 'Ferreteria',
      preferredBranch: session.profile?.preferred_branch || '',
      address: session.profile?.address || '',
      city: session.profile?.city || '',
      province: session.profile?.province || '',
      pendingBalance: 0,
      paymentHistory: [],
      activityLog: [],
      orderHistory: [],
      points: 0,
      lifetime_points: 0,
      available_points: 0,
      createdAt: new Date().toISOString(),
      tier: 'Bronce',
    }),
    [session],
  )
  const client = clients.find((entry) => entry.id === session.id) ?? fallbackClient
  const [accountForm, setAccountForm] = useState(() => ({
    businessName: client.businessName ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    altPhone: client.altPhone ?? '',
    taxId: client.taxId ?? '',
    category: client.category ?? 'Ferreteria',
    preferredBranch: client.preferredBranch ?? '',
    address: client.address ?? '',
    city: client.city ?? '',
    province: client.province ?? '',
  }))

  const clientOrders = useMemo(
    () =>
      orders
        .filter((order) => order.clientId === client.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders, client.id],
  )

  const latestOrder = clientOrders[0] ?? null
  const selectedChatOrder =
    clientOrders.find((order) => order.id === selectedChatOrderId) ?? null
  const clientChat = useMemo(
    () =>
      chats.find((entry) => entry.clientId === client.id) ?? {
        clientId: client.id,
        messages: [],
        adminLastSeenAt: null,
        clientLastSeenAt: null,
        lastClientActivityAt: null,
        lastAdminActivityAt: null,
        updatedAt: new Date().toISOString(),
      },
    [chats, client.id],
  )
  const unreadForClient = useMemo(
    () =>
      clientChat.messages.filter(
        (message) =>
          message.senderRole === 'admin' &&
          (!clientChat.clientLastSeenAt ||
            new Date(message.createdAt).getTime() >
              new Date(clientChat.clientLastSeenAt).getTime()),
      ).length,
    [clientChat],
  )
  const adminIsTyping = useMemo(() => {
    if (!clientChat.adminTypingAt) {
      return false
    }

    return Date.now() - new Date(clientChat.adminTypingAt).getTime() < 3000
  }, [clientChat.adminTypingAt])
  const loyaltyStatus = getLoyaltyStatus(getClientLifetimePoints(client), settings.tierThresholds)
  const tierBenefitSummary = getTierBenefitSummary(loyaltyStatus.currentTier.name, settings)
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => (tab.id === 'chat' ? settings.clientPanel?.enableChat : true)),
    [settings.clientPanel?.enableChat],
  )

  useEffect(() => {
    if (activeTab === 'chat') {
      openChat(client.id, 'client')
    }
  }, [activeTab, client.id])

  useEffect(() => {
    if (!settings.clientPanel?.enableChat && activeTab === 'chat') {
      setActiveTab('inicio')
    }
  }, [activeTab, settings.clientPanel?.enableChat])

  const categories = useMemo(
    () => ['Todos', ...new Set(products.map((product) => product.category))],
    [products],
  )
  const brands = useMemo(
    () => ['Todas', ...new Set(products.map((product) => product.brand))],
    [products],
  )

  const previousOrders = useMemo(
    () =>
      clientOrders.slice(1).map((order) => ({
        code: order.id,
        date: formatDate(order.createdAt),
        status: order.status,
        points: `+${calculatePointsFromTotal(order.total).toLocaleString('es-AR')} pts`,
        total: formatCurrency(order.total),
      })),
    [clientOrders],
  )
  const cartCount = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.qty, 0),
    [orderItems],
  )
  const quickOrderSummary = useMemo(() => {
    const lines = quickOrderDraft
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const productsBySku = new Map(
      products.map((product) => [String(product.sku ?? '').trim().toUpperCase(), product]),
    )
    const errors = []
    let validCount = 0

    lines.forEach((line, index) => {
      const parts = line.split(/[\t,; ]+/).filter(Boolean)
      const sku = String(parts[0] ?? '').trim().toUpperCase()
      const qty = Number(parts[1] ?? 0)

      if (!sku || !productsBySku.has(sku)) {
        errors.push(`Linea ${index + 1}: SKU no encontrado`)
        return
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        errors.push(`Linea ${index + 1}: cantidad invalida`)
        return
      }

      validCount += 1
    })

    return {
      validCount,
      invalidCount: errors.length,
      errors,
    }
  }, [products, quickOrderDraft])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleGoToCart = () => {
    if (canProceedToCheckout) {
      handleTabChange('checkout')
      return
    }

    handleTabChange('pedido')
  }

  const canProceedToCheckout = orderItems.length > 0

  const handleTabChange = (tabId) => {
    if (tabId === 'checkout' && !canProceedToCheckout) {
      return
    }

    startTransition(() => {
      setActiveTab(tabId)
    })
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'Todos' || product.category === activeCategory
      const matchesBrand = brand === 'Todas' || product.brand === brand
      const normalizedSearch = deferredSearchTerm.trim().toLowerCase()
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesBrand && matchesSearch
    })
  }, [activeCategory, brand, deferredSearchTerm, products])
  const productTotalPages = Math.max(
    Math.ceil(filteredProducts.length / CLIENT_PRODUCT_PAGE_SIZE),
    1,
  )
  const visibleProducts = useMemo(() => {
    const safePage = Math.min(productPage, productTotalPages)
    const startIndex = (safePage - 1) * CLIENT_PRODUCT_PAGE_SIZE

    return filteredProducts.slice(startIndex, startIndex + CLIENT_PRODUCT_PAGE_SIZE)
  }, [filteredProducts, productPage, productTotalPages])

  useEffect(() => {
    setProductPage(1)
  }, [activeCategory, brand, deferredSearchTerm, viewMode])

  useEffect(() => {
    setProductPage((current) => Math.min(current, productTotalPages))
  }, [productTotalPages])

  const handleQuantityChange = (productId, nextValueOrDelta, isDirectInput = false) => {
    setProductQuantities((current) => {
      const product = products.find((entry) => entry.id === productId)
      const currentValue = current[productId] ?? 0
      const maxStock = product?.currentStock ?? 0
      const parsedValue = isDirectInput
        ? Number.parseInt(String(nextValueOrDelta), 10)
        : currentValue + nextValueOrDelta
      const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0
      const nextValue = Math.max(0, Math.min(safeValue, maxStock))
      return { ...current, [productId]: nextValue }
    })
  }

  const handleAddToOrder = (productId) => {
    const qtyToAdd = productQuantities[productId] ?? 0
    if (qtyToAdd <= 0) return

    setOrderItems((current) => {
      const existing = current.find((item) => item.productId === productId)
      if (existing) {
        return current.map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + qtyToAdd } : item,
        )
      }
      return [...current, { productId, qty: qtyToAdd }]
    })

    setProductQuantities((current) => ({ ...current, [productId]: 0 }))
  }

  const handleRepeatLastOrder = () => {
    const presetItems = getLastOrderPreset(clientOrders)
    setOrderItems(presetItems)
    setProductQuantities(buildQuantityMap(presetItems))
  }

  const handleApplyQuickOrder = () => {
    const lines = quickOrderDraft
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      setIsQuickOrderOpen(false)
      return
    }

    const productsBySku = new Map(
      products.map((product) => [String(product.sku ?? '').trim().toUpperCase(), product]),
    )
    const nextItems = []

    lines.forEach((line) => {
      const parts = line.split(/[\t,; ]+/).filter(Boolean)
      const sku = String(parts[0] ?? '').trim().toUpperCase()
      const qty = Number(parts[1] ?? 0)
      const product = productsBySku.get(sku)

      if (!product || !Number.isFinite(qty) || qty <= 0) {
        return
      }

      nextItems.push({
        productId: product.id,
        qty: Math.max(0, Math.min(qty, Number(product.currentStock) || 0)),
      })
    })

    if (nextItems.length === 0) {
      return
    }

    setOrderItems((current) => {
      const merged = [...current]

      nextItems.forEach((nextItem) => {
        const existing = merged.find((item) => item.productId === nextItem.productId)
        if (existing) {
          existing.qty += nextItem.qty
        } else {
          merged.push(nextItem)
        }
      })

      return merged
    })

    setQuickOrderDraft('')
    setIsQuickOrderOpen(false)
  }

  const handleConfirmOrder = (checkoutData) => {
    if (orderItems.length === 0) return

    createOrder({
      clientId: client.id,
      items: orderItems,
      ...checkoutData,
    })

    setOrderItems([])
    setProductQuantities({})
    handleTabChange('historial')
  }

  const handleOpenAccountEdit = () => {
    setAccountSaveError('')
    setAccountForm({
      businessName: client.businessName ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      altPhone: client.altPhone ?? '',
      taxId: client.taxId ?? '',
      category: client.category ?? 'Ferreteria',
      preferredBranch: client.preferredBranch ?? '',
      address: client.address ?? '',
      city: client.city ?? '',
      province: client.province ?? '',
    })
    setIsAccountEditOpen(true)
  }

  const handleAccountFieldChange = (field, value) => {
    setAccountForm((current) => ({ ...current, [field]: value }))
  }

  const handleSaveAccount = async () => {
    setIsSavingAccount(true)
    setAccountSaveError('')

    try {
      const result = await updateProfile({
        name: accountForm.businessName,
        business_name: accountForm.businessName,
        phone: accountForm.phone,
        alt_phone: accountForm.altPhone,
        tax_id: accountForm.taxId,
        address: accountForm.address,
        city: accountForm.city,
        province: accountForm.province,
        preferred_branch: accountForm.preferredBranch,
        metadata_json: {
          category: accountForm.category,
        },
      })

      if (!result.ok) {
        setAccountSaveError(result.message)
        return
      }

      saveClient(
        {
          ...client,
          name: accountForm.businessName,
          businessName: accountForm.businessName,
          email: session.email,
          phone: accountForm.phone,
          altPhone: accountForm.altPhone,
          taxId: accountForm.taxId,
          category: accountForm.category,
          preferredBranch: accountForm.preferredBranch,
          address: accountForm.address,
          city: accountForm.city,
          province: accountForm.province,
        },
        client.businessName || 'Cliente',
      )
      setIsAccountEditOpen(false)
    } finally {
      setIsSavingAccount(false)
    }
  }

  const handleSendClientChatMessage = (messageText = '') => {
    const selectedOrderReference = clientOrders.find(
      (order) => order.id === clientChatOrderReferenceId,
    )

    if (!messageText.trim() && !selectedOrderReference) {
      return
    }

    setChatTyping(client.id, 'client', false)
    sendChatMessage(client.id, 'client', client.businessName || session.name, messageText, {
      orderReference: selectedOrderReference
        ? {
            orderId: selectedOrderReference.id,
            orderCode: selectedOrderReference.id,
            status: selectedOrderReference.status,
            total: selectedOrderReference.total,
            createdAt: selectedOrderReference.createdAt,
          }
        : null,
    })
    setClientChatOrderReferenceId('')
  }

  const catalogProps = {
    products,
    categories,
    brands,
    activeCategory,
    onCategoryChange: setActiveCategory,
    searchTerm,
    onSearchChange: setSearchTerm,
    brand,
    onBrandChange: setBrand,
    viewMode,
    onViewModeChange: setViewMode,
    visibleProducts,
    totalProducts: filteredProducts.length,
    page: Math.min(productPage, productTotalPages),
    totalPages: productTotalPages,
    onPrevPage: () => setProductPage((current) => Math.max(current - 1, 1)),
    onNextPage: () => setProductPage((current) => Math.min(current + 1, productTotalPages)),
    productQuantities,
    orderItems,
    tierName: loyaltyStatus.currentTier.name,
    settings,
    onQuantityChange: handleQuantityChange,
    onAddToOrder: handleAddToOrder,
    onRepeatLastOrder: handleRepeatLastOrder,
    onOpenQuickOrder: () => setIsQuickOrderOpen(true),
    onCheckout: () => handleTabChange('checkout'),
    canCheckout: canProceedToCheckout,
  }

  if (activeTab === 'checkout') {
    return (
      <main className="client-checkout-shell">
        <CheckoutPage
          client={client}
          products={products}
          settings={settings}
          orderItems={orderItems}
          onBackToOrder={() => handleTabChange('pedido')}
          onConfirmOrder={handleConfirmOrder}
        />
        {isAccountEditOpen ? (
          <AccountEditModal
            formValues={accountForm}
            onChange={handleAccountFieldChange}
            onClose={() => setIsAccountEditOpen(false)}
            onSave={handleSaveAccount}
            isSaving={isSavingAccount}
            saveError={accountSaveError}
          />
        ) : null}
      </main>
    )
  }

  return (
    <main className="client-crm-page">
      <ClientSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={visibleTabs}
        client={client}
        session={session}
        loyaltyStatus={loyaltyStatus}
        unreadCount={unreadForClient}
        onLogout={handleLogout}
      />

      <section className="client-main-shell">
        <ClientPageHeader
          activeTab={activeTab}
          client={client}
          cartCount={cartCount}
          onRepeatLastOrder={handleRepeatLastOrder}
          onCartClick={handleGoToCart}
          settings={settings}
          onEditAccount={handleOpenAccountEdit}
        />

        <section className="client-dashboard-shell client-shell-card">
          {activeTab === 'inicio' ? (
            <HomeSection
              client={client}
              clientOrders={clientOrders}
              products={products}
              loyaltyStatus={loyaltyStatus}
              tierBenefitSummary={tierBenefitSummary}
              settings={settings}
              latestOrder={latestOrder}
              orderItems={orderItems}
              onGoToOrderPage={() => handleTabChange('pedido')}
              onGoToCheckout={() => handleTabChange('checkout')}
              onRepeatLastOrder={handleRepeatLastOrder}
            />
          ) : null}

          {activeTab === 'pedido' ? <OrderPage {...catalogProps} /> : null}

          {activeTab === 'cuenta' ? (
            <AccountPage
              session={session}
              client={client}
              loyaltyStatus={loyaltyStatus}
              tierBenefitSummary={tierBenefitSummary}
              latestOrder={latestOrder}
              clientOrders={clientOrders}
              previousOrders={previousOrders}
              orderItems={orderItems}
            />
          ) : null}

          {activeTab === 'catalogo' ? (
            <CatalogPage
              products={products}
              onAddToOrder={(productId) => {
                // Add to cart and stay in catalog
                if (catalogProps.onAddProduct) catalogProps.onAddProduct(productId)
              }}
              onGoToOrder={() => handleTabChange('pedido')}
            />
          ) : null}

          {activeTab === 'historial' ? (
            <OrderHistoryPage
              clientOrders={clientOrders}
              products={products}
              onRepeatOrder={handleRepeatLastOrder}
              onGoToOrder={() => handleTabChange('pedido')}
            />
          ) : null}

          {activeTab === 'cotizaciones' ? (
            <ClientCotizacionesPage session={session} products={products} />
          ) : null}

          {activeTab === 'cuentacorriente' ? (
            <ClientCuentaCorrientePage session={session} />
          ) : null}

          {activeTab === 'beneficios' ? (
            <BeneficiosPage
              loyaltyStatus={loyaltyStatus}
              tierBenefitSummary={tierBenefitSummary}
              client={client}
            />
          ) : null}

          {activeTab === 'ia' ? <ClientAiPage /> : null}

          {activeTab === 'chat' ? (
            <ClientChatPage
              chat={clientChat}
              onSend={handleSendClientChatMessage}
              onTypingChange={(isTyping) => setChatTyping(client.id, 'client', isTyping)}
              unreadCount={unreadForClient}
              typingLabel={adminIsTyping ? 'Administracion esta escribiendo...' : ''}
              orderOptions={clientOrders}
              selectedOrderId={clientChatOrderReferenceId}
              onSelectedOrderChange={setClientChatOrderReferenceId}
              onOpenOrderReference={setSelectedChatOrderId}
            />
          ) : null}
        </section>
      </section>

      {isAccountEditOpen ? (
        <AccountEditModal
          formValues={accountForm}
          onChange={handleAccountFieldChange}
          onClose={() => setIsAccountEditOpen(false)}
          onSave={handleSaveAccount}
          isSaving={isSavingAccount}
          saveError={accountSaveError}
        />
      ) : null}

      {selectedChatOrder ? (
        <ClientChatOrderModal
          order={selectedChatOrder}
          client={client}
          products={products}
          onClose={() => setSelectedChatOrderId(null)}
        />
      ) : null}

      {isQuickOrderOpen ? (
        <QuickOrderModal
          draft={quickOrderDraft}
          summary={quickOrderSummary}
          onDraftChange={setQuickOrderDraft}
          onClose={() => setIsQuickOrderOpen(false)}
          onApply={handleApplyQuickOrder}
        />
      ) : null}
    </main>
  )
}

