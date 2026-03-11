import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, query, where, getDocs,
  orderBy, doc, deleteDoc, updateDoc,
} from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateShiftEarnings, formatCurrency } from '../../utils/salaryCalculator';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const FILTERS = ['Todos', 'normal', 'nocturno', 'dominical', 'festivo'];
const FILTER_LABELS = { Todos: 'Todos', normal: '☀️ Diurno', nocturno: '🌙 Nocturno', dominical: '📅 Dominical', festivo: '🎉 Festivo' };
const TYPE_COLORS = { normal: '#10B981', nocturno: '#8B5CF6', dominical: '#F59E0B', festivo: '#EF4444' };
const TYPE_LABELS = { normal: 'Diurno', nocturno: 'Nocturno', dominical: 'Dominical', festivo: 'Festivo' };
const TYPE_ICONS = { normal: '☀️', nocturno: '🌙', dominical: '📅', festivo: '🎉' };

export default function ShiftHistoryScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ hours: 0, extra: 0, earnings: 0 });

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [editStartTime, setEditStartTime] = useState(new Date());
  const [editEndTime, setEditEndTime] = useState(new Date());
  const [editType, setEditType] = useState('normal');
  const [showEditStart, setShowEditStart] = useState(false);
  const [showEditEnd, setShowEditEnd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadShifts(); }, []);

  useEffect(() => {
    if (activeFilter === 'Todos') {
      setFiltered(shifts);
    } else {
      setFiltered(shifts.filter(s => s.type === activeFilter));
    }
  }, [activeFilter, shifts]);

  useEffect(() => {
    const hours = filtered.reduce((a, s) => a + (s.totalHours || 0), 0);
    const extra = filtered.reduce((a, s) => a + (s.extraHours || 0), 0);
    const earnings = filtered.reduce((a, s) => a + (s.earnings || 0), 0);
    setTotals({ hours, extra, earnings });
  }, [filtered]);

  async function loadShifts() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'shifts'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setShifts(data);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
  }

  function confirmDelete(shift) {
    Alert.alert(
      '¿Eliminar turno?',
      `¿Seguro que deseas eliminar el turno del ${format(parseISO(shift.date), 'dd MMM yyyy', { locale: es })}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => deleteShift(shift.id),
        },
      ]
    );
  }

  async function deleteShift(id) {
    try {
      await deleteDoc(doc(db, 'shifts', id));
      setShifts(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      Alert.alert('Error', 'No se pudo eliminar el turno');
    }
  }

  function openEdit(shift) {
    setEditShift(shift);
    setEditType(shift.type);
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    setEditStartTime(start);
    setEditEndTime(end);
    setEditModal(true);
  }

  async function saveEdit() {
    if (!editShift) return;
    try {
      setSaving(true);
      const hourlyRate = userProfile?.hourlyRate || 6000;
      const start = new Date(editShift.date);
      start.setHours(editStartTime.getHours(), editStartTime.getMinutes());
      const end = new Date(editShift.date);
      end.setHours(editEndTime.getHours(), editEndTime.getMinutes());
      if (end <= start) end.setDate(end.getDate() + 1);

      const calc = calculateShiftEarnings(
        { startTime: start.toISOString(), endTime: end.toISOString(), type: editType },
        hourlyRate
      );

      const updated = {
        type: editType,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        totalHours: calc.totalHours,
        extraHours: calc.extraHours,
        earnings: calc.earnings,
      };

      await updateDoc(doc(db, 'shifts', editShift.id), updated);
      setShifts(prev => prev.map(s => s.id === editShift.id ? { ...s, ...updated } : s));
      setEditModal(false);
      Alert.alert('✅ Turno actualizado');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el turno');
    } finally {
      setSaving(false);
    }
  }

  // Group shifts by month
  const grouped = filtered.reduce((acc, shift) => {
    const key = format(parseISO(shift.date), 'MMMM yyyy', { locale: es });
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {});

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Turnos</Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Totals Banner */}
      <View style={styles.totalsBanner}>
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{totals.hours.toFixed(1)}h</Text>
          <Text style={styles.totalLabel}>Total hrs</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalValue, { color: '#F59E0B' }]}>{totals.extra.toFixed(1)}h</Text>
          <Text style={styles.totalLabel}>Hrs extra</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalValue, { color: '#10B981' }]}>{formatCurrency(totals.earnings)}</Text>
          <Text style={styles.totalLabel}>Estimado</Text>
        </View>
      </View>

      {/* Shift List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Cargando turnos...</Text>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyText}>No hay turnos registrados</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('RegisterShift')}
            >
              <Text style={styles.emptyBtnText}>+ Registrar turno</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(grouped).map(([month, monthShifts]) => (
            <View key={month}>
              {/* Month header */}
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{month}</Text>
                <Text style={styles.monthCount}>{monthShifts.length} turno{monthShifts.length !== 1 ? 's' : ''}</Text>
              </View>

              {monthShifts.map(shift => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onEdit={() => openEdit(shift)}
                  onDelete={() => confirmDelete(shift)}
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>✏️ Editar Turno</Text>
            {editShift && (
              <Text style={styles.modalSubtitle}>
                {format(parseISO(editShift.date), 'EEEE dd MMMM yyyy', { locale: es })}
              </Text>
            )}

            {/* Type Selector */}
            <Text style={styles.modalLabel}>TIPO DE TURNO</Text>
            <View style={styles.typeGrid}>
              {(['normal', 'nocturno', 'dominical', 'festivo']).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    editType === t && { borderColor: TYPE_COLORS[t], backgroundColor: TYPE_COLORS[t] + '20' },
                  ]}
                  onPress={() => setEditType(t)}
                >
                  <Text style={styles.typeIcon}>{TYPE_ICONS[t]}</Text>
                  <Text style={[styles.typeLabel, editType === t && { color: TYPE_COLORS[t] }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Selectors */}
            <Text style={styles.modalLabel}>HORARIO</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeBlockLabel}>Inicio</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEditStart(true)}>
                  <Text style={styles.timeBtnText}>{format(editStartTime, 'HH:mm')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.timeSep}>→</Text>
              <View style={styles.timeBlock}>
                <Text style={styles.timeBlockLabel}>Fin</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEditEnd(true)}>
                  <Text style={styles.timeBtnText}>{format(editEndTime, 'HH:mm')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showEditStart && (
              <DateTimePicker
                value={editStartTime} mode="time" display="spinner"
                onChange={(_, d) => { setShowEditStart(false); if (d) setEditStartTime(d); }}
              />
            )}
            {showEditEnd && (
              <DateTimePicker
                value={editEndTime} mode="time" display="spinner"
                onChange={(_, d) => { setShowEditEnd(false); if (d) setEditEndTime(d); }}
              />
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditBtn, saving && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#00D4FF', '#0099CC']}
                  style={styles.saveEditGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveEditText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function ShiftCard({ shift, onEdit, onDelete }) {
  const color = TYPE_COLORS[shift.type] || '#00D4FF';
  const label = TYPE_LABELS[shift.type] || shift.type;
  const icon = TYPE_ICONS[shift.type] || '🕐';

  return (
    <View style={[styles.shiftCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.shiftLeft}>
        <View style={styles.shiftDateBlock}>
          <Text style={styles.shiftDay}>
            {format(parseISO(shift.date), 'dd', { locale: es })}
          </Text>
          <Text style={styles.shiftMonth}>
            {format(parseISO(shift.date), 'MMM', { locale: es })}
          </Text>
        </View>
      </View>
      <View style={styles.shiftCenter}>
        <View style={styles.shiftTypeRow}>
          <Text style={styles.shiftTypeIcon}>{icon}</Text>
          <Text style={[styles.shiftTypeLabel, { color }]}>{label}</Text>
        </View>
        <Text style={styles.shiftTime}>
          {format(new Date(shift.startTime), 'HH:mm')} → {format(new Date(shift.endTime), 'HH:mm')}
        </Text>
        <View style={styles.shiftBadges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{shift.totalHours}h</Text>
          </View>
          {shift.extraHours > 0 && (
            <View style={[styles.badge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}>
              <Text style={[styles.badgeText, { color: '#F59E0B' }]}>+{shift.extraHours}h extra</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.shiftRight}>
        <Text style={styles.shiftEarnings}>{formatCurrency(shift.earnings)}</Text>
        <View style={styles.shiftActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Text style={styles.actionBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
            <Text style={styles.actionBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: { marginRight: 16, padding: 8 },
  backArrow: { color: '#00D4FF', fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  filterScroll: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#1F2937', backgroundColor: '#111827',
  },
  filterChipActive: { borderColor: '#00D4FF', backgroundColor: '#00D4FF15' },
  filterChipText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#00D4FF' },
  totalsBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', marginHorizontal: 24,
    marginTop: 14, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#1F2937',
  },
  totalItem: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  totalLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  totalDivider: { width: 1, height: 28, backgroundColor: '#1F2937' },
  list: { flex: 1, marginTop: 14 },
  loadingText: { color: '#6B7280', textAlign: 'center', padding: 40 },
  emptyContainer: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 15, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: '#00D4FF20', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#00D4FF40',
  },
  emptyBtnText: { color: '#00D4FF', fontWeight: '700' },
  monthHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24,
    paddingVertical: 12,
  },
  monthTitle: {
    fontSize: 13, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'capitalize', letterSpacing: 0.5,
  },
  monthCount: { fontSize: 11, color: '#4B5563' },
  shiftCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', marginHorizontal: 24,
    marginBottom: 8, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937',
  },
  shiftLeft: { marginRight: 12 },
  shiftDateBlock: { alignItems: 'center', width: 32 },
  shiftDay: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', lineHeight: 22 },
  shiftMonth: { fontSize: 10, color: '#6B7280', textTransform: 'capitalize' },
  shiftCenter: { flex: 1 },
  shiftTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  shiftTypeIcon: { fontSize: 12 },
  shiftTypeLabel: { fontSize: 13, fontWeight: '700' },
  shiftTime: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  shiftBadges: { flexDirection: 'row', gap: 5 },
  badge: {
    backgroundColor: '#1F2937', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#374151',
  },
  badgeText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  shiftRight: { alignItems: 'flex-end', gap: 8 },
  shiftEarnings: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  shiftActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#1F2937', justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: '#374151',
  },
  deleteBtn: { borderColor: '#EF444430', backgroundColor: '#EF444410' },
  actionBtnText: { fontSize: 13 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#000000BB',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111827', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 28,
    borderWidth: 1, borderColor: '#1F2937',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 20, textTransform: 'capitalize' },
  modalLabel: {
    fontSize: 11, color: '#6B7280', fontWeight: '700',
    letterSpacing: 1, marginBottom: 10,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1F2937', borderRadius: 10,
    padding: 10, borderWidth: 1.5, borderColor: '#374151',
    minWidth: '45%', flex: 1,
  },
  typeIcon: { fontSize: 16 },
  typeLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  timeBlock: { flex: 1 },
  timeBlockLabel: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  timeBtn: {
    backgroundColor: '#1F2937', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#374151',
    alignItems: 'center',
  },
  timeBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
  timeSep: { color: '#6B7280', fontSize: 18, marginTop: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, backgroundColor: '#1F2937', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  cancelBtnText: { color: '#9CA3AF', fontWeight: '700', fontSize: 15 },
  saveEditBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveEditGradient: { padding: 14, alignItems: 'center' },
  saveEditText: { color: '#0A0E1A', fontWeight: '800', fontSize: 15 },
});
