import express from 'express';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Evita que Node.js rechace el certificado de Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

// Vercel inyecta automáticamente esta variable si enlazaste Supabase
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
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas.' });
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
  if (!accountId || !apiToken) return res.status(500).json({ ok: false, error: 'Cloudflare no está configurado.' });

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
      : 'Nunca compró';

    const systemPrompt = `Eres el ASISTENTE OPERATIVO de Andrés Merino Pinturería. Tu tarea es analizar los datos de un cliente y generar una recomendación comercial corta y directa (máximo 3 oraciones). No saludes, ve directamente a las observaciones.`;
    const prompt = `Analiza este cliente: Nombre: ${client.businessName}. Saldo pendiente: $${client.pendingBalance ?? 0}. Cantidad de pedidos: ${clientOrders.length}. Total gastado histórico: $${totalSpent}. Días desde su última compra: ${daysWithoutBuying}. Genera tu recomendación comercial.`;

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
    res.status(500).json({ ok: false, error: 'Error al generar análisis.' });
  }
});

// ── CONFIGURACIÓN DE IA CON HERRAMIENTAS DIRECTAS A POSTGRES ─────────────────────────────
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
  { name: "get_stock_alerts", description: "Consulta productos con stock crítico (bajo).", parameters: { type: "object", properties: {} } },
  { name: "get_inactive_clients", description: "Busca clientes que no compraron en los últimos 30 días.", parameters: { type: "object", properties: {} } },
  { name: "get_today_sales_summary", description: "Obtiene un resumen de los pedidos del día de hoy.", parameters: { type: "object", properties: {} } },
  { name: "get_inventory_replenishment_suggestions", description: "Sugiere qué comprar a fábrica.", parameters: { type: "object", properties: {} } }
];

const CLIENT_TOOLS = [
  {
    name: "search_product",
    description: "Busca detalles, descripción o precio de un producto específico.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  }
];

const executeTool = async (functionName, args, pool) => {
  const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
  const state = rows.length > 0 ? JSON.parse(rows[0].state_json) : { products: [], clients: [], orders: [] };

  if (functionName === 'get_stock_alerts') {
    const critical = state.products.filter(p => (p.currentStock ?? 0) < 10);
    if (critical.length === 0) return "No hay alertas de stock.";
    return `PRODUCTOS CON STOCK BAJO (<10):\n` + critical.map(p => `- ${p.name}: ${p.currentStock}`).join('\n');
  }
  if (functionName === 'get_inactive_clients') {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const inactive = state.clients.filter(client => {
      const lastOrder = state.orders.filter(o => o.clientId === client.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return !lastOrder || new Date(lastOrder.createdAt) < thirtyDaysAgo;
    });
    if (inactive.length === 0) return "Todos ingresaron pedidos recientemente.";
    return `CLIENTES INACTIVOS (>30 días):\n` + inactive.map(c => `- ${c.businessName}`).join('\n');
  }
  if (functionName === 'get_today_sales_summary') {
    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = state.orders.filter(o => (o.createdAt || '').startsWith(today));
    const totalAmount = todaysOrders.reduce((acc, o) => acc + (o.total ?? 0), 0);
    return `RESUMEN DE HOY: ${todaysOrders.length} pedidos. Facturación: $${totalAmount}.`;
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
  const SYSTEM_PROMPT_ADMIN = `# INTERNAL ASSISTANT — ANDRÉS MERINO PINTURERÍA CRM

## ROLE AND CONTEXT

You are the internal management assistant for the Andrés Merino Pinturería CRM. You operate exclusively for authorized internal users. Your purpose is to support commercial and operational decision-making based on available system data.

**Business:** Wholesale paint distributor with 20 branches across Argentina. Primary customers: hardware stores (ferreterías) and paint shops (pintolerías).

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
  const SYSTEM_PROMPT_CLIENTE = `# CUSTOMER-FACING ASSISTANT — ANDRÉS MERINO PINTURERÍA

## ROLE AND CONTEXT

You are the virtual assistant for Andrés Merino Pinturería, a wholesale paint distributor
with 20 branches across Argentina. You assist registered wholesale customers —
hardware stores (ferreterías), paint shops (pinturerías), and distributors.

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
  assigned sales rep or through the portal — never state prices as definitive.

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
  respond with: "That information isn't available here — I'd recommend
  reaching out to your sales rep directly."

---

## BEHAVIOR INSTRUCTIONS

- **Always respond in Rioplatense Spanish (Argentina).** Use "vos" forms
  and a professional but approachable tone.
- Use short bullet lists when they help clarity.
- If you don't have an exact answer, say so clearly and offer the right channel to get it.
- Keep responses focused and concise — the customer is here to operate, not to browse.
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
      return res.status(response.status).json({ ok: false, error: 'Cloudflare devolvió error: ' + errText });
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
            { role: 'user', content: `[Admin Tool Result: he ejecutado '${toolCall.name}' y la Base de Datos devolvió:\n${toolResult}\nResponde a mi pedido usando esto.]` }
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

// Exportación que Vercel utiliza para instanciar el servidor Serverless
export default app;
