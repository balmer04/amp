import express from 'express';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { SYSTEM_PROMPT_ADMIN, SYSTEM_PROMPT_CLIENTE } from '../shared/aiPrompts.js';

// Evita que Node.js rechace el certificado de Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

// Soporta tanto Supabase (POSTGRES_URL) como Neon con prefijo (ampdatabase_POSTGRES_URL)
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.ampdatabase_POSTGRES_URL ||
  process.env.ampdatabase_DATABASE_URL;

const pool = new Pool({
  connectionString,
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

function getUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    is_active: user.is_active,
  };
}

function getDefaultProfilePayload(user, profile = {}) {
  return {
    user_id: user.id,
    business_name: profile.business_name ?? user.name ?? '',
    phone: profile.phone ?? '',
    alt_phone: profile.alt_phone ?? '',
    tax_id: profile.tax_id ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    province: profile.province ?? '',
    preferred_branch: profile.preferred_branch ?? '',
    metadata_json: profile.metadata_json ?? {},
  };
}

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
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT,
      phone TEXT,
      alt_phone TEXT,
      tax_id TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      preferred_branch TEXT,
      metadata_json JSONB DEFAULT '{}'::jsonb
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      title TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS ai_messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  `);

  // Tablas para módulos 1-8
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cuenta_corriente (
      id SERIAL PRIMARY KEY,
      client_json_id INTEGER NOT NULL,
      tipo VARCHAR(20) NOT NULL,
      descripcion VARCHAR(200),
      monto NUMERIC(12,2) NOT NULL,
      referencia_id VARCHAR(50),
      fecha TIMESTAMP DEFAULT NOW(),
      creado_por INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS stock_movimientos (
      id SERIAL PRIMARY KEY,
      producto_json_id VARCHAR(100) NOT NULL,
      tipo VARCHAR(20) NOT NULL,
      cantidad INTEGER NOT NULL,
      motivo TEXT,
      referencia_id VARCHAR(50),
      fecha TIMESTAMP DEFAULT NOW(),
      creado_por INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS listas_precios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      activa BOOLEAN DEFAULT true,
      creado_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS productos_precio (
      id SERIAL PRIMARY KEY,
      producto_json_id VARCHAR(100) NOT NULL,
      lista_precios_id INTEGER REFERENCES listas_precios(id) ON DELETE CASCADE,
      precio NUMERIC(12,2) NOT NULL,
      UNIQUE(producto_json_id, lista_precios_id)
    );
    CREATE TABLE IF NOT EXISTS facturas (
      id SERIAL PRIMARY KEY,
      numero INTEGER NOT NULL,
      tipo CHAR(1) NOT NULL,
      client_json_id INTEGER NOT NULL,
      pedido_json_id VARCHAR(50),
      fecha DATE DEFAULT CURRENT_DATE,
      subtotal NUMERIC(12,2),
      iva NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2),
      estado VARCHAR(20) DEFAULT 'emitida',
      items JSONB,
      datos_cliente JSONB,
      creado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
      creado_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(numero, tipo)
    );
    CREATE TABLE IF NOT EXISTS factura_numeracion (
      tipo CHAR(1) PRIMARY KEY,
      ultimo_numero INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS direcciones_entrega (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      nombre VARCHAR(100),
      calle VARCHAR(200),
      ciudad VARCHAR(100),
      provincia VARCHAR(100),
      codigo_postal VARCHAR(20),
      predeterminada BOOLEAN DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id SERIAL PRIMARY KEY,
      numero VARCHAR(20) UNIQUE NOT NULL,
      client_json_id INTEGER NOT NULL,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      vencimiento DATE NOT NULL,
      estado VARCHAR(20) DEFAULT 'borrador',
      subtotal NUMERIC(12,2) DEFAULT 0,
      descuento NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0,
      items JSONB DEFAULT '[]'::jsonb,
      datos_cliente JSONB,
      notas TEXT,
      pedido_json_id VARCHAR(100),
      creado_por INTEGER REFERENCES users(id),
      creado_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
    CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(client_json_id);
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'admin'`);
  await pool.query(`
    INSERT INTO factura_numeracion (tipo, ultimo_numero) VALUES ('A', 0), ('B', 0), ('C', 0) ON CONFLICT DO NOTHING
  `);

  const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(rows[0].count, 10) === 0) {
    const hashedClient = bcrypt.hashSync('cliente123', 8);
    const hashedAdmin = bcrypt.hashSync('admin123', 8);
    // Seed demo users (matches BRAND.demo in src/lib/brandConfig.js)
    await pool.query('INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING', ['cliente@demo.com', hashedClient, 'client', 'Cliente Demo']);
    await pool.query('INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING', ['admin@demo.com', hashedAdmin, 'admin', 'Administrador Demo']);
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

async function ensureUserProfile(userId, profile = {}) {
  const payload = getDefaultProfilePayload({ id: userId, name: profile.business_name ?? profile.name ?? '' }, profile);

  await pool.query(
    `INSERT INTO user_profiles (
      user_id, business_name, phone, alt_phone, tax_id, address, city, province, preferred_branch, metadata_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (user_id) DO NOTHING`,
    [
      payload.user_id,
      payload.business_name,
      payload.phone,
      payload.alt_phone,
      payload.tax_id,
      payload.address,
      payload.city,
      payload.province,
      payload.preferred_branch,
      JSON.stringify(payload.metadata_json),
    ],
  );
}

async function getUserProfile(userId) {
  const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
  return rows[0] ?? null;
}

async function getUserWithProfile(userId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];

  if (!user) {
    return null;
  }

  await ensureUserProfile(user.id, { business_name: user.name });
  const profile = await getUserProfile(user.id);

  return {
    user: getUserResponse(user),
    profile: profile ?? getDefaultProfilePayload(user),
  };
}

