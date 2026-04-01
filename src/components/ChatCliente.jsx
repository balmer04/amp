import { useState, useRef, useEffect } from "react";
import { useLlamaChat } from "../hooks/useLlamaChat";
import { useAuth } from "../context/AuthContext";

// ── System prompt del cliente ──────────────────────────────────────────────
const SYSTEM_PROMPT_CLIENTE = `
# CUSTOMER-FACING ASSISTANT — ANDRÉS MERINO PINTURERÍA

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
- Never volunteer information the customer didn't ask for.
`.trim();

// ── Componente ─────────────────────────────────────────────────────────────
export default function ChatCliente() {
  const { session } = useAuth();
  const { messages, sendMessage, isLoading, error, clearChat } =
    useLlamaChat(SYSTEM_PROMPT_CLIENTE, session?.token, "/api/ai/chat");

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

  const sugerencias = [
    "¿Qué productos tienen disponibles?",
    "Quiero consultar un pedido",
    "¿Cuáles son los plazos de entrega?",
  ];

  return (
    <div className="chat-wrapper chat-cliente">

      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar">AM</div>
        <div className="chat-header-info">
          <p className="chat-name">Asistente Andrés Merino</p>
          <p className="chat-subtitle">Compras mayoristas · Consultas · Pedidos</p>
        </div>
        <button className="chat-clear-btn" onClick={clearChat} title="Limpiar chat">↺</button>
      </div>

      {/* Mensajes */}
      <div className="chat-messages-area">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p>Hola, ¿en qué te puedo ayudar hoy?</p>
            <div className="chat-sugerencias">
              {sugerencias.map((s) => (
                <button key={s} className="sugerencia-btn" onClick={() => sendMessage(s)}>
                  {s}
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
          placeholder="Escribí tu consulta..."
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
