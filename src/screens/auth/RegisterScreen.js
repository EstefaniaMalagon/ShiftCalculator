import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  function validate() {
    if (!name.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim()) return 'Ingresa tu correo';
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return 'Correo inválido';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirm) return 'Las contraseñas no coinciden';
    return null;
  }

  async function handleRegister() {
    const error = validate();
    if (error) return Alert.alert('Campos inválidos', error);
    try {
      setLoading(true);
      await register(email, password, name);
    } catch (err) {
      let message = 'Error al registrar';
      if (err.code === 'auth/email-already-in-use') message = 'Este correo ya está registrado';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A', '#1B2838']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Crear Cuenta</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.subtitle}>Únete a Shift Calculator y controla tu salario</Text>

            {[
              { label: 'Nombre completo', value: name, setter: setName, placeholder: 'Juan García', secure: false, keyboard: 'default' },
              { label: 'Correo electrónico', value: email, setter: setEmail, placeholder: 'tu@correo.com', secure: false, keyboard: 'email-address' },
              { label: 'Contraseña', value: password, setter: setPassword, placeholder: '••••••••', secure: true, keyboard: 'default' },
              { label: 'Confirmar contraseña', value: confirm, setter: setConfirm, placeholder: '••••••••', secure: true, keyboard: 'default' },
            ].map((field) => (
              <View key={field.label} style={styles.inputGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor="#4A5568"
                  secureTextEntry={field.secure}
                  keyboardType={field.keyboard}
                  autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00D4FF', '#0099CC']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>{loading ? 'Registrando...' : 'Crear Cuenta'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Iniciar Sesión</Text>
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
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtn: { marginRight: 16, padding: 8 },
  backArrow: { color: '#00D4FF', fontSize: 22 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 24, lineHeight: 20 },
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
  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 20 },
  btnGradient: { padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#0A0E1A', fontWeight: '800', fontSize: 16 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: '#00D4FF', fontSize: 14, fontWeight: '700' },
});
