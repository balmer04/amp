import { useState, useRef, useEffect } from "react";
import { useLlamaChat } from "../hooks/useLlamaChat";
import { useAuth } from "../context/AuthContext";
import { SYSTEM_PROMPT_ADMIN } from "../../shared/aiPrompts";

export default function ChatAdmin() {
  const { session } = useAuth();
  const { messages, sendMessage, isLoading, error, clearChat } =
    useLlamaChat(SYSTEM_PROMPT_ADMIN, session?.token, "/api/ai/admin/chat");

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

  const shortcuts = [
    {
      label: "Clientes sin compra en 60 dias",
      prompt: "Mostrame que clientes no compraron en los ultimos 60 dias y que accion comercial sugeris.",
    },
    {
      label: "Pedidos urgentes de hoy",
      prompt: "Como priorizo los pedidos de hoy segun urgencia y fecha de entrega comprometida?",
    },
    {
      label: "Alerta de stock",
      prompt: "Que senales debo mirar para detectar riesgo de quiebre de stock en productos de alta rotacion?",
    },
    {
      label: "Redactar seguimiento comercial",
      prompt: "Ayudame a redactar un mensaje de seguimiento para un cliente que no compra hace 45 dias.",
    },
  ];

  return (
    <div className="chat-wrapper chat-admin">
      <div className="chat-header">
        <div className="chat-avatar chat-avatar--admin">CRM</div>
        <div className="chat-header-info">
          <p className="chat-name">Asistente CRM - Admin</p>
          <p className="chat-subtitle">Ventas · Clientes · Stock · Cobranza</p>
        </div>
        <button className="chat-clear-btn" onClick={clearChat} title="Limpiar sesion">
          ↺
        </button>
      </div>

      <div className="chat-messages-area">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p>En que gestion te ayudo hoy?</p>
            <div className="chat-sugerencias">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.label}
                  className="sugerencia-btn"
                  onClick={() => sendMessage(shortcut.prompt)}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble chat-bubble--${msg.role}`}>
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

      <div className="chat-input-area">
        <textarea
          className="chat-textarea"
          rows={2}
          placeholder="Escribi tu consulta de gestion..."
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
