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
  } catch(error) {
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
  } catch(e) { res.status(500).json({ error: e.message }); }
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
      currentState.chats = currentState.chats.map(chat => chat.clientId === userClient.id ? incomingOwnChat : chat);
    }
    await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [JSON.stringify(currentState)]);
    res.json({ ok: true, state: currentState });
  } catch(e) { res.status(500).json({ error: e.message }); }
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

// Exportación que Vercel utiliza para instanciar el servidor Serverless
export default app;
