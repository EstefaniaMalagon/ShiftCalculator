import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateShiftEarnings, formatCurrency } from '../../utils/salaryCalculator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SHIFT_TYPES = [
  { key: 'normal', label: 'Diurno', icon: '☀️', color: '#10B981' },
  { key: 'nocturno', label: 'Nocturno', icon: '🌙', color: '#8B5CF6' },
  { key: 'dominical', label: 'Dominical', icon: '📅', color: '#F59E0B' },
  { key: 'festivo', label: 'Festivo', icon: '🎉', color: '#EF4444' },
];

export default function RegisterShiftScreen({ navigation, route }) {
  const { currentUser } = useAuth();
  const editShift = route?.params?.shift;

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 8 * 3600000));
  const [shiftType, setShiftType] = useState('normal');
  const [preview, setPreview] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(6000);
  const [loading, setLoading] = useState(false);

  // Pickers visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    calculatePreview();
  }, [startTime, endTime, shiftType, hourlyRate]);

  async function loadConfig() {
    const docRef = doc(db, 'config', currentUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setHourlyRate(snap.data().hourlyRate || 6000);
    }
  }

  function calculatePreview() {
    const start = new Date(date);
    start.setHours(startTime.getHours(), startTime.getMinutes());
    const end = new Date(date);
    end.setHours(endTime.getHours(), endTime.getMinutes());
    if (end <= start) end.setDate(end.getDate() + 1);

    const result = calculateShiftEarnings(
      { startTime: start.toISOString(), endTime: end.toISOString(), type: shiftType },
      hourlyRate
    );
    setPreview(result);
  }

  async function handleSave() {
    if (!preview) return;
    try {
      setLoading(true);
      const start = new Date(date);
      start.setHours(startTime.getHours(), startTime.getMinutes());
      const end = new Date(date);
      end.setHours(endTime.getHours(), endTime.getMinutes());
      if (end <= start) end.setDate(end.getDate() + 1);

      await addDoc(collection(db, 'shifts'), {
        userId: currentUser.uid,
        date: date.toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        type: shiftType,
        totalHours: preview.totalHours,
        extraHours: preview.extraHours,
        earnings: preview.earnings,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('✅ Turno guardado', `Ganancia estimada: ${formatCurrency(preview.earnings)}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar el turno');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Turno</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Tipo de Turno */}
        <Text style={styles.sectionLabel}>Tipo de Turno</Text>
        <View style={styles.typeGrid}>
          {SHIFT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, shiftType === t.key && { borderColor: t.color, backgroundColor: t.color + '20' }]}
              onPress={() => setShiftType(t.key)}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={[styles.typeLabel, shiftType === t.key && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fecha */}
        <Text style={styles.sectionLabel}>Fecha</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{format(date, 'EEEE, dd MMMM yyyy', { locale: es })}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={(_, selected) => { setShowDatePicker(false); if (selected) setDate(selected); }}
          />
        )}

        {/* Hora inicio / fin */}
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.sectionLabel}>Hora inicio</Text>
            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.timeIcon}>🕐</Text>
              <Text style={styles.timeText}>{format(startTime, 'HH:mm')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.sectionLabel}>Hora fin</Text>
            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.timeIcon}>🕓</Text>
              <Text style={styles.timeText}>{format(endTime, 'HH:mm')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startTime} mode="time" display="spinner"
            onChange={(_, selected) => { setShowStartPicker(false); if (selected) setStartTime(selected); }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endTime} mode="time" display="spinner"
            onChange={(_, selected) => { setShowEndPicker(false); if (selected) setEndTime(selected); }}
          />
        )}

        {/* Preview de Cálculo */}
        {preview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>📊 Vista Previa del Cálculo</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Horas trabajadas</Text>
              <Text style={styles.previewValue}>{preview.totalHours}h</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Horas ordinarias</Text>
              <Text style={styles.previewValue}>{preview.normalHours}h</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Horas extras</Text>
              <Text style={[styles.previewValue, { color: '#F59E0B' }]}>{preview.extraHours}h</Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={[styles.previewLabel, { color: '#FFFFFF', fontWeight: '700' }]}>💵 Ganancia estimada</Text>
              <Text style={[styles.previewValue, { color: '#10B981', fontSize: 18 }]}>
                {formatCurrency(preview.earnings)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00D4FF', '#0099CC']}
            style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : '💾 Guardar Turno'}</Text>
          </LinearGradient>
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
  sectionLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginBottom: 10, marginTop: 20, letterSpacing: 0.5 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: {
    flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#1F2937', gap: 8,
  },
  typeIcon: { fontSize: 20 },
  typeLabel: { color: '#9CA3AF', fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1F2937', gap: 10,
  },
  dateIcon: { fontSize: 18 },
  dateText: { color: '#FFFFFF', fontSize: 15, textTransform: 'capitalize' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeBlock: { flex: 1 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1F2937', gap: 8,
  },
  timeIcon: { fontSize: 16 },
  timeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  previewCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 20,
    marginTop: 20, borderWidth: 1, borderColor: '#1F2937',
  },
  previewTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginBottom: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  previewTotal: {
    borderTopWidth: 1, borderTopColor: '#1F2937',
    paddingTop: 14, marginTop: 4, marginBottom: 0,
  },
  previewLabel: { color: '#9CA3AF', fontSize: 14 },
  previewValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  saveBtnGradient: { padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#0A0E1A', fontWeight: '800', fontSize: 16 },
});
