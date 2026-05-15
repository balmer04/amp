import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  DEFAULT_AUDIT_LOG,
  DEFAULT_CLIENTS,
  DEFAULT_ORDERS,
  DEFAULT_PRODUCTS,
  DEFAULT_REDEMPTIONS,
  DEFAULT_SETTINGS,
  buildOrderHistoryFallback,
  calculateOrderTotal,
  calculatePointsFromTotal,
  createAuditMessage,
  generateOrderId,
  getTierByPoints,
  migrateTierBenefitConfig,
  migrateTierBenefits,
  migrateTierThresholds,
  migrateLegacyClientsToPointsModel,
} from '../lib/businessLogic'

const STORAGE_KEY = 'nexoft-data'
const BROADCAST_CHANNEL_KEY = 'nexoft-sync'
const PRODUCTS_STORAGE_KEY = 'nexoft-productos'

// One-shot legacy key migration (amp-reventa-* → nexoft-*)
if (typeof localStorage !== 'undefined') {
  const migrations = [
    ['amp-reventa-data', STORAGE_KEY],
    ['productos', PRODUCTS_STORAGE_KEY],
  ]
  migrations.forEach(([oldKey, newKey]) => {
    const v = localStorage.getItem(oldKey)
    if (v && !localStorage.getItem(newKey)) localStorage.setItem(newKey, v)
    if (v) localStorage.removeItem(oldKey)
  })
}

const AppDataContext = createContext(null)

function getDefaultState() {
  return {
    clients: DEFAULT_CLIENTS,
    products: DEFAULT_PRODUCTS,
    orders: DEFAULT_ORDERS,
    redemptions: DEFAULT_REDEMPTIONS,
    settings: DEFAULT_SETTINGS,
    auditLog: DEFAULT_AUDIT_LOG,
    chats: [],
  }
}

function normalizeChats(clients, rawChats = []) {
  return clients.map((client) => {
    const existingChat = rawChats.find((entry) => entry.clientId === client.id) ?? {}
    const messages = [...(existingChat.messages ?? [])].sort(
      (left, right) => new Date(left.createdAt) - new Date(right.createdAt),
    )
    const lastMessageAt =
      existingChat.lastMessageAt ?? messages[messages.length - 1]?.createdAt ?? null

    return {
      clientId: client.id,
      updatedAt: existingChat.updatedAt ?? lastMessageAt ?? client.createdAt ?? new Date().toISOString(),
      adminLastSeenAt: existingChat.adminLastSeenAt ?? null,
      clientLastSeenAt: existingChat.clientLastSeenAt ?? null,
      lastClientActivityAt: existingChat.lastClientActivityAt ?? null,
      lastAdminActivityAt: existingChat.lastAdminActivityAt ?? null,
      adminTypingAt: existingChat.adminTypingAt ?? null,
      clientTypingAt: existingChat.clientTypingAt ?? null,
      messages,
    }
  })
}

function normalizeStoredState(rawState) {
  const fallback = getDefaultState()
  const nextState = {
    ...fallback,
    ...rawState,
  }

  const validOrderIds = new Set(nextState.orders.map((order) => order.id))
  const migratedClients = migrateLegacyClientsToPointsModel(nextState.clients, nextState.orders)
  const nextThresholds = migrateTierThresholds(nextState.settings?.tierThresholds)
  const nextBenefits = migrateTierBenefits(nextState.settings?.tierBenefits)
  const nextBenefitConfig = migrateTierBenefitConfig(nextState.settings?.tierBenefitConfig)

  return {
    ...nextState,
    settings: {
      ...DEFAULT_SETTINGS,
      ...nextState.settings,
      operational: {
        ...DEFAULT_SETTINGS.operational,
        ...nextState.settings?.operational,
      },
      clientPanel: {
        ...DEFAULT_SETTINGS.clientPanel,
        ...nextState.settings?.clientPanel,
      },
      branding: {
        ...DEFAULT_SETTINGS.branding,
        ...nextState.settings?.branding,
      },
      tierThresholds: nextThresholds,
      tierBenefits: nextBenefits,
      tierBenefitConfig: nextBenefitConfig,
    },
    clients: migratedClients.map((client) => ({
      ...client,
      orderHistory: (client.orderHistory ?? []).filter((orderId) => validOrderIds.has(orderId)),
      paymentHistory: client.paymentHistory ?? [],
      activityLog: client.activityLog ?? [],
      tier: getTierByPoints(Number(client.lifetime_points ?? client.points ?? 0), nextThresholds).name,
    })),
    chats: normalizeChats(nextState.clients, nextState.chats),
    orders: nextState.orders.map((order) => ({
      adminNotes: '',
      stockDiscounted: false,
      pointsGranted: false,
      lifetimePointsGranted: true,
      history: buildOrderHistoryFallback(order),
      ...order,
    })),
    products: nextState.products.map((product) => ({
      ...product,
      currentStock: product.currentStock ?? 0,
    })),
  }
}

