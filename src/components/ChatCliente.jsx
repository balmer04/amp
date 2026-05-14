import { useEffect, useMemo, useRef, useState } from 'react'
import { useLlamaChat } from '../hooks/useLlamaChat'
import { useAuth } from '../context/AuthContext'
import { SYSTEM_PROMPT_CLIENTE } from '../../shared/aiPrompts'

function formatConversationLabel(conversation, index) {
  const date = conversation?.updated_at ? new Date(conversation.updated_at) : null

  if (!date || Number.isNaN(date.getTime())) {
    return `Chat ${index + 1}`
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function ChatCliente() {
  const { session } = useAuth()
  const {
    messages,
    conversations,
    conversationId,
    sendMessage,
    openConversation,
    isLoading,
    error,
    clearChat,
  } = useLlamaChat(SYSTEM_PROMPT_CLIENTE, session?.token, '/api/ai/client/chat', {
    channel: 'client',
  })

  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const recentConversations = useMemo(() => conversations.slice(0, 6), [conversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const sugerencias = [
    'Que productos tienen disponibles?',
    'Quiero consultar un pedido',
    'Cuales son los plazos de entrega?',
  ]

  return (
    <div className="chat-wrapper chat-cliente">
      <div className="chat-header">
        <div className="chat-avatar">NF</div>
        <div className="chat-header-info">
          <p className="chat-name">Asistente Nexoft</p>
          <p className="chat-subtitle">Compras mayoristas · Consultas · Pedidos</p>
        </div>
        <button className="chat-clear-btn" onClick={clearChat} title="Nuevo chat">
          ↺
        </button>
      </div>

      <div className="chat-history-strip">
        <button type="button" className="chat-history-chip chat-history-chip--new" onClick={clearChat}>
          Nuevo chat
        </button>
        {recentConversations.map((conversation, index) => (
          <button
            key={conversation.id}
            type="button"
            className={
              conversation.id === conversationId
                ? 'chat-history-chip active'
                : 'chat-history-chip'
            }
            onClick={() => openConversation(conversation.id)}
          >
            {formatConversationLabel(conversation, index)}
          </button>
        ))}
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
  )
}
