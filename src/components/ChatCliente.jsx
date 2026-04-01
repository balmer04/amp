import { useState, useRef, useEffect } from "react";
import { useLlamaChat } from "../hooks/useLlamaChat";
import { useAuth } from "../context/AuthContext";
import { SYSTEM_PROMPT_CLIENTE } from "../../shared/aiPrompts";

export default function ChatCliente() {
  const { session } = useAuth();
  const { messages, sendMessage, isLoading, error, clearChat } =
    useLlamaChat(SYSTEM_PROMPT_CLIENTE, session?.token, "/api/ai/client/chat");

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
    "Que productos tienen disponibles?",
    "Quiero consultar un pedido",
    "Cuales son los plazos de entrega?",
  ];

  return (
    <div className="chat-wrapper chat-cliente">
      <div className="chat-header">
        <div className="chat-avatar">AM</div>
        <div className="chat-header-info">
          <p className="chat-name">Asistente Andres Merino</p>
          <p className="chat-subtitle">Compras mayoristas · Consultas · Pedidos</p>
        </div>
        <button className="chat-clear-btn" onClick={clearChat} title="Limpiar chat">
          ↺
        </button>
      </div>

      <div className="chat-messages-area">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p>Hola, en que te puedo ayudar hoy?</p>
            <div className="chat-sugerencias">
              {sugerencias.map((sugerencia) => (
                <button
                  key={sugerencia}
                  className="sugerencia-btn"
                  onClick={() => sendMessage(sugerencia)}
                >
                  {sugerencia}
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
          placeholder="Escribi tu consulta..."
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
