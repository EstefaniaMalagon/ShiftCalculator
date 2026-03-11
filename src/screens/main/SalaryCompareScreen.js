import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateMonthlyEarnings, formatCurrency } from '../../utils/salaryCalculator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SalaryCompareScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const [received, setReceived] = useState('');
  const [expected, setExpected] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadExpected(); }, []);

  async function loadExpected() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const q = query(
      collection(db, 'shifts'),
      where('userId', '==', currentUser.uid),
      where('date', '>=', startOfMonth)
    );
    const snap = await getDocs(q);
    const shifts = snap.docs.map(d => d.data());
    const hourlyRate = userProfile?.hourlyRate || 6000;
    const monthly = calculateMonthlyEarnings(shifts, hourlyRate);
    setExpected(monthly.earnings);
    setTotalHours(monthly.totalHours);
  }

  function compare() {
    const receivedNum = parseFloat(received.replace(/[^0-9.]/g, ''));
    if (!receivedNum || receivedNum <= 0) {
      return Alert.alert('Error', 'Ingresa el valor de pago recibido');
    }
    const diff = receivedNum - expected;
    const pct = expected > 0 ? ((diff / expected) * 100).toFixed(1) : 0;
    setResult({ received: receivedNum, expected, diff, pct });
  }

  async function saveComparison() {
    if (!result) return;
    try {
      setLoading(true);
      const now = new Date();
      await addDoc(collection(db, 'salaries'), {
        userId: currentUser.uid,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        expected: result.expected,
        received: result.received,
        difference: result.diff,
        createdAt: now.toISOString(),
      });
      Alert.alert('✅ Guardado', 'La comparación fue guardada en tu historial');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  const diffPositive = result && result.diff >= 0;

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comparar Salario</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.monthLabel}>
          {format(new Date(), 'MMMM yyyy', { locale: es })}
        </Text>

        {/* Salario Esperado */}
        <View style={styles.expectedCard}>
          <Text style={styles.expectedLabel}>💼 Salario Estimado (según tus turnos)</Text>
          <Text style={styles.expectedValue}>{formatCurrency(expected)}</Text>
          <Text style={styles.expectedSub}>{totalHours.toFixed(1)} horas trabajadas registradas</Text>
        </View>

        {/* Input Salario Recibido */}
        <Text style={styles.sectionLabel}>Pago recibido (en tu cuenta)</Text>
        <TextInput
          style={styles.input}
          value={received}
          onChangeText={setReceived}
          placeholder="Ej: 1800000"
          placeholderTextColor="#4A5568"
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.compareBtn} onPress={compare}>
          <LinearGradient
            colors={['#00D4FF', '#0099CC']}
            style={styles.compareBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.compareBtnText}>🔍 Comparar</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Resultado */}
        {result && (
          <View style={[
            styles.resultCard,
            { borderColor: diffPositive ? '#10B98140' : '#EF444440' }
          ]}>
            <Text style={styles.resultTitle}>
              {diffPositive ? '✅ Pago correcto o superior' : '⚠️ Posible inconsistencia detectada'}
            </Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Esperabas recibir</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.expected)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Recibiste</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.received)}</Text>
            </View>
            <View style={[styles.resultRow, styles.resultTotalRow]}>
              <Text style={[styles.resultLabel, { fontWeight: '700', color: '#FFFFFF' }]}>Diferencia</Text>
              <Text style={[
                styles.resultValue,
                { color: diffPositive ? '#10B981' : '#EF4444', fontSize: 20, fontWeight: '800' }
              ]}>
                {diffPositive ? '+' : ''}{formatCurrency(result.diff)}
              </Text>
            </View>
            <Text style={[styles.percentText, { color: diffPositive ? '#10B981' : '#EF4444' }]}>
              {diffPositive ? '+' : ''}{result.pct}% respecto al estimado
            </Text>

            {!diffPositive && (
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>
                  📋 Se detectó una diferencia negativa en tu pago. Guarda este resultado como evidencia.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={saveComparison}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>💾 Guardar comparación</Text>
            </TouchableOpacity>
          </View>
        )}

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
  monthLabel: { color: '#9CA3AF', fontSize: 14, textTransform: 'capitalize', marginBottom: 16 },
  expectedCard: {
    backgroundColor: '#00D4FF10', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#00D4FF30', marginBottom: 24,
  },
  expectedLabel: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
  expectedValue: { color: '#00D4FF', fontSize: 32, fontWeight: '800' },
  expectedSub: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  sectionLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#1F2937', marginBottom: 16,
  },
  compareBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  compareBtnGradient: { padding: 16, alignItems: 'center' },
  compareBtnText: { color: '#0A0E1A', fontWeight: '800', fontSize: 16 },
  resultCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 20,
    borderWidth: 1.5,
  },
  resultTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultTotalRow: {
    borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 14, marginTop: 4,
  },
  resultLabel: { color: '#9CA3AF', fontSize: 14 },
  resultValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  percentText: { textAlign: 'right', fontSize: 13, marginTop: 4, marginBottom: 16 },
  alertBox: {
    backgroundColor: '#EF444415', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#EF444440', marginBottom: 16,
  },
  alertText: { color: '#FCA5A5', fontSize: 13, lineHeight: 18 },
  saveBtn: {
    backgroundColor: '#1F2937', borderRadius: 10, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  saveBtnText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
});
