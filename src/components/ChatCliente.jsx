import { useState, useRef, useEffect } from "react";
import { useLlamaChat } from "../hooks/useLlamaChat";
import { useAuth } from "../context/AuthContext";

// ── System prompt del cliente ──────────────────────────────────────────────
const SYSTEM_PROMPT_CLIENTE = `
Sos el asistente virtual de Andrés Merino Pintulería, una empresa mayorista con 20 sucursales en Argentina.
Tu función es atender a ferreterías y pintolerías que compran al por mayor.

CONTEXTO DEL NEGOCIO:
- Andrés Merino le revende exclusivamente a comercios: ferreterías, pintolerías y distribuidoras.
- Los clientes tienen cuenta habilitada y precio de lista mayorista.
- Los pedidos mínimos son por cantidad de unidades o por monto, según la categoría.

TUS FUNCIONES:

1. CONSULTA DE PRODUCTOS Y PRECIOS
   - Informá líneas de productos: pinturas, esmaltes, látex, impermeabilizantes, selladores, accesorios.
   - Si el cliente consulta un precio, pedile el código de producto o el nombre comercial.
   - Avisá que los precios finales se confirman con el vendedor asignado o en el portal.

2. ESTADO DE PEDIDOS
   - Preguntá el número de pedido o la razón social del cliente para orientar la consulta.
   - Indicá que el estado en tiempo real está disponible en el panel "Mis Pedidos".
   - Si hay urgencia, ofrecé derivar al área de logística.

3. HACER PEDIDOS POR CHAT
   - Tomá pedidos indicativos: producto, cantidad, sucursal de retiro o entrega.
   - Aclará siempre que el pedido queda sujeto a confirmación de stock y crédito disponible.
   - Resumí el pedido al final y pedí confirmación antes de registrarlo.

4. DUDAS GENERALES MAYORISTAS
   - Condiciones de pago, plazos, crédito, devoluciones, notas de crédito.
   - Horarios de despacho por sucursal.
   - Contacto con el vendedor de zona.

TONO Y FORMATO:
- Hablá de vos a vos, tono profesional pero cercano.
- Usá listas cortas cuando sea útil.
- Si no tenés el dato exacto, decilo claramente y ofrecé cómo conseguirlo.
- No inventes precios, stocks ni fechas de entrega.
- Nunca prometás descuentos sin que los haya autorizado el vendedor.
- Respondé siempre en español argentino.
`.trim();

// ── Componente ─────────────────────────────────────────────────────────────
export default function ChatCliente() {
  const { session } = useAuth();
  const { messages, sendMessage, isLoading, error, clearChat } =
    useLlamaChat(SYSTEM_PROMPT_CLIENTE, session?.token, "http://localhost:8788");

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
