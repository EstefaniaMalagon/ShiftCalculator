import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleLogin() {
    if (!email || !password) {
      return Alert.alert('Error', 'Por favor completa todos los campos');
    }
    try {
      setLoading(true);
      await login(email, password);
      // La navegación ocurre automáticamente por el AuthContext
    } catch (error) {
      let message = 'Ocurrió un error al iniciar sesión';
      if (error.code === 'auth/invalid-credential') message = 'Email o contraseña incorrectos';
      if (error.code === 'auth/too-many-requests') message = 'Demasiados intentos. Intenta más tarde';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A', '#1B2838']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>⏱</Text>
            </View>
            <Text style={styles.appName}>Shift Calculator</Text>
            <Text style={styles.tagline}>Tu salario, bajo control</Text>
          </View>

          {/* Formulario */}
          <View style={styles.card}>
            <Text style={styles.title}>Iniciar Sesión</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor="#4A5568"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#4A5568"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('RecoverPassword')}
              style={styles.forgotContainer}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00D4FF', '#0099CC']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#00D4FF20',
    borderWidth: 2, borderColor: '#00D4FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  tagline: { fontSize: 14, color: '#00D4FF', marginTop: 4, letterSpacing: 2 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  forgotContainer: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#00D4FF', fontSize: 13 },
  loginBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  btnGradient: { padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#0A0E1A', fontWeight: '800', fontSize: 16 },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: '#6B7280', fontSize: 14 },
  registerLink: { color: '#00D4FF', fontSize: 14, fontWeight: '700' },
});
