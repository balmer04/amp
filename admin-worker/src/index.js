export default {
  async fetch(request, env) {
    // 1. Manejo de CORS (Seguridad en el navegador)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // ¡OJO! En producción te sugiero cambiar "*" por "https://tu-dominio.com"
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Respuesta rápida para el pre-flight request (OPTIONS) que hace React antes de un POST
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. SEGURIDAD VITAL: Verificación del token de Admin
    // Solo permitimos avanzar si el Authorization header trae un token idéntico al que guardamos en Cloudflare
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${env.ADMIN_SECRET_TOKEN}`) {
      return new Response(JSON.stringify({ error: "No autorizado. Token de Admin inválido o ausente." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      // 3. Obtener el cuerpo de la petición (lo que manda useLlamaChat.js)
      const data = await request.json();
      const messages = data.messages || [];

      if (messages.length === 0) {
         return new Response(JSON.stringify({ error: "El array de mensajes está vacío." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }

      // 4. Llamada directa a la IA de Cloudflare Workers AI
      // Usamos Llama 3 pero puedes cambiarlo a "@cf/meta/llama-3-70b-instruct" si requieres respuestas más complejas e inteligentes para el administrador
      const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: messages
      });

      // 5. Devolver resultado a React
      return new Response(JSON.stringify({ result: aiResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("Worker Error:", error);
      return new Response(JSON.stringify({ error: "Error en el servidor de IA", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
