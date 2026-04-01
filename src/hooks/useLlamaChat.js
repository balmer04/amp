import { useCallback, useEffect, useRef, useState } from 'react'

function toConversationMessages(messages = []) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
}

export function useLlamaChat(systemPrompt, token, endpoint = '/api/ai/chat', options = {}) {
  void systemPrompt

  const channel = options.channel === 'admin' ? 'admin' : 'client'
  const defaultTitle = channel === 'admin' ? 'Asistente CRM' : 'Asistente Cliente'

  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrating, setIsHydrating] = useState(false)
  const [error, setError] = useState(null)
  const messagesRef = useRef([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const fetchConversations = useCallback(async () => {
    if (!token) {
      setConversations([])
      return []
    }

    const response = await fetch(`/api/ai/conversations?channel=${channel}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'No se pudo cargar el historial.')
    }

    const nextConversations = result.conversations ?? []
    setConversations(nextConversations)
    return nextConversations
  }, [channel, token])

  const loadConversationMessages = useCallback(
    async (targetConversationId) => {
      if (!token || !targetConversationId) {
        setConversationId(null)
        setMessages([])
        return
      }

      const response = await fetch(`/api/ai/conversations/${targetConversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'No se pudo cargar el detalle del historial.')
      }

      setConversationId(targetConversationId)
      setMessages(toConversationMessages(result.messages))
    },
    [token],
  )

  const createConversation = useCallback(async () => {
    if (!token) {
      setConversationId(null)
      return null
    }

    const response = await fetch('/api/ai/conversations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        title: defaultTitle,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'No se pudo crear una nueva conversacion.')
    }

    const nextConversation = result.conversation
    setConversationId(nextConversation.id)
    setConversations((current) => [nextConversation, ...current])
    return nextConversation.id
  }, [channel, defaultTitle, token])

  const loadConversation = useCallback(async () => {
    if (!token) {
      setMessages([])
      setConversationId(null)
      setConversations([])
      setError(null)
      return
    }

    setIsHydrating(true)
    setError(null)

    try {
      const nextConversations = await fetchConversations()
      const latestConversation = nextConversations[0]

      if (!latestConversation) {
        setConversationId(null)
        setMessages([])
        return
      }

      await loadConversationMessages(latestConversation.id)
    } catch (err) {
      console.error('useLlamaChat history error:', err)
      setConversationId(null)
      setConversations([])
      setMessages([])
      setError(err.message || 'No se pudo cargar el historial del chat.')
    } finally {
      setIsHydrating(false)
    }
  }, [fetchConversations, loadConversationMessages, token])

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  const openConversation = useCallback(
    async (targetConversationId) => {
      if (!targetConversationId || targetConversationId === conversationId) {
        return
      }

      setIsHydrating(true)
      setError(null)

      try {
        await loadConversationMessages(targetConversationId)
      } catch (err) {
        console.error('useLlamaChat open conversation error:', err)
        setError(err.message || 'No se pudo abrir la conversacion.')
      } finally {
        setIsHydrating(false)
      }
    },
    [conversationId, loadConversationMessages],
  )

  const sendMessage = useCallback(
    async (userText) => {
      if (!token || !userText.trim() || isLoading) {
        return
      }

      const userMsg = { role: 'user', content: userText.trim() }
      const history = [...messagesRef.current, userMsg]

      setMessages(history)
      setIsLoading(true)
      setError(null)

      try {
        const activeConversationId = conversationId ?? (await createConversation())

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: activeConversationId,
            messages: history,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData?.error || errData?.message || `Error HTTP ${response.status}`)
        }

        const data = await response.json()
        const assistantText = data?.result?.response || 'No se pudo obtener una respuesta.'

        if (data?.conversationId) {
          setConversationId(data.conversationId)
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }])
        await fetchConversations()
      } catch (err) {
        console.error('useLlamaChat error:', err)
        setError(err.message || 'Error de conexion con la IA.')
      } finally {
        setIsLoading(false)
      }
    },
    [conversationId, createConversation, endpoint, fetchConversations, isLoading, token],
  )

  const startNewConversation = useCallback(async () => {
    setError(null)
    setMessages([])

    if (!token) {
      setConversationId(null)
      return
    }

    try {
      await createConversation()
      await fetchConversations()
    } catch (err) {
      console.error('useLlamaChat clear error:', err)
      setConversationId(null)
      setError(err.message || 'No se pudo reiniciar el chat.')
    }
  }, [createConversation, fetchConversations, token])

  return {
    messages,
    conversations,
    sendMessage,
    openConversation,
    startNewConversation,
    isLoading: isLoading || isHydrating,
    error,
    clearChat: startNewConversation,
    conversationId,
  }
}
