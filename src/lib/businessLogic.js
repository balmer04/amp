export const TIER_ORDER = ['Asociado', 'Socio', 'Preferencial', 'Estratégico']
export const LOYALTY_POINTS_RATIO = 1000
export const LEGACY_TIER_THRESHOLDS = {
  Asociado: 0,
  Socio: 3000,
  Preferencial: 10000,
  Estratégico: 20000,
}

export const ORDER_STATUS_OPTIONS = [
  'Pendiente',
  'Aprobado',
  'Preparando',
  'Despachado',
  'Cancelado',
]

export const DEFAULT_TIER_THRESHOLDS = {
  Asociado: 0,
  Socio: 2000,
  Preferencial: 10000,
  Estratégico: 50000,
}

export const DEFAULT_TIER_BENEFITS = {
  Asociado: [
    'Acceso al catalogo mayorista base',
    'Soporte comercial general',
    'Seguimiento operativo de pedidos',
  ],
  Socio: [
    'Descuentos escalonados por volumen',
    'Atencion comercial prioritaria',
    'Promociones exclusivas por marca',
  ],
  Preferencial: [
    'Condiciones comerciales mejoradas',
    'Bonificaciones especiales por categoria',
    'Acompañamiento de cuenta dedicado',
  ],
  Estratégico: [
    'Acuerdos preferenciales a medida',
    'Prioridad operativa y logistica',
    'Beneficios VIP en campañas clave',
  ],
}

export const PRODUCT_BENEFIT_CATEGORIES = [
  'Limpieza',
  'Ferreteria',
  'Higiene',
  'Almacen',
  'Papeleria',
  'General',
]

export const DEFAULT_TIER_BENEFIT_CONFIG = {
  Asociado: {
    shippingMode: 'none',
    shippingDiscountPercent: 0,
    categoryDiscounts: {
      Limpieza: 0,
      Ferreteria: 0,
      Higiene: 0,
      Almacen: 0,
      Papeleria: 0,
      General: 0,
    },
  },
  Socio: {
    shippingMode: 'discounted',
    shippingDiscountPercent: 25,
    categoryDiscounts: {
      Limpieza: 5,
      Ferreteria: 3,
      Higiene: 5,
      Almacen: 3,
      Papeleria: 0,
      General: 0,
    },
  },
  Preferencial: {
    shippingMode: 'discounted',
    shippingDiscountPercent: 60,
    categoryDiscounts: {
      Limpieza: 8,
      Ferreteria: 5,
      Higiene: 8,
      Almacen: 5,
      Papeleria: 3,
      General: 0,
    },
  },
  Estratégico: {
    shippingMode: 'free',
    shippingDiscountPercent: 100,
    categoryDiscounts: {
      Limpieza: 10,
      Ferreteria: 8,
      Higiene: 10,
      Almacen: 8,
      Papeleria: 5,
      General: 3,
    },
  },
}

export const DEFAULT_OPERATIONAL_SETTINGS = {
  manualOrderApproval: true,
  criticalStockAlerts: true,
  allowOrderStatusEditing: true,
}

export const DEFAULT_CLIENT_PANEL_SETTINGS = {
  showBenefitsCard: true,
  showCurrentOrderCard: true,
  enableRepeatLastOrder: true,
  enableChat: true,
}

export const DEFAULT_BRANDING_SETTINGS = {
  adminDashboardTitle: 'Panel operativo',
  clientHomeTitle: 'Promociones y oportunidades de la semana',
}

