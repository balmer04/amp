import express from 'express';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { SYSTEM_PROMPT_ADMIN, SYSTEM_PROMPT_CLIENTE } from '../shared/aiPrompts.js';

// Evita que Node.js rechace el certificado de Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

// Vercel inyecta automÃ¡ticamente esta variable si enlazaste Supabase
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'secret_de_rescate_temporal';

let dbInitialized = false;

// Inicializa las tablas de Postgres la primera vez que se despierte el serverless function
async function initDB() {
  if (dbInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT
    );
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      state_json TEXT
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(rows[0].count, 10) === 0) {
    const hashedClient = bcrypt.hashSync('cliente123', 8);
    const hashedAdmin = bcrypt.hashSync('admin123', 8);
    await pool.query('INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4)', ['cliente@amprev.com', hashedClient, 'client', 'Cliente Demo']);
    await pool.query('INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4)', ['admin@amprev.com', hashedAdmin, 'admin', 'Administrador Demo']);
  }
  dbInitialized = true;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ ok: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Require Admin role' });
  }
  next();
}

app.post('/api/auth/login', async (req, res) => {
  try {
    await initDB();
    const { email, password } = req.body;

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ ok: false, message: 'Credenciales invÃ¡lidas.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ ok: true, token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ ok: false, message: 'Error interno en el login: ' + (error.message || "Unknown error") });
  }
});

app.get('/api/state', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
    if (rows.length > 0) {
      res.json({ ok: true, state: JSON.parse(rows[0].state_json) });
    } else {
      res.json({ ok: true, state: null });
    }
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error consultando el estado' });
  }
});

app.post('/api/state', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const stateJson = JSON.stringify(req.body.state);
    const { rows } = await pool.query('SELECT id FROM app_state WHERE id = 1');

    if (rows.length > 0) {
      await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [stateJson]);
    } else {
      await pool.query('INSERT INTO app_state (id, state_json) VALUES (1, $1)', [stateJson]);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error guardando el estado' });
  }
});

app.post('/api/client/order', authenticateToken, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can use this endpoint' });
  try {
    await initDB();
    const { order } = req.body;
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ error: 'Invalid order payload' });
    }

    const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
    if (rows.length === 0) return res.status(500).json({ error: 'No state found' });
    const currentState = JSON.parse(rows[0].state_json);

    let recalculatedTotal = 0;
    for (const item of order.items) {
      const product = currentState.products.find(p => p.id === item.productId);
      if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
      if (!item.qty || item.qty < 1) return res.status(400).json({ error: 'Invalid qty' });
      recalculatedTotal += product.price * item.qty;
    }
    recalculatedTotal += Number(order.shippingCost) || 0;

    order.status = 'Pendiente';
    order.total = recalculatedTotal;

    currentState.orders = [order, ...currentState.orders];
    await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [JSON.stringify(currentState)]);

    res.json({ ok: true, state: currentState });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/client/chat', authenticateToken, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can use this endpoint' });
  try {
    await initDB();
    const { chats } = req.body;
    if (!Array.isArray(chats)) return res.status(400).json({ error: 'Invalid chats payload' });

    const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
    if (rows.length === 0) return res.status(500).json({ error: 'No state found' });

    let currentState = JSON.parse(rows[0].state_json);
    const userClient = currentState.clients.find(c => c.email === req.user.email);
    if (!userClient) return res.status(403).json({ error: 'Client not found' });

    const incomingOwnChat = chats.find(c => c.clientId === userClient.id);
    if (incomingOwnChat) {
      if (!currentState.chats) currentState.chats = [];
      const chatIndex = currentState.chats.findIndex(chat => chat.clientId === userClient.id);
      if (chatIndex !== -1) {
        currentState.chats[chatIndex] = incomingOwnChat;
      } else {
        currentState.chats.push(incomingOwnChat);
      }
    }
    await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [JSON.stringify(currentState)]);
    res.json({ ok: true, state: currentState });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/analyze-client', authenticateToken, requireAdmin, async (req, res) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return res.status(500).json({ ok: false, error: 'Cloudflare no estÃ¡ configurado.' });

  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ ok: false, error: 'Missing clientId' });

  try {
    await initDB();
    const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
    if (rows.length === 0) return res.status(500).json({ ok: false, error: 'DB empty' });
    const state = JSON.parse(rows[0].state_json);

    const client = state.clients.find(c => c.id === clientId);
    if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });

    const clientOrders = state.orders.filter(o => o.clientId === clientId);
    const totalSpent = clientOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const daysWithoutBuying = client.lastPurchase
      ? Math.floor((Date.now() - new Date(client.lastPurchase.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 'Nunca comprÃ³';

    const systemPrompt = `Eres el ASISTENTE OPERATIVO de AndrÃ©s Merino PinturerÃ­a. Tu tarea es analizar los datos de un cliente y generar una recomendaciÃ³n comercial corta y directa (mÃ¡ximo 3 oraciones). No saludes, ve directamente a las observaciones.`;
    const prompt = `Analiza este cliente: Nombre: ${client.businessName}. Saldo pendiente: $${client.pendingBalance ?? 0}. Cantidad de pedidos: ${clientOrders.length}. Total gastado histÃ³rico: $${totalSpent}. DÃ­as desde su Ãºltima compra: ${daysWithoutBuying}. Genera tu recomendaciÃ³n comercial.`;

    const model = '@cf/meta/llama-3.1-8b-instruct';
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] })
    });

    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'Error AI Server' });
    const data = await response.json();
    res.json({ ok: true, recommendation: data.result.response || data.result });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error al generar anÃ¡lisis.' });
  }
});

