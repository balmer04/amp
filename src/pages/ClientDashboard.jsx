import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import {
  buildOrderRows,
  buildQuantityMap,
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
  { id: 'pedido', label: 'Armar pedido' },
  { id: 'cuenta', label: 'Mi cuenta' },
  { id: 'ia', label: 'IA' },
  { id: 'chat', label: 'Chat' },
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
        <img
          src="/branding/navbar-logo.svg"
          alt="Cadena de Pinturerias"
          className="client-sidebar-logo"
        />
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id || (activeTab === 'checkout' && tab.id === 'pedido')
                ? 'client-sidebar-link active'
                : 'client-sidebar-link'
            }
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

function ClientPageHeader({ activeTab, cartCount, onRepeatLastOrder, onCartClick }) {
  const meta = CLIENT_VIEW_META[activeTab] ?? CLIENT_VIEW_META.inicio

  return (
    <header className="client-page-header">
      <div>
        <span className="client-card-eyebrow">{meta.eyebrow}</span>
        <h1>{meta.title}</h1>
      </div>

      {activeTab === 'inicio' ? (
        <div className="client-page-actions">
          <button type="button" className="client-page-action-btn" onClick={onRepeatLastOrder}>
            ↻ Repetir ultimo pedido
          </button>
          <button type="button" className="client-page-action-btn" onClick={onCartClick}>
            Carrito
            <span className="client-page-action-badge">{cartCount}</span>
          </button>
        </div>
      ) : (
        <p>{meta.description}</p>
      )}
    </header>
  )
}

function ClientChatPage({ chat, draft, onDraftChange, onSend, unreadCount, typingLabel }) {
  return (
    <section className="client-account-layout">
      <ClientChatCard
        chat={chat}
        draft={draft}
        onDraftChange={onDraftChange}
        onSend={onSend}
        unreadCount={unreadCount}
        typingLabel={typingLabel}
      />
    </section>
  )
}