async function getAppStateRecord() {
  const { rows } = await pool.query('SELECT state_json FROM app_state WHERE id = 1');

  if (rows.length === 0 || !rows[0].state_json) {
    return null;
  }

  return JSON.parse(rows[0].state_json);
}

async function saveAppStateRecord(state) {
  const stateJson = JSON.stringify(state);
  const { rows } = await pool.query('SELECT id FROM app_state WHERE id = 1');

  if (rows.length > 0) {
    await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [stateJson]);
  } else {
    await pool.query('INSERT INTO app_state (id, state_json) VALUES (1, $1)', [stateJson]);
  }
}

async function syncRegisteredClientIntoAppState(user, profile) {
  const currentState = await getAppStateRecord();

  if (!currentState || !Array.isArray(currentState.clients)) {
    return;
  }

  const exists = currentState.clients.some((client) => client.id === user.id || client.email === user.email);

  if (exists) {
    return;
  }

  const nextClient = {
    id: user.id,
    name: user.name,
    businessName: profile?.business_name || user.name,
    email: user.email,
    phone: profile?.phone || '',
    altPhone: profile?.alt_phone || '',
    taxId: profile?.tax_id || '',
    address: profile?.address || '',
    city: profile?.city || '',
    province: profile?.province || '',
    preferredBranch: profile?.preferred_branch || '',
    category: 'Ferreteria',
    status: 'Activo',
    note: '',
    pendingBalance: 0,
    paymentHistory: [],
    activityLog: [],
    orderHistory: [],
    specialDiscount: 0,
    points: 0,
    lifetime_points: 0,
    available_points: 0,
    creditLimit: 0,
    createdAt: new Date().toISOString(),
  };

  currentState.clients = [nextClient, ...currentState.clients];
  await saveAppStateRecord(currentState);
}

async function findOrCreateConversation(userId, channel, conversationId = null) {
  if (conversationId) {
    const { rows } = await pool.query(
      'SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2 AND channel = $3 AND archived_at IS NULL',
      [conversationId, userId, channel],
    );

    if (rows[0]) {
      return rows[0];
    }
  }

  const { rows: existingRows } = await pool.query(
    `SELECT * FROM ai_conversations
     WHERE user_id = $1 AND channel = $2 AND archived_at IS NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId, channel],
  );

  if (existingRows[0]) {
    return existingRows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO ai_conversations (user_id, channel, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, channel, channel === 'admin' ? 'Asistente CRM' : 'Asistente Cliente'],
  );

  return rows[0];
}

async function appendConversationMessage(conversationId, role, content, toolCalls = null) {
  await pool.query(
    `INSERT INTO ai_messages (conversation_id, role, content, tool_calls_json)
     VALUES ($1, $2, $3, $4)`,
    [conversationId, role, content, toolCalls ? JSON.stringify(toolCalls) : null],
  );

  await pool.query('UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
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

    if (user.is_active === false) {
      return res.status(403).json({ ok: false, message: 'La cuenta estÃ¡ desactivada.' });
    }

    await ensureUserProfile(user.id, { business_name: user.name });
    await pool.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
    const profile = await getUserProfile(user.id);
    res.json({ ok: true, token, user: getUserResponse(user), profile });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ ok: false, message: 'Error interno en el login: ' + (error.message || "Unknown error") });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await initDB();
    const {
      email,
      password,
      name,
      businessName,
      phone,
      taxId,
      address,
      city,
      province,
      preferredBranch,
    } = req.body ?? {};

    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const safePassword = String(password ?? '');
    const safeName = String(name ?? businessName ?? '').trim();

    if (!normalizedEmail || !safePassword || !safeName) {
      return res.status(400).json({ ok: false, message: 'Email, contraseÃ±a y nombre son obligatorios.' });
    }

    if (safePassword.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contraseÃ±a debe tener al menos 6 caracteres.' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ ok: false, message: 'Ya existe una cuenta con ese email.' });
    }

    const passwordHash = bcrypt.hashSync(safePassword, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, role, name, is_active, created_at, updated_at)
       VALUES ($1, $2, 'client', $3, TRUE, NOW(), NOW())
       RETURNING *`,
      [normalizedEmail, passwordHash, safeName],
    );

    const user = rows[0];
    const profilePayload = {
      business_name: String(businessName ?? safeName).trim(),
      phone: String(phone ?? '').trim(),
      tax_id: String(taxId ?? '').trim(),
      address: String(address ?? '').trim(),
      city: String(city ?? '').trim(),
      province: String(province ?? '').trim(),
      preferred_branch: String(preferredBranch ?? '').trim(),
    };

    await ensureUserProfile(user.id, profilePayload);
    await syncRegisteredClientIntoAppState(user, profilePayload);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
    const profile = await getUserProfile(user.id);

    return res.status(201).json({
      ok: true,
      token,
      user: getUserResponse(user),
      profile,
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ ok: false, message: 'Error interno en el registro.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const payload = await getUserWithProfile(req.user.id);

    if (!payload) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ ok: true, ...payload });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error obteniendo la sesiÃ³n.' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const payload = await getUserWithProfile(req.user.id);

    if (!payload) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ ok: true, profile: payload.profile });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error obteniendo el perfil.' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const {
      name,
      business_name,
      phone,
      alt_phone,
      tax_id,
      address,
      city,
      province,
      preferred_branch,
      metadata_json,
    } = req.body ?? {};

    if (typeof name === 'string' && name.trim()) {
      await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [name.trim(), req.user.id]);
    }

    await ensureUserProfile(req.user.id, { business_name: business_name ?? name ?? req.user.name });
    await pool.query(
      `UPDATE user_profiles
       SET business_name = COALESCE($1, business_name),
           phone = COALESCE($2, phone),
           alt_phone = COALESCE($3, alt_phone),
           tax_id = COALESCE($4, tax_id),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           province = COALESCE($7, province),
           preferred_branch = COALESCE($8, preferred_branch),
           metadata_json = COALESCE($9, metadata_json)
       WHERE user_id = $10`,
      [
        business_name ?? null,
        phone ?? null,
        alt_phone ?? null,
        tax_id ?? null,
        address ?? null,
        city ?? null,
        province ?? null,
        preferred_branch ?? null,
        metadata_json ? JSON.stringify(metadata_json) : null,
        req.user.id,
      ],
    );

    const payload = await getUserWithProfile(req.user.id);
    return res.json({ ok: true, ...payload });
  } catch (error) {
    console.error('Profile Update Error:', error);
    return res.status(500).json({ ok: false, message: 'Error actualizando el perfil.' });
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

app.get('/api/ai/conversations', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const channel = req.query.channel ? String(req.query.channel) : null;
    const values = [req.user.id];
    let query = `
      SELECT id, user_id, channel, title, created_at, updated_at, archived_at
      FROM ai_conversations
      WHERE user_id = $1 AND archived_at IS NULL
    `;

    if (channel) {
      values.push(channel);
      query += ` AND channel = $2`;
    }

    query += ' ORDER BY updated_at DESC';
    const { rows } = await pool.query(query, values);
    return res.json({ ok: true, conversations: rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error obteniendo conversaciones.' });
  }
});

app.post('/api/ai/conversations', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const channel = req.body?.channel === 'admin' ? 'admin' : 'client';
    const title = String(req.body?.title ?? (channel === 'admin' ? 'Asistente CRM' : 'Asistente Cliente')).trim();
    const { rows } = await pool.query(
      `INSERT INTO ai_conversations (user_id, channel, title)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, channel, title, created_at, updated_at, archived_at`,
      [req.user.id, channel, title],
    );

    return res.status(201).json({ ok: true, conversation: rows[0] });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error creando conversaciÃ³n.' });
  }
});

