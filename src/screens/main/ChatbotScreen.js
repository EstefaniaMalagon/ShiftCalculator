import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useShifts } from '../../hooks/useShifts';
import { sendMessageToAI } from '../../services/geminiService';
import { formatCurrency } from '../../utils/salaryCalculator';
 
// ————————————————————————————
// Mensajes de bienvenida iniciales
// ————————————————————————————
const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: '¡Hola! Soy tu asistente de ShiftCalculator 🤖\n\nPuedo ayudarte con:\n• 💰 Calcular recargos laborales\n• 📋 Interpretar tus turnos y ganancias\n• ⚖️ Dudas sobre la ley laboral colombiana\n• 💡 Consejos financieros\n\n¿En qué te puedo ayudar hoy?',
  timestamp: new Date(),
};
 
const QUICK_QUESTIONS = [
  '¿Cuánto es el recargo dominical?',
  '¿Cómo se calcula la hora extra nocturna?',
  'Explícame mis ganancias del mes',
  '¿Cuántas horas puedo trabajar al día?',
];
 
export default function ChatbotScreen({ navigation }) {
  const { userProfile } = useAuth();
  const { shifts } = useShifts();
  const scrollRef = useRef(null);
 
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
 
  // Auto-scroll al último mensaje
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);
 
  // Construimos contexto del usuario para enriquecer las respuestas de Gemini
  function buildUserContext() {
    const recentShifts = shifts.slice(0, 5);
    const totalEarnings = shifts.reduce((sum, s) => sum + (s.earnings || 0), 0);
    return {
      nombre: userProfile?.name || 'Usuario',
      tarifaPorHora: userProfile?.hourlyRate || 6000,
      totalTurnos: shifts.length,
      gananciasAcumuladas: totalEarnings,
      ultimosTurnos: recentShifts.map((s) => ({
        fecha: s.date,
        tipo: s.type,
        horas: s.totalHours,
        ganancias: s.earnings,
      })),
    };
  }
 
  async function handleSend(textOverride = null) {
    const text = (textOverride || inputText).trim();
    if (!text || isLoading) return;
 
    setInputText('');
    setError('');
 
    // Agregamos el mensaje del usuario
    const userMsg = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
 
    try {
      // Historial sin el mensaje de bienvenida (es estático)
      const history = updatedMessages
        .filter((m) => m.id !== 'welcome')
        .slice(0, -1) // excluye el mensaje que acabamos de agregar (ya va en userMessage)
        .map((m) => ({ role: m.role, text: m.text }));
 
      const reply = await sendMessageToAI(history, text, buildUserContext());
 
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + '_ai', role: 'assistant', text: reply, timestamp: new Date() },
      ]);
    } catch (err) {
      setError('⚠️ Error al conectar con la IA. Verifica tu API Key o conexión.');
      console.error('Gemini error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }
 
  function formatTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
 
  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>🤖</Text>
            <View style={styles.onlineIndicator} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Asistente IA</Text>
            <Text style={styles.headerSubtitle}>Hugging Face</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>
 
      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} formatTime={formatTime} />
          ))}
 
          {/* Indicador de "escribiendo..." */}
          {isLoading && (
            <View style={[styles.bubbleContainer, styles.bubbleLeft]}>
              <View style={styles.botAvatar}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#00D4FF" />
                <Text style={styles.typingText}>Pensando...</Text>
              </View>
            </View>
          )}
 
          {/* Error */}
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
 
          {/* Preguntas rápidas (solo si no hay mensajes del usuario aún) */}
          {messages.length === 1 && !isLoading && (
            <View style={styles.quickQuestionsContainer}>
              <Text style={styles.quickTitle}>Preguntas frecuentes:</Text>
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => handleSend(q)}>
                  <Text style={styles.quickBtnText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
 
        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor="#4A5568"
            multiline
            maxLength={500}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
 
// ————————————————————————————
// Componente de burbuja de mensaje
// ————————————————————————————
function MessageBubble({ message, formatTime }) {
  const isUser = message.role === 'user';
 
  return (
    <View style={[styles.bubbleContainer, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Text style={{ fontSize: 14 }}>🤖</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
          {message.text}
        </Text>
        <Text style={[styles.bubbleTime, isUser ? styles.bubbleTimeUser : styles.bubbleTimeBot]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}
 
// ————————————————————————————
// Estilos
// ————————————————————————————
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
 
  // Header
  header: {
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarContainer: { position: 'relative' },
  avatarEmoji: { fontSize: 32 },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0A0E1A',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSubtitle: { color: '#64748B', fontSize: 11, marginTop: 1 },
 
  // Messages
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
 
  // Bubble
  bubbleContainer: { flexDirection: 'row', marginBottom: 12, maxWidth: '85%' },
  bubbleLeft: { alignSelf: 'flex-start', alignItems: 'flex-end' },
  bubbleRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleUser: {
    backgroundColor: '#00D4FF',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#0A0E1A', fontWeight: '500' },
  bubbleTextBot: { color: '#E2E8F0' },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeUser: { color: '#0A0E1A80', textAlign: 'right' },
  bubbleTimeBot: { color: '#64748B' },
 
  // Typing
  typingBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typingText: { color: '#64748B', fontSize: 13 },
 
  // Error
  errorBox: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444440',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
 
  // Quick questions
  quickQuestionsContainer: { marginTop: 8 },
  quickTitle: { color: '#64748B', fontSize: 12, marginBottom: 8, textAlign: 'center' },
  quickBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#00D4FF30',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  quickBtnText: { color: '#00D4FF', fontSize: 13 },
 
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0D1B2A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1E293B' },
  sendIcon: { color: '#0A0E1A', fontSize: 16, fontWeight: 'bold' },
});