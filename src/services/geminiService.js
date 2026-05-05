const BACKEND_URL = "http://192.168.0.11:3000/chat";

/**
 * Envía un mensaje al backend con historial y contexto del usuario.
 *
 * @param {Array}  history      - Mensajes anteriores: [{role: 'user'|'assistant', text: string}]
 * @param {string} userMessage  - El mensaje actual del usuario
 * @param {Object} userContext  - Datos del perfil y turnos del usuario
 * @returns {Promise<string>}   - Respuesta del asistente
 */
export async function sendMessageToAI(history, userMessage, userContext) {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      history,        // historial completo de la conversación
      userContext,    // datos del usuario (turnos, ganancias, tarifa)
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));

    if (response.status === 503) {
      throw new Error("El modelo está iniciando, espera unos segundos y reintenta.");
    }

    throw new Error(err.error || `Error del servidor: ${response.status}`);
  }

  const data = await response.json();

  if (!data.reply) {
    throw new Error("El servidor no devolvió respuesta.");
  }

  return data.reply;
}