// â”€â”€ CONFIGURACIÃ“N DE IA CON HERRAMIENTAS DIRECTAS A POSTGRES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ADMIN_TOOLS = [
  {
    name: "update_client_status",
    description: "Cambia el estado de un cliente (ej. Activo, Inactivo, Bloqueado).",
    parameters: {
      type: "object",
      properties: { customerId: { type: "integer" }, status: { type: "string" } },
      required: ["customerId", "status"]
    }
  },
  { name: "get_stock_alerts", description: "Consulta productos con stock critico (bajo).", parameters: { type: "object", properties: {} } },
  {
    name: "get_inactive_clients",
    description: "Busca clientes que no compraron en los ultimos N dias.",
    parameters: { type: "object", properties: { days_without_purchase: { type: "integer" } } }
  },
  {
    name: "suggest_commercial_actions",
    description: "Sugiere acciones comerciales concretas para clientes inactivos segun dias sin compra, saldo pendiente e historial.",
    parameters: { type: "object", properties: { days_without_purchase: { type: "integer" } } }
  },
  {
    name: "get_inventory_snapshot",
    description: "Devuelve una vista rapida del stock actual, incluyendo productos criticos, bajos y con mayor stock.",
    parameters: { type: "object", properties: { limit: { type: "integer" } } }
  },
  {
    name: "get_month_sales_summary",
    description: "Resume ventas de un mes especifico. months_ago 0 es el mes actual, 1 el anterior, 2 hace dos meses.",
    parameters: { type: "object", properties: { months_ago: { type: "integer" } } }
  },
  {
    name: "get_monthly_sales_history",
    description: "Devuelve ventas agregadas por mes para analizar tendencia reciente.",
    parameters: { type: "object", properties: { months: { type: "integer" } } }
  },
  {
    name: "forecast_purchase_recommendations",
    description: "Proyecta demanda futura en base a ventas recientes y sugiere cuanto comprar a fabrica por producto.",
    parameters: {
      type: "object",
      properties: {
        months: { type: "integer" },
        horizon_months: { type: "integer" },
        limit: { type: "integer" }
      }
    }
  },
  { name: "get_today_sales_summary", description: "Obtiene un resumen de los pedidos del dia de hoy.", parameters: { type: "object", properties: {} } },
  { name: "get_inventory_replenishment_suggestions", description: "Sugiere que comprar a fabrica.", parameters: { type: "object", properties: {} } }
];

const CLIENT_TOOLS = [
  {
    name: "search_product",
    description: "Busca detalles, descripciÃ³n o precio de un producto especÃ­fico.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  }
];

function getMonthWindow(monthsAgo = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start, end };
}

