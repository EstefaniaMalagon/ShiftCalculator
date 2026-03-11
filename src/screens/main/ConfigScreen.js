import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function ConfigScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => { loadConfig(); }, []);

  function showMessage(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  }

  async function loadConfig() {
    try {
      const snap = await getDoc(doc(db, 'config', currentUser.uid));
      if (snap.exists()) {
        setHourlyRate(String(snap.data().hourlyRate || 6000));
      }
    } catch (err) {
      showMessage('Error al cargar configuración', 'error');
    }
  }

  async function saveConfig() {
    const rate = parseFloat(hourlyRate);
    if (!rate || rate <= 0) return showMessage('Ingresa un valor por hora válido', 'error');
    try {
      setLoading(true);
      await setDoc(doc(db, 'config', currentUser.uid), { hourlyRate: rate }, { merge: true });
      await setDoc(doc(db, 'users', currentUser.uid), { hourlyRate: rate }, { merge: true });
      showMessage('✅ Configuración guardada correctamente', 'success');
    } catch (err) {
      showMessage('Error al guardar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm('¿Estás seguro que quieres cerrar sesión?');
    if (!confirmed) return;
    try {
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      showMessage('Error al cerrar sesión', 'error');
    }
  }

  const surcharges = [
    { label: 'Hora extra diurna', value: '× 1.25 (25% adicional)' },
    { label: 'Hora extra nocturna', value: '× 1.75 (75% adicional)' },
    { label: 'Recargo nocturno', value: '× 1.35 (35% adicional)' },
    { label: 'Dominical / Festivo', value: '× 2.00 (100% adicional)' },
    { label: 'Extra dominical', value: '× 2.75 (175% adicional)' },
  ];

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {message.text !== '' && (
          <View style={[
            styles.messageBox,
            { backgroundColor: message.type === 'success' ? '#10B98120' : '#EF444420',
              borderColor: message.type === 'success' ? '#10B98150' : '#EF444450' }
          ]}>
            <Text style={{ color: message.type === 'success' ? '#10B981' : '#EF4444', fontSize: 14 }}>
              {message.text}
            </Text>
          </View>
        )}

        {/* Valor por Hora */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💵 Valor por Hora</Text>
          <Text style={styles.cardSubtitle}>
            Ingresa tu tarifa por hora en pesos colombianos (COP)
          </Text>
          <TextInput
            style={styles.input}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="Ej: 6000"
            placeholderTextColor="#4A5568"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={saveConfig}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00D4FF', '#0099CC']}
              style={styles.saveBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar Valor'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recargos Legales */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚖️ Recargos Legales (Colombia)</Text>
          <Text style={styles.cardSubtitle}>
            Calculados automáticamente según la ley laboral
          </Text>
          {surcharges.map((s) => (
            <View key={s.label} style={styles.surchargeRow}>
              <Text style={styles.surchargeLabel}>{s.label}</Text>
              <Text style={styles.surchargeValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Acerca de */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ Acerca de Shift Calculator</Text>
          <Text style={styles.cardSubtitle}>
            Versión 1.0.0{'\n'}
            Ayuda a los trabajadores a verificar que su pago corresponda a las horas realmente trabajadas, incluyendo horas extras, turnos nocturnos, dominicales y festivos.
          </Text>
        </View>

        {/* Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20,
  },
  backBtn: { marginRight: 16, padding: 8 },
  backArrow: { color: '#00D4FF', fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 24 },
  messageBox: {
    borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1,
  },
  card: {
    backgroundColor: '#111827', borderRadius: 16, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: '#1F2937',
  },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  input: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 14,
    color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#374151', marginBottom: 14,
  },
  saveBtn: { borderRadius: 12, overflow: 'hidden' },
  saveBtnGradient: { padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#0A0E1A', fontWeight: '800', fontSize: 15 },
  surchargeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  surchargeLabel: { color: '#9CA3AF', fontSize: 13, flex: 1 },
  surchargeValue: { color: '#00D4FF', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#EF444415', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#EF444440', marginBottom: 16,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
