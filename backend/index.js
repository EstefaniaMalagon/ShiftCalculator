const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [], userContext = {} } = req.body;
    console.log("📩 MENSAJE RECIBIDO:", message);

    if (!message) return res.status(400).json({ error: "Falta el campo 'message'" });

    const systemPrompt = `Eres ShiftBot, asistente experto en legislación laboral colombiana. 
DATOS DEL USUARIO: Nombre: ${userContext.nombre || "Usuario"}, Tarifa/hora: $${userContext.tarifaPorHora || 6000} COP, Turnos: ${userContext.totalTurnos || 0}, Ganancias acumuladas: $${userContext.gananciasAcumuladas || 0} COP.
REGLAS: Responde SIEMPRE en español, breve y amable. Máximo 3 párrafos. Experto en: recargo nocturno 35%, dominical 75%, festivo 100%, hora extra diurna 25%, hora extra nocturna 75%.`;

    // Preparar historial para Groq (formato OpenAI)
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.text,
      })),
      { role: "user", content: message },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "";
    console.log("✅ RESPUESTA GENERADA POR GROQ");
    res.json({ reply });

  } catch (error) {
    console.error("❌ ERROR EN GROQ:", error.message);
    res.status(500).json({ error: "Error al conectar con la IA de Groq." });
  }
});

app.get("/", (req, res) => res.json({ status: "Servidor corriendo con Groq 🚀" }));

// --- RESTO DE ENDPOINTS ---

const crypto = require("crypto");
const resetTokens = {};

app.post("/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "El correo es requerido" });
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = Date.now() + 15 * 60 * 1000;
  resetTokens[email] = { token, expiry };
  console.log(`📧 Token generado para ${email}: ${token}`);
  res.json({ message: "Correo de recuperación enviado", debug_token: token });
});

app.post("/auth/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) return res.status(400).json({ error: "Faltan datos" });
  const record = resetTokens[email];
  if (!record || record.token !== token) return res.status(400).json({ error: "Token inválido" });
  if (Date.now() > record.expiry) return res.status(400).json({ error: "Token expirado" });
  delete resetTokens[email];
  res.json({ message: "Contraseña restablecida" });
});

// Simulación de DB para turnos
let shifts = [{ id: 'shift_1', userId: 'user_123', type: 'normal', totalHours: 8, extraHours: 0, earnings: 48000 }];

app.get('/shifts/:userId', (req, res) => {
  const userShifts = shifts.filter(s => s.userId === req.params.userId);
  res.json({ success: true, shifts: userShifts });
});

app.delete('/shifts/:shiftId', (req, res) => {
  const index = shifts.findIndex(s => s.id === req.params.shiftId);
  if (index !== -1) shifts.splice(index, 1);
  res.json({ success: true, message: 'Eliminado' });
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT} (GROQ READY)`));

module.exports = app;