app.get('/api/ai/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const conversationId = Number(req.params.id);

    if (!conversationId) {
      return res.status(400).json({ ok: false, message: 'ID de conversaciÃ³n invÃ¡lido.' });
    }

    const { rows: conversationRows } = await pool.query(
      'SELECT id FROM ai_conversations WHERE id = $1 AND user_id = $2',
      [conversationId, req.user.id],
    );

    if (conversationRows.length === 0) {
      return res.status(404).json({ ok: false, message: 'ConversaciÃ³n no encontrada.' });
    }

    const { rows } = await pool.query(
      `SELECT id, conversation_id, role, content, tool_calls_json, created_at
       FROM ai_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [conversationId],
    );

    return res.json({ ok: true, messages: rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error obteniendo mensajes.' });
  }
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
  // ── Clientes ──────────────────────────────────────────────────────────────
  {
    name: "get_client_details",
    description: "Busca un cliente por nombre, razon social o CUIT y devuelve su perfil completo: contacto, condicion IVA, saldo pendiente, historial de pedidos, ultima compra.",
    parameters: { type: "object", properties: { query: { type: "string", description: "Nombre, razon social o CUIT del cliente" } }, required: ["query"] }
  },
  {
    name: "update_client_status",
    description: "Cambia el estado de un cliente (ej. Activo, Inactivo, Bloqueado). Usar get_client_details para obtener el ID antes.",
    parameters: {
      type: "object",
      properties: { customerId: { type: "integer" }, status: { type: "string" } },
      required: ["customerId", "status"]
    }
  },
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
    name: "get_top_clients",
    description: "Devuelve el ranking de mejores clientes por facturacion en los ultimos N meses.",
    parameters: { type: "object", properties: { months: { type: "integer" }, limit: { type: "integer" } } }
  },
  {
    name: "get_overdue_balances",
    description: "Lista clientes con saldo pendiente mayor a un monto minimo, ordenados por deuda de mayor a menor.",
    parameters: { type: "object", properties: { min_amount: { type: "number", description: "Monto minimo de deuda (0 para todos)" } } }
  },
  {
    name: "create_account_movement",
    description: "Registra un movimiento en la cuenta corriente de un cliente: pago, nota de credito o ajuste. Usar get_client_details para obtener el ID.",
    parameters: {
      type: "object",
      properties: {
        clientId: { type: "integer" },
        tipo: { type: "string", description: "pago | nota_credito | ajuste" },
        monto: { type: "number" },
        descripcion: { type: "string" }
      },
      required: ["clientId", "tipo", "monto"]
    }
  },
  // ── Pedidos ───────────────────────────────────────────────────────────────
  {
    name: "get_pending_orders",
    description: "Devuelve todos los pedidos con estado Pendiente o En preparacion, con cliente, total y fecha.",
    parameters: { type: "object", properties: { limit: { type: "integer" } } }
  },
  {
    name: "update_order_status",
    description: "Cambia el estado de un pedido. Estados validos: Pendiente, En preparacion, Enviado, Entregado, Cancelado.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID del pedido" },
        newStatus: { type: "string", description: "Nuevo estado del pedido" }
      },
      required: ["orderId", "newStatus"]
    }
  },
  { name: "get_today_sales_summary", description: "Obtiene un resumen de los pedidos del dia de hoy.", parameters: { type: "object", properties: {} } },
  // ── Ventas y productos ────────────────────────────────────────────────────
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
    name: "get_top_products",
    description: "Devuelve el ranking de productos mas vendidos por unidades en los ultimos N meses.",
    parameters: { type: "object", properties: { months: { type: "integer" }, limit: { type: "integer" } } }
  },
  // ── Stock ─────────────────────────────────────────────────────────────────
  { name: "get_stock_alerts", description: "Consulta productos con stock critico o por debajo del minimo configurado.", parameters: { type: "object", properties: {} } },
  {
    name: "get_inventory_snapshot",
    description: "Devuelve una vista rapida del stock actual, incluyendo productos criticos, bajos y con mayor stock.",
    parameters: { type: "object", properties: { limit: { type: "integer" } } }
  },
  // ── Forecasting ───────────────────────────────────────────────────────────
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
  { name: "get_inventory_replenishment_suggestions", description: "Sugiere que comprar a fabrica basado en stock bajo.", parameters: { type: "object", properties: {} } }
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

  if (functionName === 'get_client_details') {
    const q = (args.query || '').toLowerCase();
    const client = state.clients.find(c =>
      (c.businessName || '').toLowerCase().includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.cuit || '').includes(q)
    );
    if (!client) return `No se encontro ningun cliente que coincida con "${args.query}".`;
    const clientOrders = state.orders.filter(o => o.clientId === client.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastOrder = clientOrders[0];
    const totalSpent = clientOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingBalance = Number(client.pendingBalance || 0);
    const creditLimit = Number(client.creditLimit || 0);
    return [
      `CLIENTE: ${client.businessName}`,
      `- ID interno: ${client.id}`,
      `- CUIT: ${client.cuit || 'N/D'}`,
      `- Condicion IVA: ${client.condicionIva || client.condicion_iva || 'N/D'}`,
      `- Contacto: ${client.contactName || 'N/D'} | Tel: ${client.phone || 'N/D'}`,
      `- Email: ${client.email || 'N/D'}`,
      `- Estado: ${client.status || 'N/D'}`,
      `- Saldo pendiente: $${pendingBalance.toLocaleString('es-AR')}`,
      `- Limite de credito: $${creditLimit.toLocaleString('es-AR')}`,
      `- Disponible: $${Math.max(creditLimit - pendingBalance, 0).toLocaleString('es-AR')}`,
      `- Pedidos totales: ${clientOrders.length}`,
      `- Facturacion historica: $${Math.round(totalSpent).toLocaleString('es-AR')}`,
      `- Ultima compra: ${lastOrder?.createdAt ? new Date(lastOrder.createdAt).toLocaleDateString('es-AR') : 'Sin compras'}`,
      `- Ultimo pedido: ${lastOrder ? `#${lastOrder.id} | $${(lastOrder.total || 0).toLocaleString('es-AR')} | estado: ${lastOrder.status}` : 'N/D'}`,
    ].join('\n');
  }
  if (functionName === 'get_pending_orders') {
    const limit = Math.max(Number(args?.limit) || 30, 1);
    const PENDING_STATUSES = ['Pendiente', 'En preparacion', 'En preparación', 'Confirmado', 'En proceso'];
    const pending = state.orders
      .filter(o => PENDING_STATUSES.some(s => s.toLowerCase() === (o.status || '').toLowerCase()))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, limit);
    if (pending.length === 0) return 'No hay pedidos pendientes en este momento.';
    const lines = pending.map(o => {
      const client = state.clients.find(c => c.id === o.clientId);
      return `- Pedido ${o.id} | ${client?.businessName || 'Cliente desconocido'} | $${(o.total || 0).toLocaleString('es-AR')} | estado: ${o.status} | fecha: ${o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-AR') : 'N/D'}`;
    });
    return [`PEDIDOS PENDIENTES (${pending.length}):`, ...lines].join('\n');
  }
  if (functionName === 'update_order_status') {
    const order = state.orders.find(o => String(o.id) === String(args.orderId));
    if (!order) return `No se encontro el pedido ${args.orderId}.`;
    const VALID_STATUSES = ['Pendiente', 'En preparacion', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];
    const matchedStatus = VALID_STATUSES.find(s => s.toLowerCase() === (args.newStatus || '').toLowerCase()) || args.newStatus;
    const prevStatus = order.status;
    order.status = matchedStatus;
    if (!order.history) order.history = [];
    order.history.push({ status: matchedStatus, date: new Date().toISOString(), note: 'Actualizado por asistente IA' });
    await pool.query('UPDATE app_state SET state_json = $1 WHERE id = 1', [JSON.stringify(state)]);
    return `Pedido ${args.orderId}: estado cambiado de "${prevStatus}" a "${matchedStatus}".`;
  }
  if (functionName === 'get_top_clients') {
    const months = Math.min(Math.max(Number(args?.months) || 3, 1), 12);
    const limit = Math.max(Number(args?.limit) || 10, 1);
    const relevantOrders = [];
    for (let offset = 0; offset < months; offset++) {
      const { start, end } = getMonthWindow(offset);
      relevantOrders.push(...getDeliveredLikeOrders(getOrdersInWindow(state.orders, start, end)));
    }
    const clientTotals = new Map();
    relevantOrders.forEach(o => {
      const current = clientTotals.get(o.clientId) || { revenue: 0, orders: 0 };
      current.revenue += Number(o.total) || 0;
      current.orders += 1;
      clientTotals.set(o.clientId, current);
    });
    const ranking = [...clientTotals.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, limit)
      .map(([clientId, data], i) => {
        const client = state.clients.find(c => c.id === clientId);
        return `${i + 1}. ${client?.businessName || 'Desconocido'} | $${Math.round(data.revenue).toLocaleString('es-AR')} | ${data.orders} pedidos`;
      });
    if (ranking.length === 0) return `Sin ventas en los ultimos ${months} meses.`;
    return [`TOP ${limit} CLIENTES (ultimos ${months} meses):`, ...ranking].join('\n');
  }
  if (functionName === 'get_top_products') {
    const months = Math.min(Math.max(Number(args?.months) || 3, 1), 12);
    const limit = Math.max(Number(args?.limit) || 10, 1);
    const relevantOrders = [];
    for (let offset = 0; offset < months; offset++) {
      const { start, end } = getMonthWindow(offset);
      relevantOrders.push(...getDeliveredLikeOrders(getOrdersInWindow(state.orders, start, end)));
    }
    const ranking = [...aggregateSalesByProduct(relevantOrders).values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit)
      .map((entry, i) => {
        const product = state.products.find(p => p.id === entry.productId);
        return `${i + 1}. ${product?.name || `Producto ${entry.productId}`} | ${entry.qty} unidades | $${Math.round(entry.revenue).toLocaleString('es-AR')} | ${entry.orders} pedidos`;
      });
    if (ranking.length === 0) return `Sin ventas registradas en los ultimos ${months} meses.`;
    return [`TOP ${limit} PRODUCTOS (ultimos ${months} meses):`, ...ranking].join('\n');
  }
  if (functionName === 'get_overdue_balances') {
    const minAmount = Math.max(Number(args?.min_amount) || 0, 0);
    const overdue = state.clients
      .filter(c => Number(c.pendingBalance || 0) > minAmount)
      .sort((a, b) => Number(b.pendingBalance) - Number(a.pendingBalance))
      .slice(0, 25);
    if (overdue.length === 0) return `No hay clientes con saldo pendiente${minAmount > 0 ? ` mayor a $${minAmount}` : ''}.`;
    const total = overdue.reduce((sum, c) => sum + Number(c.pendingBalance || 0), 0);
    const lines = overdue.map(c => {
      const balance = Number(c.pendingBalance || 0);
      const limit_ = Number(c.creditLimit || 0);
      const usage = limit_ > 0 ? ` (${Math.round(balance / limit_ * 100)}% del limite)` : '';
      return `- ${c.businessName}: $${balance.toLocaleString('es-AR')}${usage} | estado: ${c.status || 'N/D'}`;
    });
    return [`SALDOS PENDIENTES (${overdue.length} clientes):`, `Total: $${Math.round(total).toLocaleString('es-AR')}`, ...lines].join('\n');
  }
  if (functionName === 'create_account_movement') {
    const client = state.clients.find(c => c.id === Number(args.clientId));
    if (!client) return `Cliente ID ${args.clientId} no encontrado.`;
    const VALID_TIPOS = ['pago', 'nota_credito', 'ajuste'];
    const tipo = (args.tipo || '').toLowerCase();
    if (!VALID_TIPOS.includes(tipo)) return `Tipo invalido. Usa: ${VALID_TIPOS.join(', ')}.`;
    const monto = Number(args.monto);
    if (!monto || monto <= 0) return `El monto debe ser mayor a 0.`;
    await pool.query(
      'INSERT INTO cuenta_corriente (client_json_id, tipo, descripcion, monto, fecha) VALUES ($1, $2, $3, $4, NOW())',
      [client.id, tipo, args.descripcion || `${tipo} registrado por asistente IA`, monto]
    );
    return `Movimiento registrado: ${tipo} de $${monto.toLocaleString('es-AR')} para ${client.businessName}.`;
  }
  if (functionName === 'get_stock_alerts') {
    const critical = state.products.filter(p => {
      const stock = Number(p.currentStock ?? 0);
      const minimo = Number(p.stockMinimo ?? p.stock_minimo ?? 10);
      return stock <= minimo;
    });
    if (critical.length === 0) return "No hay alertas de stock.";
    return `PRODUCTOS CON STOCK BAJO O CRITICO:\n` + critical.map(p => {
      const stock = Number(p.currentStock ?? 0);
      const minimo = Number(p.stockMinimo ?? p.stock_minimo ?? 10);
      return `- ${p.name} (SKU ${p.sku}): stock actual ${stock} | minimo ${minimo} | deficit ${Math.max(minimo - stock, 0)}`;
    }).join('\n');
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
    const channel = requiredRole === 'admin' ? 'admin' : 'client';
    const conversation = await findOrCreateConversation(req.user.id, channel, req.body?.conversationId);
    const lastUserMessage = [...cleanMessages].reverse().find((message) => message.role === 'user');

    if (lastUserMessage?.content) {
      await appendConversationMessage(conversation.id, 'user', String(lastUserMessage.content), null);
    }

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
      await appendConversationMessage(
        conversation.id,
        'assistant',
        'Pude interpretar la consulta, pero la respuesta del modelo vino en un formato interno de herramientas. Reintentá la consulta o actualizá el despliegue si esto sigue pasando.',
        leakedToolCalls,
      );

      return res.json({
        ok: true,
        result: {
          ...data.result,
          response: 'Pude interpretar la consulta, pero la respuesta del modelo vino en un formato interno de herramientas. Reintentá la consulta o actualizá el despliegue si esto sigue pasando.',
        },
      });
    }

    await appendConversationMessage(
      conversation.id,
      'assistant',
      finalResponse || 'No se pudo obtener una respuesta.',
      toolCalls.length > 0 ? toolCalls : null,
    );

    return res.json({
      ok: true,
      conversationId: conversation.id,
      result: { ...data.result, response: finalResponse },
    });
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

