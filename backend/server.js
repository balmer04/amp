import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const db = new Database(path.join(__dirname, 'database.db'));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in backend/.env');
  process.exit(1);
}


// Initialize Database Schema if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

// Simple seeded users
const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (usersCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)');
  insertUser.run('cliente@amprev.com', bcrypt.hashSync('cliente123', 8), 'client', 'Cliente Demo');
  insertUser.run('admin@amprev.com', bcrypt.hashSync('admin123', 8), 'admin', 'Administrador Demo');
}

// Authentication Middleware
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

// Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ ok: false, message: 'Credenciales inválidas.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ ok: true, token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

// For this migration, we store the full application state in a single row to preserve functionality,
// BUT we validate incoming mutations so clients cannot escalate privileges or modify products/prices.
app.get('/api/state', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
  if (row) {
    res.json({ ok: true, state: JSON.parse(row.state_json) });
  } else {
    res.json({ ok: true, state: null });
  }
});

// Admin can sync any state
app.post('/api/state', authenticateToken, requireAdmin, (req, res) => {
  const stateJson = JSON.stringify(req.body.state);
  const exists = db.prepare('SELECT id FROM app_state WHERE id = 1').get();
  
  if (exists) {
    db.prepare('UPDATE app_state SET state_json = ? WHERE id = 1').run(stateJson);
  } else {
    db.prepare('INSERT INTO app_state (id, state_json) VALUES (1, ?)').run(stateJson);
  }
  res.json({ ok: true });
});

// Client specific protected actions
app.post('/api/client/order', authenticateToken, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can use this endpoint' });
  
  const { order } = req.body;
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }
  
  const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
  if (!row) return res.status(500).json({ error: 'No state found' });
  const currentState = JSON.parse(row.state_json);

  // Recalculate total from true product prices
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
  db.prepare('UPDATE app_state SET state_json = ? WHERE id = 1').run(JSON.stringify(currentState));
  
  res.json({ ok: true, state: currentState });
});

app.post('/api/client/chat', authenticateToken, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can use this endpoint' });
  
  const { chats } = req.body;
  if (!Array.isArray(chats)) return res.status(400).json({ error: 'Invalid chats payload' });
  
  const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
  if (!row) return res.status(500).json({ error: 'No state found' });
  
  let currentState = JSON.parse(row.state_json);
  
  // Find client by their JWT user ID
  const userClient = currentState.clients.find(c => c.email === req.user.email);
  if (!userClient) return res.status(403).json({ error: 'Client not found' });
  
  // Only accept chat changes for this client's own chat — preserve all others from server state
  const incomingOwnChat = chats.find(c => c.clientId === userClient.id);
  if (incomingOwnChat) {
    currentState.chats = currentState.chats.map(chat =>
      chat.clientId === userClient.id ? incomingOwnChat : chat
    );
  }
  
  db.prepare('UPDATE app_state SET state_json = ? WHERE id = 1').run(JSON.stringify(currentState));
  res.json({ ok: true, state: currentState });
});

// ── CONFIGURACIÓN DE IA CON FUNCIONES (TOOLBOX) ─────────────────────────────

// Definimos las herramientas que el Administrador puede usar (Edición)
const ADMIN_TOOLS = [
  {
    name: "update_client_status",
    description: "Cambia el estado de un cliente (ej. Activo, Inactivo, Bloqueado).",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "integer", description: "ID del cliente" },
        status: { type: "string", enum: ["Activo", "Inactivo", "Bloqueado"] }
      },
      required: ["customerId", "status"]
    }
  },
  {
    name: "get_stock_alerts",
    description: "Consulta productos con stock crítico (bajo).",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_inactive_clients",
    description: "Busca clientes que no han realizado pedidos en los últimos 30 días.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_today_sales_summary",
    description: "Obtiene un resumen de los pedidos y facturación del día de hoy.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_inventory_replenishment_suggestions",
    description: "Sugiere qué productos comprar a fábrica basado en stock bajo y ventas recientes.",
    parameters: { type: "object", properties: {} }
  }
];

// El Cliente solo tiene herramientas de lectura/consulta
const CLIENT_TOOLS = [
  {
    name: "search_product",
    description: "Busca detalles, descripción o precio de un producto específico.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nombre o SKU del producto" }
      },
      required: ["query"]
    }
  }
];

