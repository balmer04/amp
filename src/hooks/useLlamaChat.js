import { useState, useCallback } from "react";

export function useLlamaChat(systemPrompt, token, endpoint = '/api/ai/chat') {
  void systemPrompt;
  const [messages, setMessages]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim()) return;

    const userMsg = { role: "user", content: userText.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    const history = [...messages, userMsg];

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          messages: history,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.message || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data?.result?.response || "No se pudo obtener una respuesta.";

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      console.error("useLlamaChat error:", err);
      setError(err.message || "Error de conexión con la IA.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, token, endpoint, systemPrompt]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sendMessage, isLoading, error, clearChat };
}