// ── CUENTA CORRIENTE ────────────────────────────────────────────────────────
app.get('/api/admin/cuenta-corriente/:clientId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const clientId = parseInt(req.params.clientId, 10);
    const { rows } = await pool.query(
      `SELECT cc.*, u.name as creado_por_nombre
       FROM cuenta_corriente cc
       LEFT JOIN users u ON cc.creado_por = u.id
       WHERE cc.client_json_id = $1
       ORDER BY cc.fecha DESC`,
      [clientId]
    );
    // Calcular saldo
    const saldo = rows.reduce((acc, row) => acc + parseFloat(row.monto), 0);
    res.json({ ok: true, movimientos: rows, saldo });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/cuenta-corriente', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { client_json_id, tipo, descripcion, monto, referencia_id } = req.body;
    if (!client_json_id || !tipo || monto === undefined) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO cuenta_corriente (client_json_id, tipo, descripcion, monto, referencia_id, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [client_json_id, tipo, descripcion ?? null, parseFloat(monto), referencia_id ?? null, req.user.id]
    );
    res.status(201).json({ ok: true, movimiento: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.delete('/api/admin/cuenta-corriente/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    await pool.query('DELETE FROM cuenta_corriente WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── STOCK MOVIMIENTOS ────────────────────────────────────────────────────────
app.get('/api/admin/stock-movimientos/:productoId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query(
      `SELECT sm.*, u.name as creado_por_nombre
       FROM stock_movimientos sm
       LEFT JOIN users u ON sm.creado_por = u.id
       WHERE sm.producto_json_id = $1
       ORDER BY sm.fecha DESC
       LIMIT 100`,
      [req.params.productoId]
    );
    res.json({ ok: true, movimientos: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/stock-movimientos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { producto_json_id, tipo, cantidad, motivo, referencia_id } = req.body;
    if (!producto_json_id || !tipo || cantidad === undefined) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO stock_movimientos (producto_json_id, tipo, cantidad, motivo, referencia_id, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [String(producto_json_id), tipo, parseInt(cantidad, 10), motivo ?? null, referencia_id ?? null, req.user.id]
    );
    res.status(201).json({ ok: true, movimiento: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── LISTAS DE PRECIOS ────────────────────────────────────────────────────────
app.get('/api/admin/listas-precios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query('SELECT * FROM listas_precios ORDER BY nombre ASC');
    res.json({ ok: true, listas: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/listas-precios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { nombre, descripcion, activa } = req.body;
    if (!nombre) return res.status(400).json({ ok: false, message: 'Nombre requerido.' });
    const { rows } = await pool.query(
      'INSERT INTO listas_precios (nombre, descripcion, activa) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion ?? null, activa !== false]
    );
    res.status(201).json({ ok: true, lista: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.put('/api/admin/listas-precios/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { nombre, descripcion, activa } = req.body;
    const { rows } = await pool.query(
      `UPDATE listas_precios SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion),
       activa = COALESCE($3, activa) WHERE id = $4 RETURNING *`,
      [nombre ?? null, descripcion ?? null, activa ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Lista no encontrada.' });
    res.json({ ok: true, lista: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.delete('/api/admin/listas-precios/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    await pool.query('DELETE FROM listas_precios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.get('/api/admin/listas-precios/:id/precios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query(
      'SELECT * FROM productos_precio WHERE lista_precios_id = $1 ORDER BY producto_json_id',
      [req.params.id]
    );
    res.json({ ok: true, precios: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/listas-precios/:listId/precios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { producto_json_id, precio } = req.body;
    if (!producto_json_id || precio === undefined) return res.status(400).json({ ok: false, message: 'Faltan campos.' });
    const { rows } = await pool.query(
      `INSERT INTO productos_precio (producto_json_id, lista_precios_id, precio)
       VALUES ($1, $2, $3)
       ON CONFLICT (producto_json_id, lista_precios_id) DO UPDATE SET precio = EXCLUDED.precio
       RETURNING *`,
      [String(producto_json_id), req.params.listId, parseFloat(precio)]
    );
    res.status(201).json({ ok: true, precio: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── FACTURAS ─────────────────────────────────────────────────────────────────
app.get('/api/admin/facturas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { client_id, estado, tipo } = req.query;
    let query = 'SELECT f.*, u.name as creado_por_nombre FROM facturas f LEFT JOIN users u ON f.creado_por = u.id WHERE 1=1';
    const values = [];
    if (client_id) { values.push(client_id); query += ` AND f.client_json_id = $${values.length}`; }
    if (estado) { values.push(estado); query += ` AND f.estado = $${values.length}`; }
    if (tipo) { values.push(tipo); query += ` AND f.tipo = $${values.length}`; }
    query += ' ORDER BY f.creado_at DESC LIMIT 200';
    const { rows } = await pool.query(query, values);
    res.json({ ok: true, facturas: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/facturas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { tipo, client_json_id, pedido_json_id, subtotal, iva, total, items, datos_cliente } = req.body;
    if (!tipo || !client_json_id || !total) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos.' });
    }
    // Obtener próximo número
    const { rows: numRows } = await pool.query(
      `UPDATE factura_numeracion SET ultimo_numero = ultimo_numero + 1 WHERE tipo = $1 RETURNING ultimo_numero`,
      [tipo]
    );
    if (!numRows[0]) return res.status(400).json({ ok: false, message: `Tipo de factura inválido: ${tipo}` });
    const numero = numRows[0].ultimo_numero;

    const { rows } = await pool.query(
      `INSERT INTO facturas (numero, tipo, client_json_id, pedido_json_id, subtotal, iva, total, items, datos_cliente, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [numero, tipo, client_json_id, pedido_json_id ?? null, subtotal ?? 0, iva ?? 0, total,
       items ? JSON.stringify(items) : null, datos_cliente ? JSON.stringify(datos_cliente) : null, req.user.id]
    );
    res.status(201).json({ ok: true, factura: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.put('/api/admin/facturas/:id/anular', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query(
      `UPDATE facturas SET estado = 'anulada' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Factura no encontrada.' });
    res.json({ ok: true, factura: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── COTIZACIONES (Quotes) ─────────────────────────────────────────────────────
app.get('/api/admin/cotizaciones', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { estado } = req.query;
    let query = 'SELECT * FROM cotizaciones';
    const params = [];
    if (estado) {
      query += ' WHERE estado = $1';
      params.push(estado);
    }
    query += ' ORDER BY creado_at DESC LIMIT 200';
    const { rows } = await pool.query(query, params);
    res.json({ ok: true, cotizaciones: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/cotizaciones', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const {
      client_json_id, vencimiento, items, subtotal, descuento, total,
      datos_cliente, notas, estado,
    } = req.body;

    if (!client_json_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ ok: false, message: 'Cliente e items son requeridos.' });
    }

    // Auto-numbering: COT-YYYY-NNNN
    const year = new Date().getFullYear();
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) FROM cotizaciones WHERE numero LIKE $1",
      [`COT-${year}-%`]
    );
    const seq = (parseInt(countRows[0].count, 10) + 1).toString().padStart(4, '0');
    const numero = `COT-${year}-${seq}`;

    // Default vencimiento: +15 days from today
    const vencDate = vencimiento || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 15);
      return d.toISOString().slice(0, 10);
    })();

    const { rows } = await pool.query(
      `INSERT INTO cotizaciones
       (numero, client_json_id, vencimiento, estado, subtotal, descuento, total, items, datos_cliente, notas, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        numero,
        client_json_id,
        vencDate,
        estado || 'borrador',
        subtotal || 0,
        descuento || 0,
        total || 0,
        JSON.stringify(items),
        datos_cliente ? JSON.stringify(datos_cliente) : null,
        notas || null,
        req.user.id,
      ]
    );
    res.json({ ok: true, cotizacion: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.get('/api/admin/cotizaciones/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query('SELECT * FROM cotizaciones WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Cotización no encontrada.' });
    res.json({ ok: true, cotizacion: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.put('/api/admin/cotizaciones/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const {
      vencimiento, estado, items, subtotal, descuento, total, notas,
    } = req.body;

    const sets = [];
    const params = [];
    let i = 1;

    if (vencimiento !== undefined) { sets.push(`vencimiento = $${i++}`); params.push(vencimiento); }
    if (estado !== undefined) { sets.push(`estado = $${i++}`); params.push(estado); }
    if (items !== undefined) { sets.push(`items = $${i++}`); params.push(JSON.stringify(items)); }
    if (subtotal !== undefined) { sets.push(`subtotal = $${i++}`); params.push(subtotal); }
    if (descuento !== undefined) { sets.push(`descuento = $${i++}`); params.push(descuento); }
    if (total !== undefined) { sets.push(`total = $${i++}`); params.push(total); }
    if (notas !== undefined) { sets.push(`notas = $${i++}`); params.push(notas); }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      return res.status(400).json({ ok: false, message: 'Nada para actualizar.' });
    }

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE cotizaciones SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Cotización no encontrada.' });
    res.json({ ok: true, cotizacion: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.delete('/api/admin/cotizaciones/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rowCount } = await pool.query('DELETE FROM cotizaciones WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ ok: false, message: 'Cotización no encontrada.' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Convertir cotización en pedido (graba el orderId en la cotización y marca como convertida)
app.post('/api/admin/cotizaciones/:id/convertir', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { pedidoId } = req.body;
    if (!pedidoId) return res.status(400).json({ ok: false, message: 'pedidoId requerido.' });
    const { rows } = await pool.query(
      `UPDATE cotizaciones SET estado = 'convertida', pedido_json_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [pedidoId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Cotización no encontrada.' });
    res.json({ ok: true, cotizacion: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── USUARIOS ADMIN (Roles) ────────────────────────────────────────────────────
app.get('/api/admin/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query(
      `SELECT id, email, name, role, rol, is_active, created_at, last_login_at FROM users WHERE role = 'admin' ORDER BY name ASC`
    );
    res.json({ ok: true, usuarios: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/admin/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { email, name, password, rol } = req.body;
    if (!email || !name || !password) return res.status(400).json({ ok: false, message: 'Email, nombre y contraseña son requeridos.' });
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(409).json({ ok: false, message: 'Email ya registrado.' });
    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, role, name, rol, is_active) VALUES ($1, $2, 'admin', $3, $4, true) RETURNING id, email, name, role, rol, is_active`,
      [email.toLowerCase(), hash, name, rol || 'admin']
    );
    res.status(201).json({ ok: true, usuario: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.put('/api/admin/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await initDB();
    const { name, rol, is_active, password } = req.body;
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hash, req.params.id]);
    }
    const { rows } = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), rol = COALESCE($2, rol), is_active = COALESCE($3, is_active), updated_at = NOW()
       WHERE id = $4 AND role = 'admin' RETURNING id, email, name, role, rol, is_active`,
      [name ?? null, rol ?? null, is_active ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    res.json({ ok: true, usuario: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── DIRECCIONES DE ENTREGA (cliente) ─────────────────────────────────────────
app.get('/api/client/direcciones', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const { rows } = await pool.query(
      'SELECT * FROM direcciones_entrega WHERE user_id = $1 ORDER BY predeterminada DESC, id ASC',
      [req.user.id]
    );
    res.json({ ok: true, direcciones: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post('/api/client/direcciones', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const { nombre, calle, ciudad, provincia, codigo_postal, predeterminada } = req.body;
    if (predeterminada) {
      await pool.query('UPDATE direcciones_entrega SET predeterminada = false WHERE user_id = $1', [req.user.id]);
    }
    const { rows } = await pool.query(
      `INSERT INTO direcciones_entrega (user_id, nombre, calle, ciudad, provincia, codigo_postal, predeterminada)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, nombre ?? null, calle ?? null, ciudad ?? null, provincia ?? null, codigo_postal ?? null, predeterminada || false]
    );
    res.status(201).json({ ok: true, direccion: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.put('/api/client/direcciones/:id', authenticateToken, async (req, res) => {
  try {
    await initDB();
    const { nombre, calle, ciudad, provincia, codigo_postal, predeterminada } = req.body;
    if (predeterminada) {
      await pool.query('UPDATE direcciones_entrega SET predeterminada = false WHERE user_id = $1', [req.user.id]);
    }
    const { rows } = await pool.query(
      `UPDATE direcciones_entrega SET nombre = COALESCE($1, nombre), calle = COALESCE($2, calle),
       ciudad = COALESCE($3, ciudad), provincia = COALESCE($4, provincia),
       codigo_postal = COALESCE($5, codigo_postal), predeterminada = COALESCE($6, predeterminada)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [nombre ?? null, calle ?? null, ciudad ?? null, provincia ?? null, codigo_postal ?? null, predeterminada ?? null, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Dirección no encontrada.' });
    res.json({ ok: true, direccion: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.delete('/api/client/direcciones/:id', authenticateToken, async (req, res) => {
  try {
    await initDB();
    await pool.query('DELETE FROM direcciones_entrega WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ── CUENTA CORRIENTE (vista cliente) ─────────────────────────────────────────
app.get('/api/client/cuenta-corriente', authenticateToken, async (req, res) => {
  try {
    await initDB();
    // Encontrar el client_json_id del usuario actual via app_state
    const stateResult = await pool.query('SELECT state_json FROM app_state WHERE id = 1');
    if (!stateResult.rows[0]) return res.json({ ok: true, movimientos: [], saldo: 0 });
    const state = JSON.parse(stateResult.rows[0].state_json);
    const client = state.clients?.find((c) => c.email === req.user.email);
    if (!client) return res.json({ ok: true, movimientos: [], saldo: 0 });

    const { rows } = await pool.query(
      'SELECT * FROM cuenta_corriente WHERE client_json_id = $1 ORDER BY fecha DESC',
      [client.id]
    );
    const saldo = rows.reduce((acc, row) => acc + parseFloat(row.monto), 0);
    res.json({ ok: true, movimientos: rows, saldo, creditLimit: client.creditLimit ?? 0, pendingBalance: client.pendingBalance ?? 0 });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

export default app;


