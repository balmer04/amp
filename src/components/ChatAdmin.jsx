import { useEffect, useMemo, useRef, useState } from 'react'
import { useLlamaChat } from '../hooks/useLlamaChat'
import { useAuth } from '../context/AuthContext'
import { SYSTEM_PROMPT_ADMIN } from '../../shared/aiPrompts'

const AR_TZ = 'America/Argentina/Buenos_Aires'

function formatConversationLabel(conversation, index) {
  const date = conversation?.updated_at ? new Date(conversation.updated_at) : null
  if (!date || Number.isNaN(date.getTime())) return `Conversación ${index + 1}`
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: AR_TZ, day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function renderMarkdown(text) {
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
    <div className="aic-msg-body">
      {text.split('\n').map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="aic-msg-gap" />
        const isList = t.startsWith('- ') || t.startsWith('• ')
        const isNumbered = /^\d+\.\s/.test(t)
        const isHeader = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\d]{3,}:/.test(t) && !isList
        if (isHeader) return (
          <p key={i} className="aic-line-header">{renderMarkdown(t)}</p>
        )
        if (isList) return (
          <p key={i} className="aic-line-item">
            <span className="aic-bullet">›</span>
            {renderMarkdown(t.slice(2))}
          </p>
        )
        if (isNumbered) return (
          <p key={i} className="aic-line-item">{renderMarkdown(t)}</p>
        )
        return <p key={i} className="aic-line">{renderMarkdown(t)}</p>
      })}
    </div>
  )
}

