# Nexoft — Plataforma mayorista para distribuidoras

Plataforma B2B white-label que se vende como software a empresas distribuidoras.
Cada cliente recibe una instancia configurada con su marca, paleta y catálogo.

## Stack

- **Frontend**: React 19 + Vite + React Router v7
- **Backend**: Express 5 (serverless en Vercel via `/api/index.js`)
- **DB**: PostgreSQL (Neon)
- **Auth**: JWT + bcryptjs
- **IA**: Cloudflare Workers AI (Llama 3.1)

## Cómo deployar para un nuevo cliente

### 1. Branding (1 archivo)

`src/lib/brandConfig.js` — todo lo customizable:

```js
export const BRAND = {
  name: 'Nexoft',                 // ← reemplazar con marca del cliente
  tagline: '...',
  description: '...',
  adminDashboardTitle: '...',
  demo: { enabled: false, ... },  // false en prod
  contact: { website: '...', email: '...' },
}
```

### 2. Colores (opcional)

`src/index.css` — variables CSS al inicio:

```css
--color-brand: #1A1FBE;       /* primario */
--color-accent: #FFD100;      /* accent */
--color-dark: #0C0D1A;        /* sidebar */
--color-border: #E8E9F8;
```

### 3. Database

- Crear DB Postgres (Neon recomendado) y obtener `connectionString`
- En Vercel → Environment Variables:
  - `POSTGRES_URL` (también soporta `ampdatabase_POSTGRES_URL`)
  - `JWT_SECRET`
  - `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (IA)

### 4. Deploy

`git push origin main` — Vercel se encarga del build y deploy.
Primera petición al backend ejecuta `initDB()` y crea tablas + usuarios demo.

## Estructura

```
src/
├── lib/
│   ├── brandConfig.js     ← branding customizable (single source of truth)
│   └── businessLogic.js   ← tiers, beneficios, seed, helpers
├── context/
│   ├── AuthContext.jsx
│   └── AppDataContext.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── AdminDashboard.jsx ← panel admin completo
│   └── ClientDashboard.jsx ← portal mayorista
├── components/
│   ├── NexoftLogo.jsx
│   ├── ChatAdmin.jsx
│   └── ChatCliente.jsx
└── App.css, index.css, chat.css

api/
└── index.js               ← backend Express completo
```

## Funcionalidades

### Panel admin (12 secciones)
- **Inicio** — KPIs (4 hero + 4 secundarios), gráfico de ventas, top clientes,
  estado de pedidos, atención requerida, historial de auditoría
- **Pedidos** — gestión completa con cambio de estado, notas internas
- **Cotizaciones** — flujo pre-venta con conversión a pedido y PDF
- **Facturación** — emisión A/B/C con numeración automática + impresión
- **Promociones** — campañas %/$/envío gratis, scope por tier o todos
- **Clientes** — ficha tabulada (Info / Pedidos / CC / Puntos)
- **Cobranzas** — aging buckets (0-30/31-60/61-90/90+ días)
- **Chats** — conversación por cliente
- **Productos y stock** — stock mínimo, ajustes, movimientos
- **Reportes** — top productos/clientes, KPIs por período (7/30/90/180d)
- **Asistente IA** — 15+ tools (lookup clientes, pedidos, ventas, forecast…)
- **Fidelización + Configuración + Roles**

Topbar global: búsqueda en clientes/productos/pedidos · notificaciones · perfil

### Portal cliente (10 secciones)
- **Inicio** — promos, recompras frecuentes, seguimiento último pedido
- **Catálogo** — navegación con filtros
- **Armar pedido** — carrito con descuentos por tier aplicados
- **Mis pedidos** — historial con recompra 1-click
- **Cotizaciones** — propuestas recibidas (aceptar/rechazar)
- **Cuenta corriente** — saldo, movimientos, direcciones de entrega
- **Beneficios** — descuentos activos + promos por tier
- **Mi cuenta + Asistente IA + Chat**

## Usuarios demo

Al inicializar la base fresh se crean automáticamente:
- `admin@demo.com` / `admin123`
- `cliente@demo.com` / `cliente123`

## Comandos

```bash
npm install
npm run dev      # local dev (vite)
npm run build    # producción
npm run lint
```

## Migración legacy

localStorage keys se migran automáticamente al cargar la app:
- `amp-reventa-session` → `nexoft-session`
- `amp-reventa-data` → `nexoft-data`
- `productos` → `nexoft-productos`

---

**Manual de Marca v1.0 · 2026**