export const DEFAULT_CLIENTS = [
  {
    id: 1,
    email: 'cliente@demo.com',
    name: 'Cliente Demo',
    businessName: 'Autoservicio El Progreso',
    points: 6240,
    creditLimit: 350000,
    pendingBalance: 84200,
    orderHistory: ['PED-2015', 'PED-2014', 'PED-2012'],
    note: 'Llamar el martes para cerrar la reposicion mensual de limpieza.',
    phone: '+54 9 11 5487 2231',
    altPhone: '+54 9 11 5487 2239',
    taxId: '20-32456789-4',
    category: 'Ferreteria',
    address: 'Av. Belgrano 2450',
    city: 'Buenos Aires',
    province: 'Buenos Aires',
    status: 'Activo',
    createdAt: '2025-11-18T10:00:00-03:00',
    paymentTerms: '30 dias',
    specialDiscount: 5,
    priceList: 'Mayorista A',
    paymentHistory: [
      { id: 'PAY-1001', date: '2026-04-14T10:00:00-03:00', amount: 64000, method: 'Transferencia', reference: 'TRX-238817', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1001', type: 'Llamada', date: '2026-04-26T11:30:00-03:00', description: 'Se ofrecio promo de articulos de limpieza por volumen.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Centro',
  },
  {
    id: 2,
    email: 'supermercado.norte@demo.com',
    name: 'Supermercado Norte',
    businessName: 'Supermercado Norte S.R.L.',
    points: 11800,
    creditLimit: 520000,
    pendingBalance: 162000,
    orderHistory: ['PED-2011'],
    note: 'Cliente muy activo en higiene y limpieza. Paga a 15 dias.',
    phone: '+54 9 341 551 2871',
    altPhone: '+54 9 341 551 2873',
    taxId: '30-71234567-3',
    category: 'Ferreteria',
    address: 'Bv. Oroño 1280',
    city: 'Rosario',
    province: 'Santa Fe',
    status: 'Activo',
    createdAt: '2025-09-12T11:00:00-03:00',
    paymentTerms: '15 dias',
    specialDiscount: 8,
    priceList: 'Mayorista Premium',
    paymentHistory: [
      { id: 'PAY-1002', date: '2026-04-12T09:15:00-03:00', amount: 128000, method: 'Cheque', reference: 'CHQ-550192', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1002', type: 'Reunion', date: '2026-04-16T16:00:00-03:00', description: 'Se revisaron nuevas condiciones comerciales por volumen.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Norte',
  },
  {
    id: 3,
    email: 'kiosco.elvalle@demo.com',
    name: 'Kiosco El Valle',
    businessName: 'Kiosco El Valle',
    points: 980,
    creditLimit: 120000,
    pendingBalance: 0,
    orderHistory: ['PED-2013'],
    note: 'Revisar documentacion fiscal pendiente.',
    phone: '+54 9 261 445 0921',
    altPhone: '+54 9 261 445 0922',
    taxId: '20-28765432-1',
    category: 'Particular',
    address: 'Ruta 40 Km 11',
    city: 'Mendoza',
    province: 'Mendoza',
    status: 'Activo',
    createdAt: '2026-01-08T09:00:00-03:00',
    paymentTerms: '60 dias',
    specialDiscount: 0,
    priceList: 'Mayorista B',
    paymentHistory: [
      { id: 'PAY-1003', date: '2026-03-25T14:30:00-03:00', amount: 96400, method: 'Transferencia', reference: 'TRX-220981', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1003', type: 'Nota', date: '2026-04-15T09:00:00-03:00', description: 'Se envio seguimiento de documentacion fiscal.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Oeste',
  },
  {
    id: 4,
    email: 'distribuidora.rioja@demo.com',
    name: 'Distribuidora La Rioja',
    businessName: 'Distribuidora La Rioja S.A.',
    points: 24800,
    creditLimit: 760000,
    pendingBalance: 195000,
    orderHistory: [],
    note: 'Comprador de alto volumen. Priorizar atencion y renovar condiciones.',
    phone: '+54 9 11 6012 1182',
    altPhone: '+54 9 11 6012 1189',
    taxId: '30-70123456-9',
    category: 'Ferreteria',
    address: 'Av. Cabildo 3122',
    city: 'Buenos Aires',
    province: 'Buenos Aires',
    status: 'Activo',
    createdAt: '2025-07-04T15:00:00-03:00',
    paymentTerms: '30 dias',
    specialDiscount: 10,
    priceList: 'Estrategico VIP',
    paymentHistory: [
      { id: 'PAY-1004', date: '2026-04-04T12:20:00-03:00', amount: 210000, method: 'Transferencia', reference: 'TRX-218742', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1004', type: 'Llamada', date: '2026-03-21T10:10:00-03:00', description: 'Se ofrecio renovacion de condiciones por volumen anual.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Centro',
  },
  {
    id: 5,
    email: 'ferreteria.faro@demo.com',
    name: 'Ferreteria El Faro',
    businessName: 'Ferreteria El Faro',
    points: 2890,
    creditLimit: 180000,
    pendingBalance: 42000,
    orderHistory: [],
    note: 'Retomar contacto. Lleva 45 dias sin pedir.',
    phone: '+54 9 299 441 7801',
    altPhone: '+54 9 299 441 7802',
    taxId: '30-68999123-4',
    category: 'Ferreteria',
    address: 'Av. Mosconi 825',
    city: 'Neuquen',
    province: 'Neuquen',
    status: 'Inactivo',
    createdAt: '2026-03-25T12:00:00-03:00',
    paymentTerms: 'Contado',
    specialDiscount: 0,
    priceList: 'Mayorista A',
    paymentHistory: [],
    activityLog: [
      { id: 'ACT-1005', type: 'Nota', date: '2026-04-22T15:10:00-03:00', description: 'Hace 45 dias que no compra. Retomar contacto.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Sur',
  },
  {
    id: 6,
    email: 'particular.gomez@demo.com',
    name: 'Maria Gomez',
    businessName: 'Maria Gomez',
    points: 420,
    creditLimit: 0,
    pendingBalance: 0,
    orderHistory: [],
    note: 'Cliente ocasional. Consultar si quiere abrir cuenta mayorista.',
    phone: '+54 9 11 4040 2288',
    altPhone: '',
    taxId: '27-30111222-8',
    category: 'Particular',
    address: 'Cochabamba 410',
    city: 'Buenos Aires',
    province: 'Buenos Aires',
    status: 'Activo',
    createdAt: '2026-03-14T17:00:00-03:00',
    paymentTerms: 'Contado',
    specialDiscount: 0,
    priceList: 'Mostrador',
    paymentHistory: [
      { id: 'PAY-1006', date: '2026-03-16T18:05:00-03:00', amount: 18400, method: 'Efectivo', reference: 'CAJA-332', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1006', type: 'Nota', date: '2026-03-16T18:15:00-03:00', description: 'Cliente ocasional. Compro articulos de higiene y limpieza.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Centro',
  },
  {
    id: 7,
    email: 'almacen.centro@demo.com',
    name: 'Almacen del Centro',
    businessName: 'Almacen del Centro',
    points: 9050,
    creditLimit: 410000,
    pendingBalance: 218000,
    orderHistory: [],
    note: 'Bloqueado hasta regularizar saldo pendiente.',
    phone: '+54 9 351 500 1000',
    altPhone: '+54 9 351 500 1001',
    taxId: '30-72223334-5',
    category: 'Ferreteria',
    address: 'Colon 1880',
    city: 'Cordoba',
    province: 'Cordoba',
    status: 'Bloqueado',
    createdAt: '2025-10-22T10:00:00-03:00',
    paymentTerms: '30 dias',
    specialDiscount: 4,
    priceList: 'Mayorista A',
    paymentHistory: [
      { id: 'PAY-1007', date: '2026-02-28T13:45:00-03:00', amount: 92000, method: 'Cheque', reference: 'CHQ-552900', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1007', type: 'Llamada', date: '2026-04-30T09:50:00-03:00', description: 'Se aviso bloqueo preventivo por saldo vencido.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Cordoba',
  },
  {
    id: 8,
    email: 'mayorista.roca@demo.com',
    name: 'Mayorista Roca',
    businessName: 'Mayorista Roca S.R.L.',
    points: 15800,
    creditLimit: 900000,
    pendingBalance: 0,
    orderHistory: [],
    note: 'Cliente estable con compras trimestrales grandes.',
    phone: '+54 9 381 600 3311',
    altPhone: '+54 9 381 600 3322',
    taxId: '30-74555666-2',
    category: 'Ferreteria',
    address: 'Ruta 9 Km 1290',
    city: 'Tucuman',
    province: 'Tucuman',
    status: 'Activo',
    createdAt: '2026-02-03T08:30:00-03:00',
    paymentTerms: '60 dias',
    specialDiscount: 6,
    priceList: 'Mayorista Premium',
    paymentHistory: [
      { id: 'PAY-1008', date: '2026-03-08T11:00:00-03:00', amount: 175000, method: 'Transferencia', reference: 'TRX-219004', registeredBy: 'Admin Demo' },
    ],
    activityLog: [
      { id: 'ACT-1008', type: 'Reunion', date: '2026-03-19T17:00:00-03:00', description: 'Se planifico reposicion trimestral de todas las lineas.', user: 'Admin Demo' },
    ],
    preferredBranch: 'Sucursal Norte',
  },
]

export const DEFAULT_PRODUCTS = [
  // ── Limpieza ────────────────────────────────
  {
    id: 1,
    category: 'Limpieza',
    code: 'LMP',
    sku: 'LMP-LAV-5L',
    brand: 'Ayudin',
    name: 'Lavandina Concentrada',
    detail: 'Bidón 5 lts',
    currentStock: 480,
    price: 3200,
    oldPrice: null,
    note: '',
    accent: 'soft-mint',
    badge: null,
  },
  {
    id: 2,
    category: 'Limpieza',
    code: 'LMP',
    sku: 'LMP-DET-3K',
    brand: 'Skip',
    name: 'Detergente en Polvo',
    detail: 'Bolsa 3 kg',
    currentStock: 320,
    price: 4800,
    oldPrice: 5200,
    note: 'Precio con tu nivel Socio 8%',
    accent: 'product-clean',
    badge: 'Socio',
  },
  {
    id: 3,
    category: 'Limpieza',
    code: 'LMP',
    sku: 'LMP-DES-1L',
    brand: 'Procenex',
    name: 'Desinfectante Multiuso',
    detail: 'Botella 1 lt',
    currentStock: 600,
    price: 1850,
    oldPrice: null,
    note: '',
    accent: 'soft-ice',
    badge: null,
  },
  // ── Higiene ─────────────────────────────────
  {
    id: 4,
    category: 'Higiene',
    code: 'HIG',
    sku: 'HIG-JAB-120',
    brand: 'Palmolive',
    name: 'Jabon Tocador',
    detail: 'Caja x 12 unidades 120g',
    currentStock: 900,
    price: 5400,
    oldPrice: null,
    note: '',
    accent: 'soft-rose',
    badge: null,
  },
  {
    id: 5,
    category: 'Higiene',
    code: 'HIG',
    sku: 'HIG-PAP-48',
    brand: 'Elite',
    name: 'Papel Higienico Doble Hoja',
    detail: 'Pack x 48 rollos',
    currentStock: 250,
    price: 18900,
    oldPrice: 20500,
    note: 'Precio con tu nivel Socio 8%',
    accent: 'product-clean',
    badge: 'Socio',
  },
  {
    id: 6,
    category: 'Higiene',
    code: 'HIG',
    sku: 'HIG-SHA-750',
    brand: 'Head & Shoulders',
    name: 'Shampoo Anticaspa',
    detail: 'Botella 750 ml',
    currentStock: 420,
    price: 3100,
    oldPrice: null,
    note: '',
    accent: 'soft-lilac',
    badge: null,
  },
  // ── Ferretería ──────────────────────────────
  {
    id: 7,
    category: 'Ferreteria',
    code: 'FER',
    sku: 'FER-CIN-48',
    brand: 'Tesa',
    name: 'Cinta Adhesiva Transparente',
    detail: 'Caja x 48 rollos 48mm',
    currentStock: 180,
    price: 9600,
    oldPrice: null,
    note: '',
    accent: 'soft-ice',
    badge: null,
  },
  {
    id: 8,
    category: 'Ferreteria',
    code: 'FER',
    sku: 'FER-PIL-AA',
    brand: 'Duracell',
    name: 'Pilas AA Alcalinas',
    detail: 'Pack x 24 unidades',
    currentStock: 550,
    price: 7200,
    oldPrice: 7800,
    note: 'Precio con tu nivel Socio 8%',
    accent: 'product-clean',
    badge: 'Socio',
  },
  {
    id: 9,
    category: 'Ferreteria',
    code: 'FER',
    sku: 'FER-BOL-80',
    brand: 'Genérico',
    name: 'Bolsas Residuos Negras',
    detail: 'Pack x 80 unidades 60x90',
    currentStock: 800,
    price: 2400,
    oldPrice: null,
    note: '',
    accent: 'soft-mint',
    badge: null,
  },
  // ── Almacén ─────────────────────────────────
  {
    id: 10,
    category: 'Almacen',
    code: 'ALM',
    sku: 'ALM-ACE-900',
    brand: 'Cocinero',
    name: 'Aceite de Girasol',
    detail: 'Caja x 12 botellas 900 ml',
    currentStock: 360,
    price: 28800,
    oldPrice: null,
    note: '',
    accent: 'soft-rose',
    badge: null,
  },
  {
    id: 11,
    category: 'Almacen',
    code: 'ALM',
    sku: 'ALM-AZU-1K',
    brand: 'Ledesma',
    name: 'Azucar Blanca',
    detail: 'Caja x 12 paquetes 1 kg',
    currentStock: 500,
    price: 18000,
    oldPrice: 19500,
    note: 'Precio con tu nivel Socio 8%',
    accent: 'product-clean',
    badge: 'Socio',
  },
  {
    id: 12,
    category: 'Almacen',
    code: 'ALM',
    sku: 'ALM-HAR-1K',
    brand: 'Pureza',
    name: 'Harina de Trigo 000',
    detail: 'Bolsa 25 kg',
    currentStock: 200,
    price: 22500,
    oldPrice: null,
    note: '',
    accent: 'soft-ice',
    badge: null,
  },
  // ── Papelería ───────────────────────────────
  {
    id: 13,
    category: 'Papeleria',
    code: 'PAP',
    sku: 'PAP-RES-A4',
    brand: 'Navigator',
    name: 'Resma Papel A4 75gr',
    detail: 'Caja x 5 resmas 500 hojas',
    currentStock: 300,
    price: 16500,
    oldPrice: null,
    note: '',
    accent: 'soft-lilac',
    badge: null,
  },
  {
    id: 14,
    category: 'Papeleria',
    code: 'PAP',
    sku: 'PAP-MAR-12',
    brand: 'Faber-Castell',
    name: 'Marcadores Permanentes',
    detail: 'Caja x 12 unidades surtidos',
    currentStock: 450,
    price: 4200,
    oldPrice: 4600,
    note: 'Precio con tu nivel Socio 8%',
    accent: 'product-clean',
    badge: 'Socio',
  },
  {
    id: 15,
    category: 'Papeleria',
    code: 'PAP',
    sku: 'PAP-CAR-50',
    brand: 'Genérico',
    name: 'Cajas de Carton Corrugado',
    detail: 'Pack x 50 unidades 40x30x25',
    currentStock: 180,
    price: 31000,
    oldPrice: null,
    note: '',
    accent: 'soft-mint',
    badge: null,
  },
]

export const DEFAULT_ORDERS = [
  {
    id: 'PED-2015',
    clientId: 1,
    status: 'Pendiente',
    total: 142400,
    items: [
      { productId: 1, qty: 10 },
      { productId: 5, qty: 4 },
    ],
    createdAt: '2026-05-12T09:12:00-03:00',
    deliveryType: 'Retiro en sucursal',
    branch: 'Sucursal Centro',
    billingName: 'Autoservicio El Progreso',
    taxId: '20-32456789-4',
    notes: 'Retirar despues de las 16 hs.',
    adminNotes: 'Confirmar pago antes de liberar mercaderia.',
    stockDiscounted: false,
    pointsGranted: false,
    lifetimePointsGranted: false,
    history: [{ id: 'H-001', action: 'Pedido generado', actor: 'Autoservicio El Progreso', createdAt: '2026-05-12T09:12:00-03:00' }],
  },
  {
    id: 'PED-2014',
    clientId: 1,
    status: 'Preparando',
    total: 87600,
    items: [
      { productId: 2, qty: 8 },
      { productId: 9, qty: 15 },
    ],
    createdAt: '2026-05-09T14:20:00-03:00',
    deliveryType: 'Envio a domicilio',
    branch: 'Sucursal Centro',
    billingName: 'Autoservicio El Progreso',
    taxId: '20-32456789-4',
    notes: 'Enviar con remito por separado.',
    adminNotes: 'Pedido aprobado, en preparacion.',
    stockDiscounted: true,
    pointsGranted: true,
    lifetimePointsGranted: false,
    history: [
      { id: 'H-002', action: 'Pedido generado', actor: 'Autoservicio El Progreso', createdAt: '2026-05-09T14:20:00-03:00' },
      { id: 'H-003', action: 'Aprobado', actor: 'Admin Demo', createdAt: '2026-05-09T15:00:00-03:00' },
      { id: 'H-004', action: 'Preparando', actor: 'Admin Demo', createdAt: '2026-05-10T09:00:00-03:00' },
    ],
  },
  {
    id: 'PED-2013',
    clientId: 3,
    status: 'Despachado',
    total: 96300,
    items: [
      { productId: 10, qty: 2 },
      { productId: 13, qty: 3 },
    ],
    createdAt: '2026-05-05T10:05:00-03:00',
    deliveryType: 'Envio a domicilio',
    branch: 'Sucursal Oeste',
    billingName: 'Kiosco El Valle',
    taxId: '20-28765432-1',
    notes: 'Coordinar descarga con encargado.',
    adminNotes: 'Salio con transporte propio a primera hora.',
    stockDiscounted: true,
    pointsGranted: true,
    lifetimePointsGranted: true,
    history: [
      { id: 'H-005', action: 'Pedido generado', actor: 'Kiosco El Valle', createdAt: '2026-05-05T10:05:00-03:00' },
      { id: 'H-006', action: 'Aprobado', actor: 'Admin Demo', createdAt: '2026-05-05T11:00:00-03:00' },
      { id: 'H-007', action: 'Despachado', actor: 'Admin Demo', createdAt: '2026-05-06T08:00:00-03:00' },
    ],
  },
  {
    id: 'PED-2012',
    clientId: 1,
    status: 'Cancelado',
    total: 58300,
    items: [
      { productId: 4, qty: 5 },
      { productId: 7, qty: 3 },
    ],
    createdAt: '2026-04-30T17:15:00-03:00',
    deliveryType: 'Retiro en sucursal',
    branch: 'Sucursal Centro',
    billingName: 'Autoservicio El Progreso',
    taxId: '20-32456789-4',
    notes: 'Cancelar si no llega el stock.',
    adminNotes: 'Cancelado por falta de stock confirmado.',
    stockDiscounted: false,
    pointsGranted: false,
    lifetimePointsGranted: false,
    history: [
      { id: 'H-008', action: 'Pedido generado', actor: 'Autoservicio El Progreso', createdAt: '2026-04-30T17:15:00-03:00' },
      { id: 'H-009', action: 'Cancelado', actor: 'Admin Demo', createdAt: '2026-05-01T09:00:00-03:00' },
    ],
  },
  {
    id: 'PED-2011',
    clientId: 2,
    status: 'Aprobado',
    total: 287400,
    items: [
      { productId: 2, qty: 20 },
      { productId: 5, qty: 8 },
      { productId: 11, qty: 12 },
    ],
    createdAt: '2026-04-30T11:30:00-03:00',
    deliveryType: 'Envio a domicilio',
    branch: 'Sucursal Norte',
    billingName: 'Supermercado Norte S.R.L.',
    taxId: '30-71234567-3',
    notes: 'Entregar por la manana.',
    adminNotes: 'Pago recibido y orden liberada al deposito.',
    stockDiscounted: true,
    pointsGranted: true,
    lifetimePointsGranted: false,
    history: [
      { id: 'H-010', action: 'Pedido generado', actor: 'Supermercado Norte S.R.L.', createdAt: '2026-04-30T11:30:00-03:00' },
      { id: 'H-011', action: 'Aprobado', actor: 'Admin Demo', createdAt: '2026-04-30T12:00:00-03:00' },
    ],
  },
]

export const DEFAULT_REDEMPTIONS = [
  {
    id: 'CAN-109',
    clientId: 1,
    reward: '10% en rodillos',
    points: 1200,
    createdAt: '2026-05-09T16:25:00-03:00',
  },
  {
    id: 'CAN-108',
    clientId: 3,
    reward: '5% en impermeabilizantes',
    points: 800,
    createdAt: '2026-04-30T09:10:00-03:00',
  },
]

export const DEFAULT_SETTINGS = {
  tierThresholds: DEFAULT_TIER_THRESHOLDS,
  tierBenefits: DEFAULT_TIER_BENEFITS,
  tierBenefitConfig: DEFAULT_TIER_BENEFIT_CONFIG,
  pointsRatio: LOYALTY_POINTS_RATIO,
  pointsAccrualEvent: 'Despachado',
  operational: DEFAULT_OPERATIONAL_SETTINGS,
  clientPanel: DEFAULT_CLIENT_PANEL_SETTINGS,
  branding: DEFAULT_BRANDING_SETTINGS,
}

export function migrateTierThresholds(rawThresholds) {
  if (!rawThresholds) {
    return DEFAULT_TIER_THRESHOLDS
  }

  const looksLikeLegacyDefaults =
    Number(rawThresholds.Asociado) === LEGACY_TIER_THRESHOLDS.Asociado &&
    Number(rawThresholds.Socio) === LEGACY_TIER_THRESHOLDS.Socio &&
    Number(rawThresholds.Preferencial) === LEGACY_TIER_THRESHOLDS.Preferencial &&
    Number(rawThresholds.Estratégico) === LEGACY_TIER_THRESHOLDS.Estratégico

  if (looksLikeLegacyDefaults) {
    return DEFAULT_TIER_THRESHOLDS
  }

  return {
    ...DEFAULT_TIER_THRESHOLDS,
    ...rawThresholds,
  }
}

export function migrateTierBenefits(rawBenefits) {
  if (!rawBenefits) {
    return DEFAULT_TIER_BENEFITS
  }

  return Object.fromEntries(
    TIER_ORDER.map((tierName) => {
      const incoming = rawBenefits[tierName]
      const nextBenefits = Array.isArray(incoming)
        ? incoming.filter((item) => String(item ?? '').trim() !== '').map((item) => String(item).trim())
        : []

      return [tierName, nextBenefits.length > 0 ? nextBenefits : DEFAULT_TIER_BENEFITS[tierName]]
    }),
  )
}

export function migrateTierBenefitConfig(rawConfig) {
  if (!rawConfig) {
    return DEFAULT_TIER_BENEFIT_CONFIG
  }

  return Object.fromEntries(
    TIER_ORDER.map((tierName) => {
      const incoming = rawConfig[tierName] ?? {}
      const incomingDiscounts = incoming.categoryDiscounts ?? {}

      return [
        tierName,
        {
          shippingMode: ['none', 'discounted', 'free'].includes(incoming.shippingMode)
            ? incoming.shippingMode
            : DEFAULT_TIER_BENEFIT_CONFIG[tierName].shippingMode,
          shippingDiscountPercent: Math.max(
            0,
            Math.min(
              100,
              Number(
                incoming.shippingDiscountPercent ??
                  DEFAULT_TIER_BENEFIT_CONFIG[tierName].shippingDiscountPercent,
              ) || 0,
            ),
          ),
          categoryDiscounts: Object.fromEntries(
            PRODUCT_BENEFIT_CATEGORIES.map((category) => [
              category,
              Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    incomingDiscounts[category] ??
                      DEFAULT_TIER_BENEFIT_CONFIG[tierName].categoryDiscounts[category],
                  ) || 0,
                ),
              ),
            ]),
          ),
        },
      ]
    }),
  )
}

export function getTierBenefitConfig(settings, tierName) {
  return settings?.tierBenefitConfig?.[tierName] ?? DEFAULT_TIER_BENEFIT_CONFIG[tierName]
}

export function getProductDiscountPercent(product, tierName, settings) {
  const config = getTierBenefitConfig(settings, tierName)
  const category = product?.category ?? 'General'

  return Number(
    config.categoryDiscounts?.[category] ??
      config.categoryDiscounts?.General ??
      0,
  )
}

export function getDiscountedProductPrice(product, tierName, settings) {
  const basePrice = Number(product?.price ?? 0)
  const discountPercent = getProductDiscountPercent(product, tierName, settings)

  return Math.max(Math.round(basePrice * (1 - discountPercent / 100)), 0)
}

export function calculateShippingCost(baseCost, tierName, settings) {
  const config = getTierBenefitConfig(settings, tierName)
  const normalizedBaseCost = Number(baseCost) || 0

  if (config.shippingMode === 'free') {
    return 0
  }

  if (config.shippingMode === 'discounted') {
    return Math.max(
      Math.round(normalizedBaseCost * (1 - Number(config.shippingDiscountPercent || 0) / 100)),
      0,
    )
  }

  return normalizedBaseCost
}

export function getTierBenefitSummary(tierName, settings) {
  const config = getTierBenefitConfig(settings, tierName)

  return {
    shippingMode: config.shippingMode,
    shippingDiscountPercent: Number(config.shippingDiscountPercent || 0),
    categoryDiscounts: PRODUCT_BENEFIT_CATEGORIES.map((category) => ({
      category,
      percent: Number(config.categoryDiscounts?.[category] ?? 0),
    })),
  }
}

export const DEFAULT_AUDIT_LOG = [
  {
    id: 'LOG-1',
    message:
      "Admin Demo aprobó el pedido 'PED-2011' y actualizó stock el 27 de marzo de 2026.",
    createdAt: '2026-04-30T11:35:00-03:00',
  },
]

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function getTierSteps(thresholds = DEFAULT_TIER_THRESHOLDS) {
  return TIER_ORDER.map((name) => ({
    key: name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-'),
    name,
    minPoints: Number(thresholds[name] ?? 0),
    theme: name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-'),
  })).sort((a, b) => a.minPoints - b.minPoints)
}

export function getTierByPoints(points, thresholds = DEFAULT_TIER_THRESHOLDS) {
  const steps = getTierSteps(thresholds)
  return steps.findLast((tier) => points >= tier.minPoints) ?? steps[0]
}

export function getLoyaltyStatus(points, thresholds = DEFAULT_TIER_THRESHOLDS) {
  const tiers = getTierSteps(thresholds)
  const currentTier = getTierByPoints(points, thresholds)
  const currentIndex = tiers.findIndex((tier) => tier.name === currentTier.name)
  const nextTier = tiers[currentIndex + 1] ?? null
  const previousMin = currentTier.minPoints
  const nextMin = nextTier ? nextTier.minPoints : currentTier.minPoints
  const progress = nextTier
    ? ((points - previousMin) / Math.max(nextMin - previousMin, 1)) * 100
    : 100

  return {
    tiers,
    currentTier,
    nextTier,
    points,
    pointsToNext: nextTier ? Math.max(nextMin - points, 0) : 0,
    progress: Math.max(0, Math.min(progress, 100)),
  }
}

export function getStockMeta(stock) {
  if (stock <= 0) return { label: 'Sin stock', tone: 'danger' }
  if (stock < 10) return { label: 'Poca existencia', tone: 'warning' }
  return { label: 'Mucha existencia', tone: 'success' }
}

export function getLatestOrderStatusMeta(status) {
  switch (status) {
    case 'Pendiente':
      return {
        pill: 'Pendiente',
        tone: 'neutral',
        title: 'Tu pedido esta pendiente de aprobacion.',
        detail: 'En cuanto lo valide el equipo, pasa al circuito operativo.',
      }
    case 'Aprobado':
      return {
        pill: 'Aprobado',
        tone: 'info',
        title: 'Tu pedido fue aprobado correctamente.',
        detail: 'El stock ya quedo reservado para esta operacion.',
      }
    case 'Preparando':
      return {
        pill: 'Preparando',
        tone: 'preparing',
        title: 'Tu pedido esta siendo preparado.',
        detail: 'El deposito ya esta preparando los productos seleccionados.',
      }
    case 'Despachado':
      return {
        pill: 'Despachado',
        tone: 'shipping',
        title: 'Tu pedido fue despachado.',
        detail: 'El transporte ya retiro la mercaderia y va rumbo a destino.',
      }
    case 'Cancelado':
      return {
        pill: 'Cancelado',
        tone: 'danger',
        title: 'El pedido fue cancelado.',
        detail: 'Si necesitas rehacerlo, podemos generarlo nuevamente.',
      }
    default:
      return {
        pill: 'Sin actualizacion',
        tone: 'neutral',
        title: 'Todavia no hay movimientos recientes.',
        detail: 'Apenas tengamos novedades vas a verlas reflejadas aca.',
      }
  }
}

export function buildOrderRows(items, products, tierName = null, settings = null) {
  return items
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId)

      if (!product) {
        return null
      }

      const discountedUnitPrice =
        tierName && settings
          ? getDiscountedProductPrice(product, tierName, settings)
          : product.price

      return {
        productId: item.productId,
        name: product.name,
        sku: product.sku,
        qty: item.qty,
        unitPriceValue: discountedUnitPrice,
        unitPrice: formatCurrency(discountedUnitPrice),
        totalValue: discountedUnitPrice * item.qty,
        baseUnitPriceValue: product.price,
        baseUnitPrice: formatCurrency(product.price),
        discountPercent:
          tierName && settings ? getProductDiscountPercent(product, tierName, settings) : 0,
      }
    })
    .filter(Boolean)
}

export function buildOrderHistoryFallback(order) {
  const entries = [
    {
      id: `${order.id}-created`,
      action: 'Pedido generado',
      actor: order.billingName || 'Cliente',
      createdAt: order.createdAt,
    },
  ]

  if (order.status === 'Aprobado' || order.status === 'Preparando' || order.status === 'Despachado') {
    entries.push({
      id: `${order.id}-approved`,
      action: 'Aprobado',
      actor: 'Admin Demo',
      createdAt: order.createdAt,
    })
  }

  if (order.status === 'Preparando' || order.status === 'Despachado') {
    entries.push({
      id: `${order.id}-preparing`,
      action: 'En preparacion',
      actor: 'Admin Demo',
      createdAt: order.createdAt,
    })
  }

  if (order.status === 'Despachado') {
    entries.push({
      id: `${order.id}-shipped`,
      action: 'Despachado',
      actor: 'Admin Demo',
      createdAt: order.createdAt,
    })
  }

  if (order.status === 'Cancelado') {
    entries.push({
      id: `${order.id}-cancelled`,
      action: 'Cancelado',
      actor: 'Admin Demo',
      createdAt: order.createdAt,
    })
  }

  return entries
}

export function calculateOrderTotal(items, products, tierName = null, settings = null) {
  return items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId)
    if (!product) {
      return sum
    }

    const unitPrice =
      tierName && settings ? getDiscountedProductPrice(product, tierName, settings) : product.price

    return sum + unitPrice * item.qty
  }, 0)
}

export function calculateLifetimePointsFromSpend(totalSpend, ratio = LOYALTY_POINTS_RATIO) {
  return Math.max(Math.floor((Number(totalSpend) || 0) / ratio), 0)
}

export function getClientOrderIdsForMigration(client, orders) {
  const explicitOrderIds = Array.isArray(client.orderHistory) ? client.orderHistory : []
  const linkedOrderIds = orders
    .filter((order) => order.clientId === client.id)
    .map((order) => order.id)

  return [...new Set([...explicitOrderIds, ...linkedOrderIds])]
}

export function migrateLegacyClientsToPointsModel(clients, orders) {
  return clients.map((client) => {
    const orderIds = getClientOrderIdsForMigration(client, orders)
    const totalSpend = orderIds.reduce((sum, orderId) => {
      const order = orders.find((entry) => entry.id === orderId)
      return sum + (Number(order?.total) || 0)
    }, 0)
    const migratedPoints = calculateLifetimePointsFromSpend(totalSpend)

    return {
      ...client,
      orderHistory: orderIds,
      lifetime_points: migratedPoints,
      available_points: migratedPoints,
      tier: getTierByPoints(migratedPoints).name,
      points: migratedPoints,
    }
  })
}

export function calculatePointsFromTotal(total) {
  return calculateLifetimePointsFromSpend(total)
}

export function buildQuantityMap(items) {
  return items.reduce((acc, item) => {
    acc[item.productId] = item.qty
    return acc
  }, {})
}

export function getLastOrderPreset(orders) {
  const latestWithItems = [...orders].find((order) => order.items.length > 0)
  return latestWithItems ? latestWithItems.items : []
}

export function generateOrderId(orders) {
  const numericIds = orders
    .map((order) => Number(order.id.replace('PED-', '')))
    .filter((value) => !Number.isNaN(value))
  const nextId = (numericIds.length > 0 ? Math.max(...numericIds) : 2015) + 1
  return `PED-${String(nextId).padStart(4, '0')}`
}

export function createAuditMessage(actorName, action, subject, date = new Date()) {
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  return `${actorName} ${action} '${subject}' el ${formattedDate}.`
}