function ClientAiPage() {
  return (
    <section className="client-ai-layout">
      <article className="client-card client-ai-hero">
        <span className="client-card-eyebrow">Proximamente</span>
        <h3>Asistente comercial para clientes</h3>
        <p>
          Esta seccion queda preparada para incorporar una IA que ayude a buscar productos,
          recomendar cantidades, explicar promociones y asistir durante el armado del pedido.
        </p>
      </article>

      <div className="client-ai-grid">
        <article className="client-card">
          <h4>Lo que podria hacer</h4>
          <ul className="client-ai-list">
            <li>Responder dudas sobre productos, categorias y marcas.</li>
            <li>Sugerir combinaciones para una compra rapida.</li>
            <li>Explicar puntos, beneficios y estado de pedidos.</li>
          </ul>
        </article>

        <article className="client-card">
          <h4>Como se integraria</h4>
          <ul className="client-ai-list">
            <li>Chat conectado a tu cuenta y al catalogo real.</li>
            <li>Lectura del pedido en curso para dar recomendaciones utiles.</li>
            <li>Soporte contextual dentro de Inicio, Armar pedido y Mi cuenta.</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function QuantitySelector({ value, onDecrease, onIncrease, onChange, compact = false }) {
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function ProductCard({ product, tierName, settings, quantity, onDecrease, onIncrease, onChange, onAdd }) {
  const discountedPrice = getDiscountedProductPrice(product, tierName, settings)
  const effectiveOldPrice = discountedPrice !== product.price ? product.price : product.oldPrice

  return (
    <article className="product-card">
      <div className={`product-card-visual ${product.accent}`}>
        {product.badge ? <span className="product-badge">{product.badge}</span> : null}
        <span className="product-code">{product.code}</span>
      </div>
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p>
          {product.detail} · {product.brand}
        </p>
        <div className="product-price-block">
          <strong>{formatCurrency(discountedPrice)}</strong>
          {effectiveOldPrice ? <span>{formatCurrency(effectiveOldPrice)}</span> : null}
        </div>
        <small className="product-subtotal">
          Subtotal: {formatCurrency(discountedPrice * quantity)}
        </small>
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
  const effectiveOldPrice = discountedPrice !== product.price ? product.price : product.oldPrice

  return (
    <article className={quantity > 0 ? 'product-list-row selected' : 'product-list-row'}>
      <div className={`product-list-thumb ${product.accent}`}>
        <span className="product-code small">{product.code}</span>
      </div>
      <div className="product-list-info">
        <strong>{product.name}</strong>
        <span>
          SKU {product.sku} · {product.brand}
        </span>
      </div>
      <div className="product-list-price">
        <strong>{formatCurrency(discountedPrice)}</strong>
        {effectiveOldPrice ? <span>{formatCurrency(effectiveOldPrice)}</span> : null}
        <small className="product-subtotal">
          Subtotal: {formatCurrency(discountedPrice * quantity)}
        </small>
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
  onRepeatLastOrder,
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
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="brand-filter">
        <select value={brand} onChange={(event) => onBrandChange(event.target.value)}>
          {brands.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <ViewSwitcher viewMode={viewMode} onChange={onViewModeChange} />

      <button
        type="button"
        className="repeat-order-btn repeat-order-icon-btn"
        onClick={onRepeatLastOrder}
        aria-label="Repetir ultimo pedido"
        title="Repetir ultimo pedido"
      >
        <span aria-hidden="true">↻</span>
      </button>
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
        <button type="button" className="mini-link-btn" onClick={onRepeatLastOrder}>
          Repetir ultimo pedido
        </button>
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
  tierName,
  settings,
  onQuantityChange,
  onAddToOrder,
  onRepeatLastOrder,
  onBatchAddToOrder,
  onCheckout,
  canCheckout,
}) {
  const hasSelectedProducts = visibleProducts.some(
    (product) => (productQuantities[product.id] ?? 0) > 0 && product.currentStock > 0,
  )

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
        onRepeatLastOrder={onRepeatLastOrder}
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
          <span>
            Pagina {page} de {totalPages}
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
        <button
          type="button"
          className="client-primary-wide batch-action-btn"
          onClick={onBatchAddToOrder}
          disabled={!hasSelectedProducts}
        >
          Agregar seleccionados al pedido
        </button>
        <button
          type="button"
          className="client-secondary-wide batch-secondary-btn"
          onClick={onCheckout}
          disabled={!canCheckout}
        >
          Continuar al pago
        </button>
      </div>
    </article>
  )
}

function HomeSection({
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

  return (
    <section className="client-home-layout">
      <div className="client-home-main">
        <article className="client-panel-card promo-hero-card">
          <div className="promo-hero-copy">
            <span className="client-card-eyebrow">Novedades</span>
            <h2>Promociones y oportunidades de la semana</h2>
            <p>Ofertas activas y productos destacados para que entres directo a la compra.</p>
          </div>

          <div className="promo-grid">
            {promoProducts.map((product) => (
              <article key={product.id} className="promo-card">
                <div className={`product-card-visual ${product.accent}`}>
                  {product.badge ? <span className="product-badge">{product.badge}</span> : null}
                  <span className="product-code">{product.code}</span>
                </div>
                <div className="promo-card-body">
                  <strong>{product.name}</strong>
                  <span>
                      {product.detail} · {product.brand}
                  </span>
                  <div className="product-price-block">
                    <strong>{formatCurrency(getDiscountedProductPrice(product, loyaltyStatus.currentTier.name, settings))}</strong>
                    {getDiscountedProductPrice(product, loyaltyStatus.currentTier.name, settings) !== product.price ? (
                      <span>{formatCurrency(product.price)}</span>
                    ) : product.oldPrice ? (
                      <span>{formatCurrency(product.oldPrice)}</span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="promo-actions promo-actions-bottom">
            <button type="button" className="client-primary-wide promo-action-btn" onClick={onGoToOrderPage}>
              Ir a armar pedido
            </button>
          </div>
        </article>

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

            <div className="tracking-status-card">
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
      </div>

      <aside className="client-home-sidebar">
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

          <div className="discount-grid">
            {tierBenefitSummary.categoryDiscounts.slice(0, 3).map((item) => (
              <div key={item.category} className="discount-item">
                <strong>{item.percent}%</strong>
                <span>{item.category}</span>
              </div>
            ))}
            <div className="discount-item">
              <strong>
                {tierBenefitSummary.shippingMode === 'free'
                  ? '100%'
                  : `${tierBenefitSummary.shippingDiscountPercent}%`}
              </strong>
              <span>
                {tierBenefitSummary.shippingMode === 'free'
                  ? 'Envio gratis'
                  : tierBenefitSummary.shippingMode === 'discounted'
                    ? 'Envio con descuento'
                    : 'Envio sin beneficio'}
              </span>
            </div>
          </div>
        </article>

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

  return (
    <section className="client-checkout-layout">
      <article className="client-panel-card checkout-main-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Checkout</span>
            <h2>Finalizar compra</h2>
            <p className="checkout-subtitle">
              Revisa entrega, pago y datos de facturacion antes de confirmar.
            </p>
          </div>
          <button type="button" className="repeat-order-btn" onClick={onBackToOrder}>
            Volver al pedido
          </button>
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

      <aside className="client-home-sidebar">
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
              <strong>{shippingCost === 0 ? 'A convenir en sucursal' : formatCurrency(shippingCost)}</strong>
            </div>
            <div className="checkout-total-row final">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="client-primary-wide"
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
  )
}

function AccountEditModal({ formValues, onChange, onClose, onSave }) {
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
              onChange={(event) => onChange('email', event.target.value)}
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

        <div className="client-modal-actions">
          <button type="button" className="client-modal-btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="client-modal-btn primary" onClick={onSave}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientChatCard({ chat, draft, onDraftChange, onSend, unreadCount, typingLabel }) {
  const threadRef = useRef(null)

  useEffect(() => {
    const element = threadRef.current

    if (!element) {
      return
    }

    element.scrollTop = element.scrollHeight
  }, [chat.messages.length, typingLabel])

  return (
    <article className="client-panel-card account-span-two">
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

      <div ref={threadRef} className="client-chat-thread">
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

      <div className="client-chat-composer">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSend()
            }
          }}
          placeholder="Escribi tu mensaje para administracion..."
        />
        <button type="button" className="client-primary-wide client-chat-send" onClick={onSend}>
          Enviar mensaje
        </button>
      </div>
    </article>
  )
}

function AccountPage({
  session,
  client,
  loyaltyStatus,
  latestOrder,
  previousOrders,
  orderItems,
  onLogout,
  onEditAccount,
}) {
  const currentStatus =
    latestOrder?.status ?? (orderItems.length > 0 ? 'Pendiente' : 'Sin pedido activo')
  const accountMessage = loyaltyStatus.nextTier
    ? `Tu nivel actual: ${loyaltyStatus.currentTier.name} - Te faltan ${loyaltyStatus.pointsToNext.toLocaleString(
        'es-AR',
      )} pts para alcanzar el nivel ${loyaltyStatus.nextTier.name}.`
    : 'Tu nivel actual: Estratégico - Alcanzaste el nivel premium maximo.'

  return (
    <section className="client-account-layout">
      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Mi cuenta</span>
            <h2>Datos del cliente</h2>
          </div>
        </div>

        <div className="account-stack">
          <div className="account-row">
            <span>Nombre</span>
            <strong>{client.businessName || session.name}</strong>
          </div>
          <div className="account-row">
            <span>Email</span>
            <strong>{client.email || session.email}</strong>
          </div>
          <div className="account-row">
            <span>Telefono</span>
            <strong>{client.phone}</strong>
          </div>
          <div className="account-row">
            <span>CUIT / DNI</span>
            <strong>{client.taxId}</strong>
          </div>
          <div className="account-row">
            <span>Categoria</span>
            <strong>{client.category}</strong>
          </div>
          <div className="account-row">
            <span>Sucursal habitual</span>
            <strong>{client.preferredBranch}</strong>
          </div>
        </div>

        <div className="account-actions">
          <button type="button" className="account-edit-btn" onClick={onEditAccount}>
            Actualizar datos
          </button>
        </div>
      </article>

      <article className="client-panel-card">
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

          <div className="points-expiration-box">
            <span>Proximo vencimiento</span>
            <strong>1.250 puntos el 30 Sep 2026</strong>
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

      <article className="client-panel-card">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Seguimiento</span>
            <h2>Estado de tu pedido actual</h2>
          </div>
        </div>

        <div className="status-steps">
          <div className={latestOrder ? 'status-step active' : 'status-step'}>Pedido recibido</div>
          <div
            className={
              ['Pendiente', 'Aprobado', 'Preparando', 'Despachado', 'Cancelado'].includes(currentStatus)
                ? 'status-step active'
                : 'status-step'
            }
          >
            {currentStatus}
          </div>
          <div
            className={
              ['Aprobado', 'Preparando', 'Despachado'].includes(currentStatus)
                ? 'status-step active'
                : 'status-step'
            }
          >
            {latestOrder?.deliveryType === 'Retiro en sucursal' ? 'Listo para retiro' : 'En camino'}
          </div>
          <div className={currentStatus === 'Despachado' ? 'status-step active' : 'status-step'}>
            Despachado
          </div>
        </div>
      </article>

      <article className="client-panel-card account-span-two">
        <div className="client-card-header">
          <div>
            <span className="client-card-eyebrow">Historial</span>
            <h2>Pedidos anteriores</h2>
          </div>
        </div>

        <div className="history-table">
          {previousOrders.map((order) => (
            <div key={order.code} className="history-row">
              <strong>{order.code}</strong>
              <span>{order.date}</span>
              <span>{order.status}</span>
              <strong>{order.total}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="client-panel-card account-span-two account-logout-card">
        <div className="account-logout-wrap">
          <div>
            <span className="client-card-eyebrow">Sesion</span>
            <h2>Cerrar sesion</h2>
            <p className="checkout-subtitle">
              Sal de tu cuenta de cliente de forma segura cuando termines de operar.
            </p>
          </div>

          <button type="button" className="account-logout-btn" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </article>
    </section>
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
  const [isAccountEditOpen, setIsAccountEditOpen] = useState(false)
  const [clientChatDraft, setClientChatDraft] = useState('')
  const clientTypingTimeoutRef = useRef(null)
  const { logout, session } = useAuth()
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

  const client = clients.find((entry) => entry.id === session.id) ?? clients[0]
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

  useEffect(() => {
    if (activeTab === 'chat') {
      openChat(client.id, 'client')
    }
  }, [activeTab, client.id])

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
        total: formatCurrency(order.total),
      })),
    [clientOrders],
  )
  const cartCount = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.qty, 0),
    [orderItems],
  )

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

  const handleBatchAddToOrder = () => {
    const selectedItems = Object.entries(productQuantities)
      .map(([productId, qty]) => ({ productId: Number(productId), qty }))
      .filter((item) => item.qty > 0)

    if (selectedItems.length === 0) return

    setOrderItems((current) => {
      const next = [...current]
      selectedItems.forEach((selected) => {
        const existing = next.find((item) => item.productId === selected.productId)
        if (existing) {
          existing.qty += selected.qty
        } else {
          next.push(selected)
        }
      })
      return next
    })

    setProductQuantities({})
    handleTabChange('checkout')
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
    handleTabChange('cuenta')
  }

  const handleOpenAccountEdit = () => {
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

  const handleSaveAccount = () => {
    saveClient(
      {
        ...client,
        name: accountForm.businessName,
        businessName: accountForm.businessName,
        email: accountForm.email,
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
  }

  const handleSendClientChatMessage = () => {
    if (!clientChatDraft.trim()) {
      return
    }

    setChatTyping(client.id, 'client', false)
    sendChatMessage(client.id, 'client', client.businessName || session.name, clientChatDraft)
    setClientChatDraft('')
  }

  useEffect(() => {
    const isTyping = clientChatDraft.trim().length > 0
    setChatTyping(client.id, 'client', isTyping)

    if (clientTypingTimeoutRef.current) {
      window.clearTimeout(clientTypingTimeoutRef.current)
    }

    if (isTyping) {
      clientTypingTimeoutRef.current = window.setTimeout(() => {
        setChatTyping(client.id, 'client', false)
      }, 2200)
    }

    return () => {
      if (clientTypingTimeoutRef.current) {
        window.clearTimeout(clientTypingTimeoutRef.current)
      }
    }
  }, [client.id, clientChatDraft])

  const catalogProps = {
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
    tierName: loyaltyStatus.currentTier.name,
    settings,
    onQuantityChange: handleQuantityChange,
    onAddToOrder: handleAddToOrder,
    onBatchAddToOrder: handleBatchAddToOrder,
    onRepeatLastOrder: handleRepeatLastOrder,
    onCheckout: () => handleTabChange('checkout'),
    canCheckout: canProceedToCheckout,
  }

  return (
    <main className="client-crm-page">
      <ClientSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        client={client}
        session={session}
        loyaltyStatus={loyaltyStatus}
        unreadCount={unreadForClient}
        onLogout={handleLogout}
      />

      <section className="client-main-shell">
        <ClientPageHeader
          activeTab={activeTab}
          cartCount={cartCount}
          onRepeatLastOrder={handleRepeatLastOrder}
          onCartClick={handleGoToCart}
        />

        <section className="client-dashboard-shell client-shell-card">
          {activeTab === 'inicio' ? (
            <HomeSection
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

          {activeTab === 'checkout' ? (
            <CheckoutPage
              client={client}
              products={products}
              settings={settings}
              orderItems={orderItems}
              onBackToOrder={() => handleTabChange('pedido')}
              onConfirmOrder={handleConfirmOrder}
            />
          ) : null}

          {activeTab === 'cuenta' ? (
            <AccountPage
              session={session}
              client={client}
              loyaltyStatus={loyaltyStatus}
              latestOrder={latestOrder}
              previousOrders={previousOrders}
              orderItems={orderItems}
              onLogout={handleLogout}
              onEditAccount={handleOpenAccountEdit}
            />
          ) : null}

          {activeTab === 'ia' ? <ClientAiPage /> : null}

          {activeTab === 'chat' ? (
            <ClientChatPage
              chat={clientChat}
              draft={clientChatDraft}
              onDraftChange={setClientChatDraft}
              onSend={handleSendClientChatMessage}
              unreadCount={unreadForClient}
              typingLabel={adminIsTyping ? 'Administracion esta escribiendo...' : ''}
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
        />
      ) : null}
    </main>
  )
}

