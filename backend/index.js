const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN;

const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "meta-llama/Llama-3.1-8B-Instruct:fastest";

function buildMessages(message, history = [], userContext = {}) {
  const systemPrompt = `Eres ShiftBot, asistente experto en legislación laboral colombiana integrado en ShiftCalculator.
DATOS DEL USUARIO: Nombre: ${userContext.nombre || "Usuario"}, Tarifa/hora: $${userContext.tarifaPorHora || 6000} COP, Turnos: ${userContext.totalTurnos || 0}, Ganancias acumuladas: $${userContext.gananciasAcumuladas || 0} COP.
REGLAS: Responde SIEMPRE en español, breve y amigable. Experto en: recargo nocturno 35%, dominical 75%, festivo 100%, hora extra diurna 25%, hora extra nocturna 75% (Código Sustantivo del Trabajo colombiano). Usa los datos del usuario cuando sea relevante. Máximo 3 párrafos.`;

  return [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.text,
    })),
    { role: "user", content: message },
  ];
}

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [], userContext = {} } = req.body;
    console.log("📩 MENSAJE:", message);

    if (!message) return res.status(400).json({ error: "Falta el campo 'message'" });

    const messages = buildMessages(message, history, userContext);

    const response = await axios.post(
      HF_API_URL,
      { model: MODEL, messages, max_tokens: 500, temperature: 0.7, stream: false },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    console.log("✅ RESPUESTA:", reply?.substring(0, 150));

    if (!reply) return res.json({ reply: "No pude generar una respuesta, intenta de nuevo." });

    res.json({ reply });

  } catch (error) {
    console.error("❌ ERROR:");
    if (error.response) {
      console.error("STATUS:", error.response.status);
      console.error("DATA:", JSON.stringify(error.response.data).substring(0, 500));

      // Créditos agotados
      if (error.response.status === 402) {
        return res.status(402).json({
          error: "Créditos de HuggingFace agotados este mes. Recarga en huggingface.co/settings/billing",
        });
      }
    } else {
      console.error(error.message);
    }
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ShiftBot corriendo 🚀", model: MODEL }));

app.listen(3000, () => console.log("Servidor en http://localhost:3000"));