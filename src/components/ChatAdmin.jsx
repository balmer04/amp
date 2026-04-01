import { useState, useRef, useEffect } from "react";
import { useLlamaChat } from "../hooks/useLlamaChat";
import { useAuth } from "../context/AuthContext";

// ── System prompt del administrador ───────────────────────────────────────
const SYSTEM_PROMPT_ADMIN = `
# INTERNAL ASSISTANT — ANDRÉS MERINO PINTURERÍA CRM

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
- When facing ambiguity, ask only the minimum clarification needed to proceed.
`.trim();

// ── Componente ─────────────────────────────────────────────────────────────
export default function ChatAdmin() {
  const { session } = useAuth();
  const { messages, sendMessage, isLoading, error, clearChat } =
    useLlamaChat(SYSTEM_PROMPT_ADMIN, session?.token, "/api/ai/chat");

  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Accesos rápidos del CRM
  const shortcuts = [
    {
      label: "Clientes sin compra en 60 días",
      prompt: "Mostrame qué clientes no compraron en los últimos 60 días y qué acción comercial sugerís.",
    },
    {
      label: "Pedidos urgentes de hoy",
      prompt: "¿Cómo priorizo los pedidos de hoy según urgencia y fecha de entrega comprometida?",
    },
    {
      label: "Alerta de stock",
      prompt: "¿Qué señales debo mirar para detectar riesgo de quiebre de stock en productos de alta rotación?",
    },
    {
      label: "Redactar seguimiento comercial",
      prompt: "Ayudame a redactar un mensaje de seguimiento para un cliente que no compra hace 45 días.",
    },
  ];

  return (
    <div className="chat-wrapper chat-admin">

      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar chat-avatar--admin">CRM</div>
        <div className="chat-header-info">
          <p className="chat-name">Asistente CRM — Admin</p>
          <p className="chat-subtitle">Ventas · Clientes · Stock · Cobranza</p>
        </div>
        <button className="chat-clear-btn" onClick={clearChat} title="Limpiar sesión">↺</button>
      </div>

      {/* Mensajes */}
      <div className="chat-messages-area">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p>¿En qué gestión te ayudo hoy?</p>
            <div className="chat-sugerencias">
              {shortcuts.map((s) => (
                <button key={s.label} className="sugerencia-btn" onClick={() => sendMessage(s.prompt)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}

        {isLoading && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--loading">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        {error && <div className="chat-error-msg">{error}</div>}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          className="chat-textarea"
          rows={2}
          placeholder="Escribí tu consulta de gestión..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