const SHORTCUTS = [
  {
    icon: '📋',
    label: 'Pedidos pendientes',
    desc: 'Ver todos en espera',
    prompt: 'Mostrame todos los pedidos que están pendientes o en preparación ahora mismo.',
  },
  {
    icon: '💰',
    label: 'Deudores',
    desc: 'Clientes con saldo',
    prompt: 'Listame los clientes con saldo pendiente mayor a $0, ordenados por deuda.',
  },
  {
    icon: '🏆',
    label: 'Top clientes',
    desc: 'Ranking del trimestre',
    prompt: 'Cuáles fueron los 10 mejores clientes por facturación en los últimos 3 meses?',
  },
  {
    icon: '⚠️',
    label: 'Clientes en riesgo',
    desc: 'Sin compras +60 días',
    prompt: 'Qué clientes no compraron en los últimos 60 días? Dame acciones comerciales concretas para cada uno.',
  },
  {
    icon: '📦',
    label: 'Alertas de stock',
    desc: 'Productos por debajo del mínimo',
    prompt: 'Qué productos están por debajo del stock mínimo? Qué me recomendás reponer?',
  },
  {
    icon: '📊',
    label: 'Resumen del mes',
    desc: 'Ventas vs mes anterior',
    prompt: 'Dame el resumen de ventas del mes actual y comparalo con el mes anterior.',
  },
  {
    icon: '🔮',
    label: 'Proyección de compra',
    desc: 'Qué pedir a fábrica',
    prompt: 'En base a las ventas de los últimos 3 meses, qué productos debería pedir a fábrica este mes?',
  },
  {
    icon: '✉️',
    label: 'Reactivar cliente',
    desc: 'Mensaje para WhatsApp',
    prompt: 'Ayudame a redactar un mensaje de WhatsApp para reactivar un cliente que no compra hace 45 días.',
  },
]

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const recentConversations = useMemo(() => conversations.slice(0, 12), [conversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleShortcut = (prompt) => {
    sendMessage(prompt)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="aic-shell">
      {/* ── Sidebar ── */}
      <aside className={`aic-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div className="aic-sidebar-head">
          <span className="aic-sidebar-title">Historial</span>
          <button
            type="button"
            className="aic-sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <button type="button" className="aic-new-chat-btn" onClick={clearChat}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Nueva conversación
            </button>

            <div className="aic-conv-list">
              {recentConversations.length === 0 ? (
                <span className="aic-conv-empty">Sin conversaciones anteriores</span>
              ) : recentConversations.map((conv, i) => (
                <button
                  key={conv.id}
                  type="button"
                  className={`aic-conv-item${conv.id === conversationId ? ' active' : ''}`}
                  onClick={() => openConversation(conv.id)}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 5.5h12M4 9h8M4 12.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span>{formatConversationLabel(conv, i)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* ── Main panel ── */}
      <div className="aic-main">
        {/* Header */}
        <div className="aic-header">
          <div className="aic-header-left">
            <div className="aic-header-avatar">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m12 4 1.6 3.6L17 9l-3.4 1.4L12 14l-1.6-3.6L7 9l3.4-1.4z" fill="currentColor"/>
                <path d="M18 15.5 19 18l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div className="aic-header-title">Asistente IA — Admin</div>
              <div className="aic-header-sub">
                <span className="aic-status-dot" />
                Conectado · Acceso a datos en tiempo real
              </div>
            </div>
          </div>
          <div className="aic-header-actions">
            {!sidebarOpen && (
              <button
                type="button"
                className="aic-hdr-btn"
                onClick={() => setSidebarOpen(true)}
                title="Mostrar historial"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 5h14M3 10h14M3 15h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <button
              type="button"
              className="aic-hdr-btn"
              onClick={clearChat}
              title="Nueva conversación"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="aic-messages">
          {isEmpty && (
            <div className="aic-empty">
              <div className="aic-empty-icon">
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <path d="m24 8 3.2 7.2L35 18l-7.8 3.2L24 29l-3.2-7.8L13 18l7.8-3.2z" fill="#1A1FBE" fillOpacity=".9"/>
                  <path d="M37 32 39 37l5 2-5 2-2 5-2-5-5-2 5-2z" fill="#1A1FBE" fillOpacity=".5"/>
                </svg>
              </div>
              <h3 className="aic-empty-title">¿En qué te ayudo hoy?</h3>
              <p className="aic-empty-sub">
                Tengo acceso a todos los datos del negocio en tiempo real —
                clientes, pedidos, stock, cobranzas.
              </p>

              <div className="aic-shortcuts">
                {SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className="aic-shortcut"
                    onClick={() => handleShortcut(s.prompt)}
                  >
                    <span className="aic-shortcut-icon">{s.icon}</span>
                    <span className="aic-shortcut-body">
                      <span className="aic-shortcut-label">{s.label}</span>
                      <span className="aic-shortcut-desc">{s.desc}</span>
                    </span>
                    <svg className="aic-shortcut-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`aic-bubble aic-bubble--${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="aic-bubble-avatar">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m10 3 1.4 3.1L15 7.5l-3.6 1.4L10 12l-1.4-3.6L5 7.5l3.6-1.4z" fill="currentColor"/>
                  </svg>
                </div>
              )}
              <div className="aic-bubble-body">
                {msg.role === 'assistant'
                  ? <MsgContent text={msg.content} />
                  : <p className="aic-user-text">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="aic-bubble aic-bubble--assistant">
              <div className="aic-bubble-avatar">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m10 3 1.4 3.1L15 7.5l-3.6 1.4L10 12l-1.4-3.6L5 7.5l3.6-1.4z" fill="currentColor"/>
                </svg>
              </div>
              <div className="aic-bubble-body aic-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="aic-error">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{width:16,height:16,flexShrink:0}}>
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="aic-input-wrap">
          <div className="aic-input-box">
            <textarea
              ref={textareaRef}
              className="aic-textarea"
              rows={2}
              placeholder="Escribí tu consulta de gestión… (Enter para enviar, Shift+Enter para salto de línea)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              type="button"
              className="aic-send-btn"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              title="Enviar (Enter)"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 10 17 3l-7 14-1.5-5.5z" fill="currentColor"/>
              </svg>
              Enviar
            </button>
          </div>
          <div className="aic-input-hint">
            Acceso en tiempo real a clientes, pedidos y stock del sistema.
          </div>
        </div>
      </div>
    </div>
  )
}
