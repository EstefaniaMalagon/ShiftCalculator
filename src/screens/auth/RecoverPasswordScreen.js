import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

export function RecoverPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { recoverPassword } = useAuth();

  async function handleRecover() {
    if (!email.trim()) return Alert.alert('Error', 'Ingresa tu correo electrónico');
    try {
      setLoading(true);
      await recoverPassword(email);
      setSent(true);
    } catch (err) {
      Alert.alert('Error', 'No se encontró una cuenta con ese correo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A', '#1B2838']} style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🔑</Text>
        </View>

        <Text style={styles.title}>Recuperar Contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </Text>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>
              Correo enviado. Revisa tu bandeja de entrada.
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor="#4A5568"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleRecover}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00D4FF', '#0099CC']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar correo'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 28, paddingTop: 70 },
  backBtn: { marginBottom: 40 },
  backArrow: { color: '#00D4FF', fontSize: 16 },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#00D4FF15', borderWidth: 1.5, borderColor: '#00D4FF50',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  icon: { fontSize: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  subtitle: { color: '#9CA3AF', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  input: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#1F2937', marginBottom: 16,
  },
  btn: { borderRadius: 14, overflow: 'hidden' },
  btnGradient: { padding: 16, alignItems: 'center' },
  btnText: { color: '#0A0E1A', fontWeight: '800', fontSize: 16 },
  successCard: {
    backgroundColor: '#10B98115', borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#10B98140',
  },
  successIcon: { fontSize: 40, marginBottom: 12 },
  successText: { color: '#10B981', fontSize: 15, textAlign: 'center', fontWeight: '600' },
});
