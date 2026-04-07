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

function renderBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

function MsgContent({ text }) {
  return (
    <div className="ai-msg-body">
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="ai-msg-gap" />

        const isList = trimmed.startsWith('- ') || trimmed.startsWith('• ')
        const isNumbered = /^\d+\.\s/.test(trimmed)
        const isHeader = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\d]{4,}:/.test(trimmed) && !isList

        if (isHeader) {
          return <p key={i} className="ai-line-header">{renderBold(trimmed)}</p>
        }
        if (isList) {
          return (
            <p key={i} className="ai-line-item">
              <span className="ai-bullet">›</span>
              {renderBold(trimmed.slice(2))}
            </p>
          )
        }
        if (isNumbered) {
          return <p key={i} className="ai-line-item ai-line-numbered">{renderBold(trimmed)}</p>
        }
        return <p key={i} className="ai-line">{renderBold(trimmed)}</p>
      })}
    </div>
  )
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
      label: '📦 Pedidos pendientes',
      prompt: 'Mostrame todos los pedidos que están pendientes o en preparación ahora mismo.',
    },
    {
      label: '💸 Deudores',
      prompt: 'Listame los clientes con saldo pendiente mayor a $0, ordenados por deuda.',
    },
    {
      label: '🏆 Top clientes del mes',
      prompt: 'Cuáles fueron los 10 mejores clientes por facturación en los últimos 3 meses?',
    },
    {
      label: '📉 Clientes inactivos 60 días',
      prompt: 'Qué clientes no compraron en los últimos 60 días? Dame acciones comerciales concretas para cada uno.',
    },
    {
      label: '🔴 Alertas de stock',
      prompt: 'Qué productos están por debajo del stock mínimo? Qué me recomendás reponer?',
    },
    {
      label: '📈 Resumen del mes',
      prompt: 'Dame el resumen de ventas del mes actual y comparalo con el mes anterior.',
    },
    {
      label: '🛒 Proyección de compra',
      prompt: 'En base a las ventas de los últimos 3 meses, qué productos debería pedir a fábrica este mes?',
    },
    {
      label: '✉️ Mensaje de reactivación',
      prompt: 'Ayudame a redactar un mensaje de WhatsApp para reactivar un cliente que no compra hace 45 días.',
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
            <p className="chat-empty-title">¿En qué gestión te ayudo hoy?</p>
            <div className="chat-sugerencias chat-sugerencias--grid">
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
            {msg.role === 'assistant'
              ? <MsgContent text={msg.content} />
              : <p>{msg.content}</p>
            }
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
