// ENDPOINT CHATBOT IA Hugging Face

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

app.get("/", (req, res) => res.json({ status: "Servidor corriendo 🚀"}));


// ENDPOINT RESTABLECER CONTRASEÑA

const crypto = require("crypto");

const resetTokens = {}; // temporal (base de datos)

// 1. Solicitar recuperación
app.post("/auth/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "El correo es requerido" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = Date.now() + 15 * 60 * 1000; // 15 minutos

  resetTokens[email] = { token, expiry };

  console.log(`📧 Token generado para ${email}: ${token}`);

  res.json({
    message: "Correo de recuperación enviado correctamente",
    debug_token: token, // solo para pruebas
  });
});

// 2. Restablecer contraseña
app.post("/auth/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: "Correo, token y nueva contraseña son requeridos" });
  }

  const record = resetTokens[email];

  if (!record || record.token !== token) {
    return res.status(400).json({ error: "Token inválido" });
  }

  if (Date.now() > record.expiry) {
    delete resetTokens[email];
    return res.status(400).json({ error: "El token ha expirado" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener mínimo 6 caracteres" });
  }

  delete resetTokens[email];
  console.log(`✅ Contraseña restablecida para: ${email}`);

  res.json({ message: "Contraseña restablecida correctamente" });
});


// ENDPOINT CREAR TURNO

// Simulación de autenticación (para pruebas)
function requireAuth(req, res, next) {
  req.user = { uid: 'user_123' }; // Simula usuario autenticado
  next();
}

// Simulación de cálculo de horas y ganancias
function calculateShiftEarnings({ startTime, endTime, type }, hourlyRate = 6000) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalHours = (end - start) / (1000 * 60 * 60);
  const extraHours = totalHours > 8 ? totalHours - 8 : 0;
  let earnings = totalHours * hourlyRate;
  if (type === 'nocturno') earnings *= 1.35;
  if (type === 'dominical') earnings *= 1.75;
  if (type === 'festivo') earnings *= 2;
  return { totalHours, extraHours, earnings: Math.round(earnings) };
}

app.post('/shifts', requireAuth, (req, res) => {
  const { date, startTime, endTime, type } = req.body;

  if (!date || !startTime || !endTime || !type) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos: date, startTime, endTime, type'
    });
  }

  const result = calculateShiftEarnings({ startTime, endTime, type });

  const shiftId = 'shift_' + Math.random().toString(36).substring(2, 8);

  return res.json({
    success: true,
    message: 'Turno creado exitosamente',
    shift: {
      id: shiftId,
      userId: req.user.uid,
      totalHours: result.totalHours,
      extraHours: result.extraHours,
      earnings: result.earnings,
    }
  });
});


// ENDPOINT GESTIÓN DE TURNOS

// Base de datos simulada
let shifts = [
  {
    id: 'shift_1',
    userId: 'user_123',
    type: 'normal',
    totalHours: 8,
    extraHours: 0,
    earnings: 48000
  },
  {
    id: 'shift_2',
    userId: 'user_123',
    type: 'nocturno',
    totalHours: 10,
    extraHours: 2,
    earnings: 81000
  }
];

// OBTENER TURNOS
app.get('/shifts/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId es requerido' });
  }
  const userShifts = shifts.filter(shift => shift.userId === userId);
  return res.json({ success: true, count: userShifts.length, shifts: userShifts });
});

// EDITAR TURNO
app.put('/shifts/:shiftId', requireAuth, (req, res) => {
  const { shiftId } = req.params;
  const { type, totalHours } = req.body;
  const shift = shifts.find(s => s.id === shiftId);
  if (!shift) {
    return res.status(400).json({ success: false, error: 'Turno no encontrado' });
  }
  if (type) shift.type = type;
  if (totalHours) {
    shift.totalHours = totalHours;
    shift.extraHours = totalHours > 8 ? totalHours - 8 : 0;
    shift.earnings = totalHours * 6000;
    if (type === 'nocturno') shift.earnings *= 1.35;
    if (type === 'dominical') shift.earnings *= 1.75;
    if (type === 'festivo') shift.earnings *= 2;
    shift.earnings = Math.round(shift.earnings);
  }
  return res.json({ success: true, message: 'Turno actualizado exitosamente', shift });
});


// ELIMINAR TURNO
app.delete('/shifts/:shiftId', requireAuth, (req, res) => {
  const { shiftId } = req.params;
  const shiftIndex = shifts.findIndex(shift => shift.id === shiftId);
  if (shiftIndex === -1) {
    return res.status(400).json({ success: false, error: 'Turno no encontrado' });
  }
  shifts.splice(shiftIndex, 1);
  return res.json({ success: true, message: 'Turno eliminado exitosamente', shiftId });
});


// CALCULAR SALARIO DEL MES
app.get('/salary/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const userShifts = shifts.filter(shift => shift.userId === userId);
  if (userShifts.length === 0) {
    return res.status(400).json({ success: false, error: 'No hay turnos registrados' });
  }
  let totalHours = 0, extraHours = 0, totalEarnings = 0;
  userShifts.forEach(shift => {
    totalHours += shift.totalHours;
    extraHours += shift.extraHours;
    totalEarnings += shift.earnings;
  });
  return res.json({
    success: true,
    month: 'mayo 2026',
    totalShifts: userShifts.length,
    totalHours,
    extraHours,
    totalEarnings
  });
});

app.listen(3000, () => console.log("Servidor en http://localhost:3000"));