function getStoredState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return getDefaultState()
    }

    return normalizeStoredState(JSON.parse(saved))
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return getDefaultState()
  }
}

function appendAuditEntry(currentLog, actorName, action, subject) {
  return [
    {
      id: `LOG-${Date.now()}`,
      message: createAuditMessage(actorName, action, subject),
      createdAt: new Date().toISOString(),
    },
    ...currentLog,
  ]
}

function appendOrderHistoryEntry(currentHistory, action, actor) {
  return [
    {
      id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      actor,
      createdAt: new Date().toISOString(),
    },
    ...(currentHistory ?? []),
  ]
}

function applyOrderInventory(products, order, direction) {
  return products.map((product) => {
    const item = order.items.find((entry) => entry.productId === product.id)

    if (!item) {
      return product
    }

    const factor = direction === 'restore' ? 1 : -1

    return {
      ...product,
      currentStock: Math.max(product.currentStock + item.qty * factor, 0),
    }
  })
}

function applyCustomerStatusUpdate(clients, customerId, thresholds) {
  return clients.map((client) => {
    if (client.id !== customerId) {
      return client
    }

    const lifetimePoints = Number(client.lifetime_points ?? client.points ?? 0)

    return {
      ...client,
      lifetime_points: lifetimePoints,
      available_points: Number(client.available_points ?? lifetimePoints),
      points: lifetimePoints,
      tier: getTierByPoints(lifetimePoints, thresholds).name,
    }
  })
}

function inferImportedCategory(name = '') {
  const normalized = String(name).toLowerCase()

  if (normalized.includes('latex') || normalized.includes('látex')) return 'Latex'
  if (normalized.includes('esmalte')) return 'Esmalte'
  if (normalized.includes('imper')) return 'Impermeabilizantes'
  if (normalized.includes('rodillo') || normalized.includes('pince') || normalized.includes('espat')) {
    return 'Herramientas'
  }
  if (normalized.includes('revest')) return 'Revestimientos'

  return 'General'
}

function inferImportedCode(category) {
  const codeMap = {
    Latex: 'LTX',
    Esmalte: 'ESM',
    Impermeabilizantes: 'IMP',
    Herramientas: 'HRR',
    Revestimientos: 'REV',
    General: 'GEN',
  }

  return codeMap[category] ?? 'GEN'
}