// ── IMPLEMENTACIÓN REAL DE LAS HERRAMIENTAS (BACKEND LOGIC) ──────────────────
const TOOLS_IMPLEMENTATION = {
  get_stock_alerts: () => {
    try {
      const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
      const state = row ? JSON.parse(row.state_json) : { products: [] };
      const critical = state.products.filter(p => (p.currentStock ?? 0) < 10); // Umbral 10 para demo
      if (critical.length === 0) return "No hay alertas de stock. Todos los productos superan las 10 unidades.";
      return `PRODUCTOS CON STOCK BAJO (<10):\n` + critical.map(p => `- ${p.name} (SKU: ${p.sku}): ${p.currentStock} unidades.`).join('\n');
    } catch (e) { return "Error al consultar stock."; }
  },

  get_inactive_clients: () => {
    try {
      const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
      const state = row ? JSON.parse(row.state_json) : { clients: [], orders: [] };
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const inactive = state.clients.filter(client => {
        const lastOrder = state.orders
          .filter(o => o.clientId === client.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        
        if (!lastOrder) return true; // Nunca compró
        return new Date(lastOrder.createdAt) < thirtyDaysAgo;
      });

      if (inactive.length === 0) return "Todos los clientes han comprado en los últimos 30 días.";
      return `CLIENTES INACTIVOS (>30 días):\n` + inactive.map(c => `- ${c.businessName} (ID: ${c.id})`).join('\n');
    } catch (e) { return "Error al consultar clientes."; }
  },

  get_today_sales_summary: () => {
    try {
      const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
      const state = row ? JSON.parse(row.state_json) : { orders: [] };
      const today = new Date().toISOString().split('T')[0];
      
      const todaysOrders = state.orders.filter(o => o.createdAt.startsWith(today));
      const totalAmount = todaysOrders.reduce((acc, o) => acc + (o.total ?? 0), 0);
      const pending = todaysOrders.filter(o => o.status === 'Pendiente').length;

      return `RESUMEN DE VENTAS DE HOY:\n- Pedidos totales: ${todaysOrders.length}\n- Facturación estimada: $${totalAmount.toLocaleString('es-AR')}\n- Pedidos pendientes de aprobación: ${pending}`;
    } catch (e) { return "Error al resumir ventas."; }
  },

  get_inventory_replenishment_suggestions: () => {
    try {
      const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
      const state = row ? JSON.parse(row.state_json) : { products: [], orders: [] };
      
      // Sugerimos reponer si stock < 20 y hubo ventas en el último mes
      const suggestions = state.products
        .filter(p => (p.currentStock ?? 0) < 20)
        .map(p => {
           const salesCount = state.orders.filter(o => o.items.some(i => i.productId === p.id)).length;
           return { name: p.name, stock: p.currentStock, sales: salesCount };
        })
        .filter(s => s.sales > 0)
        .sort((a, b) => b.sales - a.sales);

      if (suggestions.length === 0) return "No hay sugerencias de reposición urgentes basadas en ventas.";
      return `SUGERENCIAS DE COMPRA A FÁBRICA:\n` + suggestions.map(s => `- ${s.name}: Quedan ${s.stock} (Vendido en ${s.sales} pedidos). Sugerido: Pedir 50+ unidades.`).join('\n');
    } catch (e) { return "Error al generar sugerencias."; }
  },

  update_client_status: (args) => {
    try {
      const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
      if (!row) return "No se encontró la base de datos.";
      const state = JSON.parse(row.state_json);
      
      const client = state.clients.find(c => c.id === args.customerId);
      if (!client) return `No se encontró el cliente con ID ${args.customerId}.`;
      
      const validStatuses = ['Activo', 'Inactivo', 'Bloqueado'];
      if (!validStatuses.includes(args.status)) return `Estado inválido. Opciones: ${validStatuses.join(', ')}`;
      
      client.status = args.status;
      db.prepare('UPDATE app_state SET state_json = ? WHERE id = 1').run(JSON.stringify(state));
      
      return `Cliente "${client.businessName}" actualizado a estado: ${args.status}.`;
    } catch (e) { return "Error al actualizar estado del cliente."; }
  },

  search_product: (args) => {
    try {
      const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
      if (!row) return "No se encontró la base de datos.";
      const state = JSON.parse(row.state_json);
      
      const query = (args.query || '').toLowerCase();
      const matches = state.products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
      ).slice(0, 5);
      
      if (matches.length === 0) return `No se encontraron productos para "${args.query}".`;
      return `RESULTADOS (${matches.length}):\n` + matches.map(p =>
        `- ${p.name} (${p.brand}) | SKU: ${p.sku} | Precio: $${p.price.toLocaleString('es-AR')} | Stock: ${p.currentStock ?? 0}`
      ).join('\n');
    } catch (e) { return "Error al buscar productos."; }
  }
};

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const userRole = req.user.role;
  
  if (!accountId || !apiToken) {
    return res.status(500).json({ ok: false, error: 'Cloudflare no está configurado.' });
  }

  const SYSTEM_PROMPT_ADMIN = `
    Eres el ASISTENTE OPERATIVO de Andrés Merino Pinturería. 
    Tu objetivo es ayudar al administrador con métricas, stock y operaciones.
    REGLA ESTRICTA 1: Solo puedes llamar a UNA (1) sola herramienta por turno. No intentes llamar a múltiples herramientas al mismo tiempo.
    REGLA ESTRICTA 2: Tu respuesta final DEBE ser siempre en lenguaje natural o Markdown amigable para humanos. NUNCA respondas crudo con objetos JSON (ej. nunca muestres {"name": ...}).
    Si el usuario pregunta por stock bajo o alertas, utiliza la herramienta 'get_stock_alerts'.
    Responde de forma profesional y fáctica.
  `.trim();

  const SYSTEM_PROMPT_CLIENTE = `
    Eres el ASISTENTE DE VENTAS de Andrés Merino Pintulería. 
    Ayudas a los clientes a navegar el catálogo y ver sus pedidos.
    Sé amable y servicial. No tienes herramientas de edición.
  `.trim();

  const systemPrompt = userRole === 'admin' ? SYSTEM_PROMPT_ADMIN : SYSTEM_PROMPT_CLIENTE;
  const tools = userRole === 'admin' ? ADMIN_TOOLS : CLIENT_TOOLS;
  const model = '@cf/meta/llama-3.1-8b-instruct';

  try {
    // 1. Llamada inicial a la IA para ver si quiere usar una herramienta
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, ...req.body.messages],
        tools: tools,
      })
    });

    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'Error AI Server' });

    let data = await response.json();
    
    // 2. ¿La IA pidió usar una herramienta (Function Calling)?
    // Cloudflare devuelve tool_calls en el resultado si el modelo decide usarlos.
    if (data.result.tool_calls && data.result.tool_calls.length > 0) {
      const toolCall = data.result.tool_calls[0];
      const functionName = toolCall.name;
      
      if (TOOLS_IMPLEMENTATION[functionName]) {
        // EJECUTAMOS LA HERRAMIENTA REAL EN NUESTRO SERVIDOR
        const toolResult = TOOLS_IMPLEMENTATION[functionName](toolCall.arguments);
        
        // 3. Le enviamos el RESULTADO REAL de la base de datos a la IA para que escriba la respuesta final
        const secondResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...req.body.messages,
              { role: 'user', content: `[Sistema Operativo interno: acabo de ejecutar la herramienta '${functionName}' por ti. Este es el resultado que arrojó la base de datos:\n\n${toolResult}\n\nPor favor, responde a mi mensaje anterior utilizando ÚNICAMENTE esta información que te acabo de proveer.]` }
            ]
          })
        });

        if (!secondResponse.ok) {
          const errText = await secondResponse.text();
          console.error("Second AI Call failed:", secondResponse.status, errText);
          return res.status(500).json({ ok: false, error: 'Error en segunda llamada AI', details: errText });
        }
        data = await secondResponse.json();
      }
    }
    
    let finalResponse = data.result.response || "";
    if (finalResponse.trim().startsWith('{"name"') || finalResponse.trim().startsWith('[{"name"')) {
      finalResponse = "Intenté procesar varias herramientas juntas y me mareé. Por favor, haceme una consulta a la vez (ej. preguntá por los clientes primero, y luego por el stock).";
    }
    
    res.json({ ok: true, result: { ...data.result, response: finalResponse } });
  } catch (error) {
    console.error('AI Fetch error', error);
    res.status(500).json({ ok: false, error: 'No se pudo contactar a la IA.' });
  }
});

