// IP local de tu PC obtenida mediante ipconfig
const BACKEND_URL = "http://192.168.1.16:3000/chat"; 

/**
 * Envía un mensaje al backend con historial y contexto del usuario.
 */
export async function sendMessageToAI(history, userMessage, userContext) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        history,
        userContext,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error ${response.status}`);
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Error en sendMessageToAI:", error.message);
    throw error;
  }
}