export function AppDataProvider({ children }) {
  const { session } = useAuth()
  const [state, setState] = useState(getStoredState)
  const isUpdatingRef = useRef(false) // Lock para evitar sobreescritura por polling durante un envío


  useEffect(() => {
    if (!session?.token) return;

    const fetchState = () => {
      fetch('/api/state', {
        headers: { 'Authorization': `Bearer ${session.token}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.state) {
          // Si estamos enviando algo, ignoramos este tick del polling
          if (isUpdatingRef.current) return;

          const normalized = normalizeStoredState(data.state)
          const serialized = JSON.stringify(normalized);
          setState(prev => {
             const prevSerialized = JSON.stringify(prev);
             if (prevSerialized === serialized) return prev;
             return normalized;
          });
          localStorage.setItem(STORAGE_KEY, serialized);
        }
      })
      .catch(e => console.error('Failed to sync state', e));
    };

    // Polling cada 3 segundos
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [session?.token])

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return
      }

      try {
        setState(normalizeStoredState(JSON.parse(event.newValue)))
      } catch {
        // Ignore malformed external writes.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined
    }

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_KEY)

    channel.onmessage = (event) => {
      if (event.data?.type !== 'state-update' || !event.data.payload) {
        return
      }

      setState(normalizeStoredState(event.data.payload))
    }

    return () => channel.close()
  }, [])

  const updateState = (updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      const normalizedNext = normalizeStoredState(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedNext))
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(normalizedNext.products))

      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_KEY)
        channel.postMessage({ type: 'state-update', payload: normalizedNext })
        channel.close()
      }

      if (session?.token && session.role === 'admin') {
        isUpdatingRef.current = true;
        fetch('/api/state', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}` 
          },
          body: JSON.stringify({ state: normalizedNext }),
        }).then(() => {
           // Pequeño delay antes de liberar el lock para que el polling
           // no traiga el estado viejo justo un ms antes de que impacte en DB
           setTimeout(() => { isUpdatingRef.current = false; }, 500);
        }).catch(err => {
           console.error('Failed to sync to server', err);
           isUpdatingRef.current = false;
        });
      }

      return normalizedNext
    })
  }

  const updateClientPoints = (clientId, points, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client) {
        return current
      }

      return {
        ...current,
        clients: applyCustomerStatusUpdate(
          current.clients.map((entry) =>
            entry.id === clientId
              ? {
                  ...entry,
                  points: Number(points) || 0,
                  lifetime_points: Number(points) || 0,
                  available_points: Number(points) || 0,
                }
              : entry,
          ),
          clientId,
          current.settings.tierThresholds,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'actualizó los puntos de',
          client.businessName,
        ),
      }
    })
  }

  const updateClientTier = (clientId, tierName, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)
      const threshold = Number(current.settings.tierThresholds[tierName] ?? 0)

      if (!client) {
        return current
      }

      return {
        ...current,
        clients: applyCustomerStatusUpdate(
          current.clients.map((entry) =>
            entry.id === clientId
              ? {
                  ...entry,
                  points: threshold,
                  lifetime_points: threshold,
                  available_points: threshold,
                }
              : entry,
          ),
          clientId,
          current.settings.tierThresholds,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'ajustó el nivel de',
          `${client.businessName} a ${tierName}`,
        ),
      }
    })
  }

  const updateClientNote = (clientId, note) => {
    updateState((current) => ({
      ...current,
      clients: current.clients.map((entry) =>
        entry.id === clientId ? { ...entry, note } : entry,
      ),
    }))
  }

  const updateClientStatus = (clientId, status, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client) {
        return current
      }

      return {
        ...current,
        clients: current.clients.map((entry) =>
          entry.id === clientId ? { ...entry, status } : entry,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'cambió el estado del cliente',
          `${client.businessName} a ${status}`,
        ),
      }
    })
  }

  const registerClientPayment = (clientId, payment, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client) {
        return current
      }

      return {
        ...current,
        clients: current.clients.map((entry) =>
          entry.id === clientId
            ? {
                ...entry,
                pendingBalance: Math.max(entry.pendingBalance - payment.amount, 0),
                paymentHistory: [
                  {
                    id: `PAY-${Date.now()}`,
                    ...payment,
                    registeredBy: actorName,
                  },
                  ...entry.paymentHistory,
                ],
              }
            : entry,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'registró un pago de',
          client.businessName,
        ),
      }
    })
  }

  const addQuickClientNote = (clientId, note, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client || !note.trim()) {
        return current
      }

      const nextNote = client.note
        ? `${client.note}\n${note.trim()}`
        : note.trim()

      return {
        ...current,
        clients: current.clients.map((entry) =>
          entry.id === clientId ? { ...entry, note: nextNote } : entry,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'agregó una nota rápida a',
          client.businessName,
        ),
      }
    })
  }

  const deleteClient = (clientId, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client) {
        return current
      }

      return {
        ...current,
        clients: current.clients.filter((entry) => entry.id !== clientId),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'eliminó el cliente',
          client.businessName,
        ),
      }
    })
  }

  const saveClient = (clientData, actorName) => {
    updateState((current) => {
      const isEditing = Boolean(clientData.id)
      const existingClient = current.clients.find((entry) => entry.id === clientData.id)
      const nextId =
        isEditing || current.clients.length === 0
          ? clientData.id
          : Math.max(...current.clients.map((entry) => entry.id)) + 1

      const normalizedClient = {
        paymentHistory: [],
        activityLog: [],
        orderHistory: [],
        pendingBalance: 0,
        altPhone: '',
        specialDiscount: 0,
        points: 0,
        lifetime_points: 0,
        available_points: 0,
        creditLimit: 0,
        createdAt: new Date().toISOString(),
        ...existingClient,
        ...clientData,
        id: nextId,
      }

      return {
        ...current,
        clients: applyCustomerStatusUpdate(
          isEditing
            ? current.clients.map((entry) => (entry.id === nextId ? normalizedClient : entry))
            : [normalizedClient, ...current.clients],
          nextId,
          current.settings.tierThresholds,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          isEditing ? 'editó el cliente' : 'dio de alta el cliente',
          normalizedClient.businessName,
        ),
      }
    })
  }

  const addClientActivity = (clientId, activity, actorName) => {
    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client) {
        return current
      }

      return {
        ...current,
        clients: current.clients.map((entry) =>
          entry.id === clientId
            ? {
                ...entry,
                activityLog: [
                  {
                    id: `ACT-${Date.now()}`,
                    ...activity,
                  },
                  ...entry.activityLog,
                ],
              }
            : entry,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'agregó actividad a',
          client.businessName,
        ),
      }
    })
  }

  const updateProductStock = (productId, nextStock, actorName) => {
    updateState((current) => {
      const product = current.products.find((entry) => entry.id === productId)

      if (!product) {
        return current
      }

      return {
        ...current,
        products: current.products.map((entry) =>
          entry.id === productId
            ? { ...entry, currentStock: Math.max(Number(nextStock) || 0, 0) }
            : entry,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'actualizó el stock de',
          product.name,
        ),
      }
    })
  }

  const updateProductStockMinimo = (productId, nextMinimo, actorName) => {
    updateState((current) => {
      const product = current.products.find((entry) => entry.id === productId)
      if (!product) return current
      return {
        ...current,
        products: current.products.map((entry) =>
          entry.id === productId
            ? { ...entry, stockMinimo: Math.max(Number(nextMinimo) || 0, 0) }
            : entry,
        ),
        auditLog: appendAuditEntry(current.auditLog, actorName, 'actualizó stock mínimo de', product.name),
      }
    })
  }

  const adjustProductStock = (productId, delta, motivo, actorName) => {
    updateState((current) => {
      const product = current.products.find((entry) => entry.id === productId)
      if (!product) return current
      const nextStock = Math.max((Number(product.currentStock) || 0) + delta, 0)
      return {
        ...current,
        products: current.products.map((entry) =>
          entry.id === productId ? { ...entry, currentStock: nextStock } : entry,
        ),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          delta >= 0 ? 'ingresó stock de' : 'egresó stock de',
          `${product.name} (${delta >= 0 ? '+' : ''}${delta} uni${motivo ? ` — ${motivo}` : ''})`,
        ),
      }
    })
  }

  const deleteProduct = (productId, actorName) => {
    updateState((current) => {
      const product = current.products.find((entry) => entry.id === productId)

      if (!product) {
        return current
      }

      const usedInOrders = current.orders.some((order) =>
        order.items.some((item) => item.productId === productId),
      )

      if (usedInOrders) {
        return current
      }

      return {
        ...current,
        products: current.products.filter((entry) => entry.id !== productId),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'eliminó el producto',
          product.name,
        ),
      }
    })
  }

  const importProducts = (importedProducts, options, actorName) => {
    updateState((current) => {
      const normalizedImported = Array.isArray(importedProducts) ? importedProducts : []

      if (normalizedImported.length === 0) {
        return current
      }

      const updateExistingPrices = options?.existingProductStrategy === 'update-price'
      const resetNewStock = options?.resetNewStock !== false
      const fileName = options?.fileName ?? 'archivo'
      const existingBySku = new Map(
        current.products.map((product) => [String(product.sku ?? '').trim().toUpperCase(), product]),
      )
      let nextId = current.products.reduce(
        (maxValue, product) => Math.max(maxValue, Number(product.id) || 0),
        0,
      )

      const nextProducts = [...current.products]

      normalizedImported.forEach((product) => {
        const normalizedSku = String(product.sku ?? '').trim().toUpperCase()

        if (!normalizedSku) {
          return
        }

        const existingProduct = existingBySku.get(normalizedSku)

        if (existingProduct) {
          if (updateExistingPrices) {
            const updatedProduct = {
              ...existingProduct,
              price: Number(product.precio) || existingProduct.price,
              name: product.nombre || existingProduct.name,
              brand: product.marca || existingProduct.brand,
              detail:
                product.unidad || product.unidadMedida
                  ? `${product.unidad || ''} ${product.unidadMedida || ''}`.trim()
                  : existingProduct.detail,
            }
            const index = nextProducts.findIndex((entry) => entry.id === existingProduct.id)
            nextProducts[index] = updatedProduct
            existingBySku.set(normalizedSku, updatedProduct)
          }

          return
        }

        nextId += 1
        const category = inferImportedCategory(product.nombre)
        const nextProduct = {
          id: nextId,
          category,
          code: inferImportedCode(category),
          sku: product.sku,
          brand: product.marca || 'Sin marca',
          name: product.nombre || `Producto ${product.sku}`,
          detail: `${product.unidad || ''} ${product.unidadMedida || ''}`.trim(),
          currentStock: resetNewStock ? 0 : Number(product.stock) || 0,
          stockMinimo: 5,
          price: Number(product.precio) || 0,
          oldPrice: null,
          note: '',
          accent: 'product-clean',
          badge: null,
          importedCode: product.codigo || '',
        }

        nextProducts.push(nextProduct)
        existingBySku.set(normalizedSku, nextProduct)
      })

      return {
        ...current,
        products: nextProducts,
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          `importó ${normalizedImported.length} productos desde archivo`,
          fileName,
        ),
      }
    })
  }

  const updateTierThreshold = (tierName, nextThreshold, actorName) => {
    updateState((current) => {
      const nextTierThresholds = {
        ...current.settings.tierThresholds,
        [tierName]: Math.max(Number(nextThreshold) || 0, 0),
      }

      return {
        ...current,
        settings: {
          ...current.settings,
          tierThresholds: nextTierThresholds,
        },
        clients: current.clients.map((client) => {
          const lifetimePoints = Number(client.lifetime_points ?? client.points ?? 0)

          return {
            ...client,
            lifetime_points: lifetimePoints,
            available_points: Number(client.available_points ?? lifetimePoints),
            points: lifetimePoints,
            tier: getTierByPoints(lifetimePoints, nextTierThresholds).name,
          }
        }),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'modificó el umbral del nivel',
          tierName,
        ),
      }
    })
  }

  const updateTierBenefits = (tierName, benefits, actorName) => {
    updateState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        tierBenefits: {
          ...current.settings.tierBenefits,
          [tierName]: benefits,
        },
      },
      auditLog: appendAuditEntry(
        current.auditLog,
        actorName,
        'actualizó los beneficios del nivel',
        tierName,
      ),
    }))
  }

  const updateTierBenefitConfig = (tierName, config, actorName) => {
    updateState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        tierBenefitConfig: {
          ...current.settings.tierBenefitConfig,
          [tierName]: config,
        },
      },
      auditLog: appendAuditEntry(
        current.auditLog,
        actorName,
        'actualizó la configuracion comercial del nivel',
        tierName,
      ),
    }))
  }

  const updateAdminSettings = (sectionKey, nextValues, actorName) => {
    updateState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [sectionKey]: {
          ...DEFAULT_SETTINGS[sectionKey],
          ...current.settings?.[sectionKey],
          ...nextValues,
        },
      },
      auditLog: appendAuditEntry(
        current.auditLog,
        actorName,
        'actualizó la configuracion de',
        sectionKey,
      ),
    }))
  }

  const updateOrderAdminNotes = (orderId, adminNotes) => {
    updateState((current) => ({
      ...current,
      orders: current.orders.map((order) =>
        order.id === orderId ? { ...order, adminNotes } : order,
      ),
    }))
  }

  const updateCustomerStatus = (customerId) => {
    updateState((current) => ({
      ...current,
      clients: applyCustomerStatusUpdate(current.clients, customerId, current.settings.tierThresholds),
    }))
  }

  const approveOrder = (orderId, actorName) => {
    updateState((current) => {
      const order = current.orders.find((entry) => entry.id === orderId)

      if (!order || order.status !== 'Pendiente') {
        return current
      }

      const nextProducts = order.stockDiscounted
        ? current.products
        : applyOrderInventory(current.products, order, 'discount')

      return {
        ...current,
        orders: current.orders.map((entry) =>
          entry.id === orderId
            ? {
                ...entry,
                status: 'Aprobado',
                stockDiscounted: true,
                pointsGranted: false,
                history: appendOrderHistoryEntry(entry.history, 'Aprobado', actorName),
              }
            : entry,
        ),
        products: nextProducts,
        auditLog: appendAuditEntry(current.auditLog, actorName, 'aprobó el pedido', order.id),
      }
    })
  }

  const changeOrderStatus = (orderId, nextStatus, actorName, metadata = {}) => {
    updateState((current) => {
      const order = current.orders.find((entry) => entry.id === orderId)

      if (!order || order.status === 'Cancelado') {
        return current
      }

      const shouldGrantLifetimePoints =
        ['Despachado', 'Completed', 'Delivered'].includes(nextStatus) &&
        !order.lifetimePointsGranted
      const pointsToAdd = shouldGrantLifetimePoints ? calculatePointsFromTotal(order.total) : 0
      const nextClients = shouldGrantLifetimePoints
        ? applyCustomerStatusUpdate(
            current.clients.map((client) =>
              client.id === order.clientId
                ? {
                    ...client,
                    lifetime_points: Number(client.lifetime_points ?? client.points ?? 0) + pointsToAdd,
                    available_points: Number(client.available_points ?? client.points ?? 0) + pointsToAdd,
                    points: Number(client.lifetime_points ?? client.points ?? 0) + pointsToAdd,
                  }
                : client,
            ),
            order.clientId,
            current.settings.tierThresholds,
          )
        : current.clients

      return {
        ...current,
        orders: current.orders.map((entry) =>
          entry.id === orderId
            ? {
                ...entry,
                status: nextStatus,
                dispatchedAt:
                  nextStatus === 'Despachado' ? new Date().toISOString() : entry.dispatchedAt,
                deliveryNote:
                  nextStatus === 'Despachado'
                    ? metadata.deliveryNote ?? entry.deliveryNote ?? ''
                    : entry.deliveryNote,
                lifetimePointsGranted:
                  nextStatus === 'Despachado' || nextStatus === 'Completed' || nextStatus === 'Delivered'
                    ? true
                    : entry.lifetimePointsGranted,
                history: appendOrderHistoryEntry(entry.history, nextStatus, actorName),
              }
            : entry,
        ),
        clients: nextClients,
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'cambió el estado del pedido',
          `${order.id} a ${nextStatus}`,
        ),
      }
    })
  }

  const cancelOrder = (orderId, actorName) => {
    updateState((current) => {
      const order = current.orders.find((entry) => entry.id === orderId)

      if (!order || order.status === 'Cancelado') {
        return current
      }

      const lifetimePointsToRemove = order.lifetimePointsGranted
        ? calculatePointsFromTotal(order.total)
        : 0
      const nextClients = order.lifetimePointsGranted
        ? applyCustomerStatusUpdate(
            current.clients.map((client) =>
              client.id === order.clientId
                ? {
                    ...client,
                    lifetime_points: Math.max(
                      Number(client.lifetime_points ?? client.points ?? 0) - lifetimePointsToRemove,
                      0,
                    ),
                    available_points: Math.max(
                      Number(client.available_points ?? client.points ?? 0) - lifetimePointsToRemove,
                      0,
                    ),
                    points: Math.max(
                      Number(client.lifetime_points ?? client.points ?? 0) - lifetimePointsToRemove,
                      0,
                    ),
                  }
                : client,
            ),
            order.clientId,
            current.settings.tierThresholds,
          )
        : current.clients

      return {
        ...current,
        orders: current.orders.map((entry) =>
          entry.id === orderId
            ? {
                ...entry,
                status: 'Cancelado',
                stockDiscounted: false,
                pointsGranted: false,
                lifetimePointsGranted: false,
                history: appendOrderHistoryEntry(entry.history, 'Cancelado', actorName),
              }
            : entry,
        ),
        products: order.stockDiscounted
          ? applyOrderInventory(current.products, order, 'restore')
          : current.products,
        clients: nextClients,
        auditLog: appendAuditEntry(current.auditLog, actorName, 'canceló el pedido', order.id),
      }
    })
  }

  const approveRedemption = (redemptionId, actorName) => {
    updateState((current) => {
      const redemption = current.redemptions.find((entry) => entry.id === redemptionId)

      if (!redemption) {
        return current
      }

      return {
        ...current,
        redemptions: current.redemptions.filter((entry) => entry.id !== redemptionId),
        auditLog: appendAuditEntry(
          current.auditLog,
          actorName,
          'aprobó el canje',
          redemption.reward,
        ),
      }
    })
  }

  const createOrder = ({
    clientId,
    items,
    deliveryType,
    branch,
    paymentMethod,
    billingName,
    taxId,
    notes,
    shippingCost = 0,
  }) => {
    let createdOrderId = null

    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)

      if (!client || items.length === 0) {
        return current
      }

      const orderId = generateOrderId(current.orders)
      createdOrderId = orderId
      const total =
        calculateOrderTotal(items, current.products, client.tier, current.settings) +
        (Number(shippingCost) || 0)
      const shouldAutoApprove =
        !current.settings?.operational?.manualOrderApproval && paymentMethod !== 'transfer'
      const nextOrder = {
        id: orderId,
        clientId,
        status: shouldAutoApprove ? 'Aprobado' : 'Pendiente',
        total,
        items,
        createdAt: new Date().toISOString(),
        deliveryType: deliveryType === 'pickup' ? 'Retiro en sucursal' : 'Envio a obra',
        branch,
        shippingCost: Number(shippingCost) || 0,
        billingName,
        taxId,
        notes,
        adminNotes: '',
        stockDiscounted: shouldAutoApprove,
        pointsGranted: false,
        lifetimePointsGranted: false,
        history: [
          {
            id: `ORD-${Date.now()}-created`,
            action: 'Pedido generado',
            actor: client.businessName,
            createdAt: new Date().toISOString(),
          },
          ...(shouldAutoApprove
            ? [
                {
                  id: `ORD-${Date.now()}-approved`,
                  action: 'Aprobado',
                  actor: 'Sistema',
                  createdAt: new Date().toISOString(),
                },
              ]
            : []),
        ],
      }

      return {
        ...current,
        products: shouldAutoApprove
          ? applyOrderInventory(current.products, nextOrder, 'discount')
          : current.products,
        orders: [nextOrder, ...current.orders],
        clients: current.clients.map((entry) =>
          entry.id === clientId
            ? {
                ...entry,
                orderHistory: [orderId, ...entry.orderHistory],
              }
            : entry,
        ),
        auditLog: appendAuditEntry(current.auditLog, client.businessName, 'generó el pedido', orderId),
      }
    })

    // Push client order to server
    if (session?.token && session.role === 'client') {
      const orderToPush = {
        id: createdOrderId,
        clientId,
        status: 'Pendiente',
        total: 0, // Server re-calculates
        items,
        createdAt: new Date().toISOString(),
        deliveryType: deliveryType === 'pickup' ? 'Retiro en sucursal' : 'Envio a obra',
        branch,
        shippingCost: Number(shippingCost) || 0,
        billingName,
        taxId,
        notes,
        adminNotes: '',
        stockDiscounted: false,
        pointsGranted: false,
        lifetimePointsGranted: false,
      };
      
      fetch('/api/client/order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}` 
        },
        body: JSON.stringify({ order: orderToPush }),
      }).catch(err => console.error(err))
    }

    return createdOrderId
  }

  const openChat = (clientId, viewerRole) => {
    updateState((current) => {
      const timestamp = new Date().toISOString()

      return {
        ...current,
        chats: normalizeChats(current.clients, current.chats).map((chat) => {
          if (chat.clientId !== clientId) {
            return chat
          }

          return viewerRole === 'admin'
            ? {
                ...chat,
                adminLastSeenAt: timestamp,
                updatedAt: chat.updatedAt ?? timestamp,
              }
            : {
                ...chat,
                clientLastSeenAt: timestamp,
                lastClientActivityAt: timestamp,
                updatedAt: timestamp,
              }
        }),
      }
    })
  }

  const sendChatMessage = (clientId, senderRole, senderName, text, options = {}) => {
    const normalizedText = text.trim()
    const rawReference = options?.orderReference
    const normalizedOrderReference =
      rawReference && rawReference.orderId
        ? {
            orderId: rawReference.orderId,
            orderCode: rawReference.orderCode ?? rawReference.orderId,
            status: rawReference.status ?? 'Pendiente',
            total: Number(rawReference.total) || 0,
            createdAt: rawReference.createdAt ?? new Date().toISOString(),
          }
        : null

    if (!normalizedText && !normalizedOrderReference) {
      return
    }

    const timestamp = new Date().toISOString()
    const newMessage = {
      id: `CHAT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderRole,
      senderName,
      text:
        normalizedText ||
        (senderRole === 'admin'
          ? 'Te comparto este pedido para revisarlo.'
          : 'Te comparto este pedido para que lo revises.'),
      orderReference: normalizedOrderReference,
      createdAt: timestamp,
    }

    const generateNextChats = (currentClients, currentChats) => {
      return normalizeChats(currentClients, currentChats).map((chat) => {
        if (chat.clientId !== clientId) {
          return chat
        }

        return {
          ...chat,
          updatedAt: timestamp,
          adminLastSeenAt: senderRole === 'admin' ? timestamp : chat.adminLastSeenAt,
          clientLastSeenAt: senderRole === 'client' ? timestamp : chat.clientLastSeenAt,
          lastClientActivityAt: senderRole === 'client' ? timestamp : chat.lastClientActivityAt,
          lastAdminActivityAt: senderRole === 'admin' ? timestamp : chat.lastAdminActivityAt,
          adminTypingAt: senderRole === 'admin' ? null : chat.adminTypingAt,
          clientTypingAt: senderRole === 'client' ? null : chat.clientTypingAt,
          messages: [...chat.messages, newMessage],
        }
      })
    }

    updateState((current) => {
      const client = current.clients.find((entry) => entry.id === clientId)
      
      const nextNormalizedState = {
        ...current,
        chats: generateNextChats(current.clients, current.chats),
        auditLog:
          senderRole === 'admin' && client
            ? appendAuditEntry(current.auditLog, senderName, 'respondio el chat de', client.businessName)
            : current.auditLog,
      }

      return nextNormalizedState
    })

    // Sincronización con el servidor
    if (session?.token) {
        if (session.role === 'client') {
            isUpdatingRef.current = true;
            fetch('/api/client/chat', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.token}` 
                },
                body: JSON.stringify({ chats: generateNextChats(state.clients, state.chats) }),
            })
            .then(() => {
              setTimeout(() => { isUpdatingRef.current = false; }, 500);
            })
            .catch(err => {
              console.error(err);
              isUpdatingRef.current = false;
            });
        }
    }
  }

  const setChatTyping = (clientId, senderRole, isTyping) => {
    updateState((current) => ({
      ...current,
      chats: normalizeChats(current.clients, current.chats).map((chat) => {
        if (chat.clientId !== clientId) {
          return chat
        }

        return {
          ...chat,
          adminTypingAt:
            senderRole === 'admin'
              ? isTyping
                ? new Date().toISOString()
                : null
              : chat.adminTypingAt,
          clientTypingAt:
            senderRole === 'client'
              ? isTyping
                ? new Date().toISOString()
                : null
              : chat.clientTypingAt,
        }
      }),
    }))
  }

  const value = useMemo(
    () => ({
      ...state,
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
      updateCustomerStatus,
      approveOrder,
      changeOrderStatus,
      cancelOrder,
      approveRedemption,
      createOrder,
      openChat,
      sendChatMessage,
      setChatTyping,
    }),
    [state],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData debe usarse dentro de AppDataProvider')
  }

  return context
}