function getOrdersInWindow(orders, start, end) {
  return orders.filter((order) => {
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    return createdAt && createdAt >= start && createdAt < end;
  });
}

function getDeliveredLikeOrders(orders) {
  return orders.filter((order) => !['Cancelado'].includes(order.status));
}

function aggregateSalesByProduct(orders) {
  const sales = new Map();

  orders.forEach((order) => {
    const createdAt = order?.createdAt ?? null;

    (order.items ?? []).forEach((item) => {
      const current = sales.get(item.productId) ?? {
        productId: item.productId,
        qty: 0,
        revenue: 0,
        orders: 0,
        lastSoldAt: createdAt,
      };

      current.qty += Number(item.qty) || 0;
      current.orders += 1;
      current.lastSoldAt = createdAt ?? current.lastSoldAt;
      sales.set(item.productId, current);
    });
  });

  return sales;
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
}

function normalizeToolArguments(rawArguments) {
  if (!rawArguments) {
    return {};
  }

  if (typeof rawArguments === 'object') {
    return rawArguments;
  }

  try {
    return JSON.parse(rawArguments);
  } catch {
    return {};
  }
}

function extractToolCallsFromText(responseText, availableTools = []) {
  if (typeof responseText !== 'string' || !responseText.includes('"name"')) {
    return [];
  }

  const validToolNames = new Set(availableTools.map((tool) => tool.name));
  const matches = [...responseText.matchAll(/\{"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\}/g)];

  return matches
    .map((match) => ({
      name: match[1],
      arguments: normalizeToolArguments(match[2]),
    }))
    .filter((toolCall) => validToolNames.has(toolCall.name));
}

const executeTool = async (functionName, args, pool) => {
  const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
  const state = rows.length > 0 ? JSON.parse(rows[0].state_json) : { products: [], clients: [], orders: [] };

  if (functionName === 'get_stock_alerts') {
    const critical = state.products.filter(p => (p.currentStock ?? 0) < 10);
    if (critical.length === 0) return "No hay alertas de stock.";
    return `PRODUCTOS CON STOCK BAJO (<10):\n` + critical.map(p => `- ${p.name}: ${p.currentStock}`).join('\n');
  }
  if (functionName === 'get_inactive_clients') {
    const requestedDays = Math.max(Number(args?.days_without_purchase) || 30, 1);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - requestedDays);
    const inactive = state.clients.filter((client) => {
      const lastOrder = state.orders.filter(o => o.clientId === client.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return !lastOrder || new Date(lastOrder.createdAt) < thresholdDate;
    });
    if (inactive.length === 0) return "Todos ingresaron pedidos recientemente.";
    return `CLIENTES INACTIVOS (>${requestedDays} dias):\n` + inactive.map((client) => {
      const clientOrders = state.orders.filter((order) => order.clientId === client.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastOrder = clientOrders[0] ?? null;
      const lastPurchaseLabel = lastOrder?.createdAt ? new Date(lastOrder.createdAt).toLocaleDateString('es-AR') : 'Sin compras';
      return `- ${client.businessName} | saldo pendiente: $${Number(client.pendingBalance ?? 0)} | ultima compra: ${lastPurchaseLabel} | pedidos: ${clientOrders.length}`;
    }).join('\n');
  }
  if (functionName === 'suggest_commercial_actions') {
    const requestedDays = Math.max(Number(args?.days_without_purchase) || 30, 1);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - requestedDays);
    const inactiveClients = state.clients
      .map((client) => {
        const clientOrders = state.orders.filter((order) => order.clientId === client.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const lastOrder = clientOrders[0] ?? null;
        const totalSpent = clientOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        return { client, clientOrders, lastOrder, totalSpent, isInactive: !lastOrder || new Date(lastOrder.createdAt) < thresholdDate };
      })
      .filter((entry) => entry.isInactive)
      .sort((left, right) => right.totalSpent - left.totalSpent)
      .slice(0, 5);
    if (inactiveClients.length === 0) return `No detecto clientes inactivos por encima de ${requestedDays} dias para accionar ahora.`;
    return `ACCIONES COMERCIALES SUGERIDAS (>${requestedDays} dias):\n` + inactiveClients.map(({ client, lastOrder, totalSpent, clientOrders }) => {
      const pendingBalance = Number(client.pendingBalance ?? 0);
      const daysSinceLastOrder = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : requestedDays;
      let action = 'Retomar contacto con mensaje breve y propuesta de reposicion.';
      if (!lastOrder) {
        action = 'Primer recontacto comercial para activar la cuenta y detectar una necesidad concreta de compra.';
      } else if (pendingBalance > 0) {
        action = 'Priorizar cobranza y ofrecer regularizar saldo antes de impulsar una nueva compra.';
      } else if (daysSinceLastOrder >= 90) {
        action = 'Hacer recuperacion fuerte con WhatsApp personalizado y seguimiento telefonico dentro de 48 hs.';
      } else if (totalSpent > 250000 || clientOrders.length >= 5) {
        action = 'Hacer llamado comercial con oferta de recompra o combo por volumen para reactivar la cuenta.';
      }
      return `- ${client.businessName}: ${action} Saldo pendiente $${pendingBalance}. Historico $${Math.round(totalSpent)}.`;
    }).join('\n');
  }
  if (functionName === 'get_inventory_snapshot') {
    const limit = Math.max(Number(args?.limit) || 5, 1);
    const products = [...state.products];
    const critical = products
      .filter((product) => Number(product.currentStock ?? 0) <= 5)
      .sort((left, right) => Number(left.currentStock ?? 0) - Number(right.currentStock ?? 0))
      .slice(0, limit);
    const low = products
      .filter((product) => Number(product.currentStock ?? 0) > 5 && Number(product.currentStock ?? 0) <= 20)
      .sort((left, right) => Number(left.currentStock ?? 0) - Number(right.currentStock ?? 0))
      .slice(0, limit);
    const high = products
      .sort((left, right) => Number(right.currentStock ?? 0) - Number(left.currentStock ?? 0))
      .slice(0, limit);

    const formatProducts = (items) =>
      items.length === 0
        ? '- Sin datos relevantes'
        : items.map((product) => `- ${product.name}: stock ${Number(product.currentStock ?? 0)} | sku ${product.sku}`).join('\n');

    return [
      'FOTO DE STOCK:',
      'Criticos (<=5):',
      formatProducts(critical),
      'Bajos (6 a 20):',
      formatProducts(low),
      'Mayor stock:',
      formatProducts(high),
    ].join('\n');
  }
  if (functionName === 'get_month_sales_summary') {
    const monthsAgo = Math.max(Number(args?.months_ago) || 0, 0);
    const { start, end } = getMonthWindow(monthsAgo);
    const orders = getDeliveredLikeOrders(getOrdersInWindow(state.orders, start, end));
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const uniqueClients = new Set(orders.map((order) => order.clientId)).size;
    const salesByProduct = [...aggregateSalesByProduct(orders).values()]
      .sort((left, right) => right.qty - left.qty)
      .slice(0, 5)
      .map((entry) => {
        const product = state.products.find((item) => item.id === entry.productId);
        return `- ${product?.name ?? `Producto ${entry.productId}`}: ${entry.qty} unidades`;
      })
      .join('\n');

    return [
      `VENTAS DE ${formatMonthLabel(start).toUpperCase()}:`,
      `- Pedidos: ${orders.length}`,
      `- Facturacion: $${Math.round(totalRevenue)}`,
      `- Clientes con compra: ${uniqueClients}`,
      'Top productos:',
      salesByProduct || '- Sin ventas en el periodo',
    ].join('\n');
  }
  if (functionName === 'get_monthly_sales_history') {
    const months = Math.min(Math.max(Number(args?.months) || 6, 1), 12);
    const lines = [];

    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const { start, end } = getMonthWindow(offset);
      const orders = getDeliveredLikeOrders(getOrdersInWindow(state.orders, start, end));
      const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      const totalUnits = orders.reduce(
        (sum, order) => sum + (order.items ?? []).reduce((itemSum, item) => itemSum + (Number(item.qty) || 0), 0),
        0,
      );
      lines.push(`- ${formatMonthLabel(start)}: pedidos ${orders.length} | unidades ${totalUnits} | facturacion $${Math.round(totalRevenue)}`);
    }

    return ['HISTORIAL MENSUAL DE VENTAS:', ...lines].join('\n');
  }
  if (functionName === 'forecast_purchase_recommendations') {
    const months = Math.min(Math.max(Number(args?.months) || 3, 1), 12);
    const horizonMonths = Math.min(Math.max(Number(args?.horizon_months) || 1, 1), 3);
    const limit = Math.max(Number(args?.limit) || 8, 1);
    const relevantOrders = [];

    for (let offset = 0; offset < months; offset += 1) {
      const { start, end } = getMonthWindow(offset);
      relevantOrders.push(...getDeliveredLikeOrders(getOrdersInWindow(state.orders, start, end)));
    }

    const aggregatedSales = [...aggregateSalesByProduct(relevantOrders).values()]
      .map((entry) => {
        const product = state.products.find((item) => item.id === entry.productId);
        const avgMonthlyUnits = entry.qty / months;
        const projectedDemand = Math.ceil(avgMonthlyUnits * horizonMonths);
        const currentStock = Number(product?.currentStock ?? 0);
        const suggestedPurchase = Math.max(projectedDemand - currentStock, 0);
        const recommendedDate = new Date();
        recommendedDate.setDate(recommendedDate.getDate() + 7);

        return {
          productName: product?.name ?? `Producto ${entry.productId}`,
          sku: product?.sku ?? 'N/D',
          currentStock,
          avgMonthlyUnits,
          historicalUnits: entry.qty,
          monthsAnalyzed: months,
          projectedDemand,
          suggestedPurchase,
          recommendedDate: recommendedDate.toLocaleDateString('es-AR'),
        };
      })
      .filter((entry) => entry.projectedDemand > 0)
      .sort((left, right) => {
        if (right.suggestedPurchase !== left.suggestedPurchase) {
          return right.suggestedPurchase - left.suggestedPurchase;
        }
        return right.projectedDemand - left.projectedDemand;
      })
      .slice(0, limit);

    if (aggregatedSales.length === 0) {
      return 'No hay suficiente historial reciente para proyectar compras a fabrica.';
    }

    const reliabilityNote =
      months < 6
        ? `ADVERTENCIA: la proyeccion usa solo ${months} mes/es de historia, asi que es menos confiable y conviene validarla con el equipo comercial.`
        : `Con ${months} meses de historia, la proyeccion tiene mejor base comparativa, aunque sigue siendo una estimacion y no una garantia.`;

    return [
      `PROYECCION DE COMPRA A FABRICA (${months} meses analizados, horizonte ${horizonMonths} mes/es):`,
      reliabilityNote,
      ...aggregatedSales.map((entry) => `- ${entry.productName} | sku ${entry.sku} | historial usado ${entry.historicalUnits} unidades en ${entry.monthsAnalyzed} mes/es | promedio mensual ${entry.avgMonthlyUnits.toFixed(1)} | stock actual ${entry.currentStock} | demanda proyectada ${entry.projectedDemand} | sugerido comprar ${entry.suggestedPurchase} | fecha sugerida para pedir ${entry.recommendedDate}`),
    ].join('\n');
  }
  if (functionName === 'get_today_sales_summary') {
    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = state.orders.filter(o => (o.createdAt || '').startsWith(today));
    const totalAmount = todaysOrders.reduce((acc, o) => acc + (o.total ?? 0), 0);
    return `RESUMEN DE HOY: ${todaysOrders.length} pedidos. Facturacion: $${totalAmount}.`;
  }
  if (functionName === 'get_inventory_replenishment_suggestions') {
    const suggestions = state.products.filter(p => (p.currentStock ?? 0) < 20).slice(0, 5);
    if (suggestions.length === 0) return "Stock saludable.";
    return `SUGERENCIAS COMPRA:\n` + suggestions.map(s => `- ${s.name} (Quedan ${s.currentStock})`).join('\n');
  }
  if (functionName === 'update_client_status') {
    const client = state.clients.find(c => c.id === args.customerId);
    if (!client) return `Cliente ID ${args.customerId} no hallado.`;
    client.status = args.status;
    await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [JSON.stringify(state)]);
    return `Estado de ${client.businessName} actualizado a ${args.status}.`;
  }
  if (functionName === 'search_product') {
    const q = (args.query || '').toLowerCase();
    const hits = state.products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 3);
    if (hits.length === 0) return "No hallado.";
    return `RESULTADOS:\n` + hits.map(p => `- ${p.name} ($${p.price}) stock: ${p.currentStock}`).join('\n');
  }
  return "Herramienta desconocida";
};

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const userRole = req.user.role;
  if (!accountId || !apiToken) return res.status(500).json({ ok: false, error: 'Falta cloudflare vars' });

  await initDB();
  const SYSTEM_PROMPT_ADMIN = `# INTERNAL ASSISTANT â€” ANDRÃ‰S MERINO PINTURERÃA CRM

## ROLE AND CONTEXT

You are the internal management assistant for the AndrÃ©s Merino PinturerÃ­a CRM. You operate exclusively for authorized internal users. Your purpose is to support commercial and operational decision-making based on available system data.

**Business:** Wholesale paint distributor with 20 branches across Argentina. Primary customers: hardware stores (ferreterÃ­as) and paint shops (pintolerÃ­as).

**Available system data:** customers, orders, inventory, accounts receivable, zone-based sales reps, purchase history, outstanding debts, and sales metrics.

---

## CURRENT USER ROLE: ADMINISTRATOR

The authenticated user has **full system access**. This includes:

- All customers, with no zone or sales rep filter
- All orders: active, pending, delivered, and cancelled
- Full inventory across all branches
- Accounts receivable, overdue balances, and payment history
- Performance metrics by sales rep, zone, product, and period
- Credit settings, commercial terms, and internal policies
- Communications, alerts, and global reports

**Do not apply any visibility restrictions for this role.**

---

## AVAILABLE FUNCTIONS

### 1. Sales Analysis & Metrics
- Interpret sales data shared by the user: tables, numbers, time periods.
- Compare period over period, by channel, zone, or product.
- Identify trends, anomalies, and opportunities.
- Suggest relevant KPIs for wholesale distribution businesses.

### 2. Customer & Order Management
- Assist with searches by company name, tax ID (CUIT), assigned sales rep, or order status.
- Flag alerts for: delayed orders, overdue debt, prolonged inactivity (+60 days without purchase).
- Identify opportunities or risks in specific accounts.

### 3. Commercial Actions
- Detect customers with repurchase potential (30 / 60 / 90 days without buying).
- Identify high-potential accounts with no recent activity or declining volume.
- Suggest retention, account recovery, and up-sell strategies by category.
- Draft follow-up messages for WhatsApp or email.

### 4. Inventory & Replenishment
- Analyze whether current order levels may anticipate stockouts on key products.
- Identify fast-moving products with low relative stock.
- Suggest replenishment orders based on demand history.

### 5. Order Prioritization & Collections
- Sort orders by urgency, committed delivery date, or economic value.
- Identify accounts at risk of bad debt or systematic late payment.
- Suggest escalated collection actions: reminder, phone call, credit suspension.

### 6. Operational Queries
- Commercial terms, credit policies, and internal deadlines.
- Credit note procedures, returns, and invoice adjustments.
- Inter-branch coordination, logistics, and dispatch.

### 7. Communications Drafting
- Customer message drafts: follow-ups, collections, commercial updates.
- Meeting summaries and sales briefings.
- Executive reports for management.

---

## BEHAVIOR INSTRUCTIONS

- **Always respond in Rioplatense Spanish (Argentina).** Use "vos" forms and local business language.
- Tone: professional, direct, action-oriented.
- Use bullet points and tables when they simplify reading.
- If the user shares raw text data, process it and respond with concrete analysis.
- If a requested data point is not available, say so clearly and suggest how to retrieve it from the system.
- Do not repeat unnecessary information or ask clarifying questions if context is already sufficient.
- Never share one customer's information with another user without explicit administrator authorization.
- When facing ambiguity, ask only the minimum clarification needed to proceed.`;
  const SYSTEM_PROMPT_CLIENTE = `# CUSTOMER-FACING ASSISTANT â€” ANDRÃ‰S MERINO PINTURERÃA

## ROLE AND CONTEXT

You are the virtual assistant for AndrÃ©s Merino PinturerÃ­a, a wholesale paint distributor
with 20 branches across Argentina. You assist registered wholesale customers â€”
hardware stores (ferreterÃ­as), paint shops (pinturerÃ­as), and distributors.

You operate within the **customer-facing portal only**. You have no access to internal
systems, other customers' data, pricing databases, stock levels, or any administrative
information. You assist the authenticated customer using only what is visible
in their own dashboard.

---

## CURRENT USER ROLE: CUSTOMER

The authenticated user is a registered wholesale customer. They can only access:

- Their own orders (history, status, pending)
- Their own account balance and credit status
- Their own assigned sales representative contact
- General product catalog information (no real-time pricing or stock)
- General commercial policies (payment terms, returns, dispatch schedules)

**Never reveal, infer, or discuss:**
- Other customers' data, orders, or accounts
- Internal pricing structures, margins, or discount policies
- Stock levels, warehouse data, or supply chain details
- Sales rep performance, internal targets, or business metrics
- Any information that belongs to the administrative or vendor side of the system

If the user asks for anything outside this scope, decline politely and redirect
to their sales rep or the appropriate channel.

---

## AVAILABLE FUNCTIONS

### 1. Product & Catalog Inquiries
- Provide general information about product lines: paints, enamels, latex,
  waterproofing, sealants, and accessories.
- If the customer asks about a specific product, ask for the product code or
  commercial name to help identify it.
- Always clarify that final pricing and availability are confirmed by their
  assigned sales rep or through the portal â€” never state prices as definitive.

### 2. Order Status
- Help the customer navigate to "My Orders" in their dashboard for real-time status.
- If they share an order number, guide them on where to find that information
  in their own panel.
- If there is urgency (e.g. delayed delivery), offer to help them contact
  logistics through the appropriate channel.

### 3. Order Assistance
- Help the customer build a draft order: product, quantity, pickup branch or
  delivery address.
- Always clarify that orders are subject to stock confirmation and available credit.
- Summarize the order clearly at the end and ask for confirmation before submitting.
- Never confirm stock availability or guarantee delivery dates.

### 4. General Wholesale Queries
- Payment terms, credit conditions, return policies, and credit note procedures.
- Dispatch schedules by branch (general information only).
- How to contact their assigned sales rep.

---

## HARD LIMITS

- **Never invent prices, stock levels, or delivery dates.**
- **Never promise discounts or special terms** without explicit sales rep authorization.
- **Never answer questions about other customers,** even indirectly
  (e.g. "do other clients get a better price?").
- **Never discuss internal business data** (sales figures, vendor quotas,
  branch performance, etc.).
- If a question falls outside the customer's own dashboard scope,
  respond with: "That information isn't available here â€” I'd recommend
  reaching out to your sales rep directly."

---

## BEHAVIOR INSTRUCTIONS

- **Always respond in Rioplatense Spanish (Argentina).** Use "vos" forms
  and a professional but approachable tone.
- Use short bullet lists when they help clarity.
- If you don't have an exact answer, say so clearly and offer the right channel to get it.
- Keep responses focused and concise â€” the customer is here to operate, not to browse.
- Never volunteer information the customer didn't ask for.`;

  const systemPrompt = userRole === 'admin' ? SYSTEM_PROMPT_ADMIN : SYSTEM_PROMPT_CLIENTE;
  const tools = userRole === 'admin' ? ADMIN_TOOLS : CLIENT_TOOLS;
  const model = '@cf/meta/llama-3.1-8b-instruct';

  try {
    const cleanMessages = req.body.messages.filter(m => m.role !== 'system');

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, ...cleanMessages], tools })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ ok: false, error: 'Cloudflare devolviÃ³ error: ' + errText });
    }
    let data = await response.json();

    if (data.result.tool_calls && data.result.tool_calls.length > 0) {
      const toolCall = data.result.tool_calls[0];
      const toolResult = await executeTool(toolCall.name, toolCall.arguments, pool);

      const secondResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...cleanMessages,
            { role: 'user', content: `[Admin Tool Result: he ejecutado '${toolCall.name}' y la Base de Datos devolviÃ³:\n${toolResult}\nResponde a mi pedido usando esto.]` }
          ]
        })
      });
      data = await secondResponse.json();
    }

    res.json({ ok: true, result: { ...data.result, response: data.result.response || "" } });
  } catch (err) {
    console.error("AI Catch:", err);
    res.status(500).json({ ok: false, error: 'Error general IA: ' + err.message });
  }
});

