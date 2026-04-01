import { useEffect, useMemo, useRef, useState } from 'react'
import { useLlamaChat } from '../hooks/useLlamaChat'
import { useAuth } from '../context/AuthContext'
import { SYSTEM_PROMPT_ADMIN } from '../../shared/aiPrompts'

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

export default function ChatAdmin() {
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
  } = useLlamaChat(SYSTEM_PROMPT_ADMIN, session?.token, '/api/ai/admin/chat', {
    channel: 'admin',
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

  const shortcuts = [
    {
      label: 'Clientes sin compra en 60 dias',
      prompt: 'Mostrame que clientes no compraron en los ultimos 60 dias y que accion comercial sugeris.',
    },
    {
      label: 'Pedidos urgentes de hoy',
      prompt: 'Como priorizo los pedidos de hoy segun urgencia y fecha de entrega comprometida?',
    },
    {
      label: 'Alerta de stock',
      prompt: 'Que senales debo mirar para detectar riesgo de quiebre de stock en productos de alta rotacion?',
    },
    {
      label: 'Redactar seguimiento comercial',
      prompt: 'Ayudame a redactar un mensaje de seguimiento para un cliente que no compra hace 45 dias.',
    },
  ]

  return (
    <div className="chat-wrapper chat-admin">
      <div className="chat-header">
        <div className="chat-avatar chat-avatar--admin">CRM</div>
        <div className="chat-header-info">
          <p className="chat-name">Asistente CRM - Admin</p>
          <p className="chat-subtitle">Ventas · Clientes · Stock · Cobranza</p>
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
  )
}