app.post('/api/ai/analyze-client', authenticateToken, requireAdmin, async (req, res) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  if (!accountId || !apiToken) {
    return res.status(500).json({ ok: false, error: 'Cloudflare no está configurado.' });
  }

  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ ok: false, error: 'Missing clientId' });

  // 1. Obtener datos del cliente de SQLite
  try {
    const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
    if (!row) return res.status(500).json({ ok: false, error: 'DB empty' });
    const state = JSON.parse(row.state_json);
    
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return res.status(404).json({ ok: false, error: 'Client not found' });
    
    const clientOrders = state.orders.filter(o => o.clientId === clientId);
    const totalSpent = clientOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const daysWithoutBuying = client.lastPurchase
      ? Math.floor((Date.now() - new Date(client.lastPurchase.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 'Nunca compró';

    // 2. Preparamos el contexto para la IA
    const systemPrompt = `
      Eres el ASISTENTE OPERATIVO de Andrés Merino Pinturería. 
      Tu tarea es analizar los datos de un cliente y generar una recomendación comercial corta y directa (máximo 3 oraciones).
      No saludes, ve directamente a las observaciones.
    `.trim();

    const prompt = `
      Analiza este cliente:
      - Nombre: ${client.businessName}
      - Saldo pendiente: $${client.pendingBalance ?? 0}
      - Cantidad de pedidos: ${clientOrders.length}
      - Total gastado histórico: $${totalSpent}
      - Días desde su última compra: ${daysWithoutBuying}
      
      Genera tu recomendación comercial.
    `.trim();

    const model = '@cf/meta/llama-3.1-8b-instruct';
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) return res.status(response.status).json({ ok: false, error: 'Error AI Server' });
    const data = await response.json();
    
    res.json({ ok: true, recommendation: data.result.response || data.result });
  } catch (error) {
    console.error('AI Analyze error', error);
    res.status(500).json({ ok: false, error: 'Error al generar análisis.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend securely running on port ${PORT}`);
});