// ExportaciÃ³n que Vercel utiliza para instanciar el servidor Serverless
async function runSeparatedAiChat(req, res, { requiredRole, systemPrompt, tools }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (req.user.role !== requiredRole) {
    return res.status(403).json({ ok: false, error: 'Rol no autorizado para este asistente.' });
  }

  if (!accountId || !apiToken) {
    return res.status(500).json({ ok: false, error: 'Falta cloudflare vars' });
  }

  try {
    await initDB();
    const model = '@cf/meta/llama-3.1-8b-instruct';
    const incomingMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const cleanMessages = incomingMessages.filter((message) => message.role !== 'system');

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, ...cleanMessages],
        tools,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ ok: false, error: 'Cloudflare devolvio error: ' + errText });
    }

    let data = await response.json();
    const structuredToolCalls = Array.isArray(data?.result?.tool_calls) ? data.result.tool_calls : [];
    const fallbackToolCalls = extractToolCallsFromText(data?.result?.response, tools);
    const toolCalls = (structuredToolCalls.length > 0 ? structuredToolCalls : fallbackToolCalls)
      .map((toolCall) => ({
        name: toolCall.name,
        arguments: normalizeToolArguments(toolCall.arguments),
      }))
      .filter((toolCall) => tools.some((tool) => tool.name === toolCall.name));

    if (toolCalls.length > 0) {
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const toolResult = await executeTool(toolCall.name, toolCall.arguments, pool);
        toolResults.push(`Herramienta: ${toolCall.name}\nArgumentos: ${JSON.stringify(toolCall.arguments)}\nResultado:\n${toolResult}`);
      }

      const secondResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...cleanMessages,
            {
              role: 'user',
              content: `[Tool Results]\n${toolResults.join('\n\n')}\n\nUsa estos resultados para responder al usuario en lenguaje natural. No muestres nombres de herramientas, JSON ni payloads internos. Si falta informacion, decilo claramente.`,
            },
          ],
        }),
      });

      data = await secondResponse.json();
    }

    const finalResponse = data?.result?.response || '';
    const leakedToolCalls = extractToolCallsFromText(finalResponse, tools);

    if (leakedToolCalls.length > 0) {
      return res.json({
        ok: true,
        result: {
          ...data.result,
          response: 'Pude interpretar la consulta, pero la respuesta del modelo vino en un formato interno de herramientas. Reintentá la consulta o actualizá el despliegue si esto sigue pasando.',
        },
      });
    }

    return res.json({ ok: true, result: { ...data.result, response: finalResponse } });
  } catch (err) {
    console.error("AI Catch:", err);
    return res.status(500).json({ ok: false, error: 'Error general IA: ' + err.message });
  }
}

app.post('/api/ai/admin/chat', authenticateToken, async (req, res) => {
  return runSeparatedAiChat(req, res, {
    requiredRole: 'admin',
    systemPrompt: SYSTEM_PROMPT_ADMIN,
    tools: ADMIN_TOOLS,
  });
});

app.post('/api/ai/client/chat', authenticateToken, async (req, res) => {
  return runSeparatedAiChat(req, res, {
    requiredRole: 'client',
    systemPrompt: SYSTEM_PROMPT_CLIENTE,
    tools: CLIENT_TOOLS,
  });
});

export default app;

