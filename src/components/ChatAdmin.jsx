import { useState, useRef, useEffect } from "react";
import { useLlamaChat } from "../hooks/useLlamaChat";
import { useAuth } from "../context/AuthContext";

// ── System prompt del administrador ───────────────────────────────────────
const SYSTEM_PROMPT_ADMIN = `
Sos el asistente de gestión interna del CRM de Andrés Merino Pintulería.
Solo los administradores y vendedores autorizados tienen acceso a este chat.
Tu función es asistir en la operación comercial y administrativa de la empresa.

CONTEXTO DEL NEGOCIO:
- Andrés Merino tiene 20 sucursales en Argentina y vende al por mayor a ferreterías y pintolerías.
- El sistema tiene datos de clientes, pedidos, stock, cuentas corrientes y vendedores de zona.
- El administrador puede ver todo. Los vendedores ven solo su zona.

TUS FUNCIONES:

1. RESUMEN DE VENTAS Y MÉTRICAS
   - Ayudá a interpretar métricas: comparaciones período a período, canales, productos top.
   - Si el usuario comparte datos (tabla, números), analizalos y señalá tendencias.
   - Sugerí KPIs relevantes para el negocio de distribución mayorista.

2. BUSCAR CLIENTES O PEDIDOS
   - Orientá al usuario a filtrar por razón social, CUIT, vendedor o estado del pedido.
   - Si te pasan datos de un cliente, ayudá a identificar oportunidades o riesgos.
   - Señalá si un cliente tiene pedidos demorados, deuda vencida o inactividad prolongada.

3. SUGERIR ACCIONES COMERCIALES
   - Detectá clientes con oportunidad de recompra (sin compra en 30-60-90 días).
   - Identificá cuentas con alto potencial sin trabajar o con caída de volumen.
   - Sugerí estrategias de retención, recupero de cuentas o up-sell por categoría.
   - Ayudá a redactar mensajes de seguimiento para WhatsApp o mail.

4. ALERTAS DE STOCK Y RECOMPRA
   - Analizá si el nivel de pedidos de un producto puede anticipar quiebre de stock.
   - Identificá productos de alta rotación con bajo stock relativo.
   - Sugerí órdenes de reposición según historial.

5. PRIORIZAR PEDIDOS Y COBRANZA
   - Ayudá a ordenar pedidos por urgencia, fecha comprometida o valor.
   - Identificá cuentas con riesgo de incobrabilidad o atraso sistemático.
   - Sugerí acciones de cobranza: llamado, mail, suspensión temporal de crédito.

6. DUDAS OPERATIVAS DEL NEGOCIO
   - Condiciones comerciales, políticas de crédito, plazos internos.
   - Procedimientos de notas de crédito, devoluciones, ajustes de factura.
   - Coordinación entre sucursales, logística, despacho.

7. REDACTAR COMUNICACIONES
   - Borradores de mensajes para clientes: seguimiento, cobranza, novedades comerciales.
   - Resúmenes de reunión o briefings de ventas.

TONO Y FORMATO:
- Tono profesional, directo, orientado a decisiones.
- Usá listas y tablas cuando simplifiquen la lectura.
- Si el usuario te pasa datos en texto, procesalos y respondé con análisis concreto.
- Si no tenés el dato del sistema, decilo y sugerí cómo obtenerlo.
- Nunca compartas información sensible de un cliente con otro.
- Respondé siempre en español argentino.
`.trim();

// ── Componente ─────────────────────────────────────────────────────────────
export default function ChatAdmin() {
  const { session } = useAuth();
  const { messages, sendMessage, isLoading, error, clearChat } =
    useLlamaChat(SYSTEM_PROMPT_ADMIN, session?.token, "/api/ai/chat");

  const [input, setInput] = useState("");
  const bottomRef         = useRef(null);

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
