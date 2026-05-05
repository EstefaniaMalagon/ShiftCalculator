import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, RefreshControl, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { useShifts } from '../../hooks/useShifts';
import { formatCurrency } from '../../utils/salaryCalculator';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const FILTERS = ['Todos', 'normal', 'nocturno', 'dominical', 'festivo'];
const FILTER_LABELS = { Todos: 'Todos', normal: '☀️ Diurno', nocturno: '🌙 Nocturno', dominical: '📅 Dominical', festivo: '🎉 Festivo' };
const TYPE_COLORS = { normal: '#10B981', nocturno: '#8B5CF6', dominical: '#F59E0B', festivo: '#EF4444' };
const TYPE_LABELS = { normal: 'Diurno', nocturno: 'Nocturno', dominical: 'Dominical', festivo: 'Festivo' };

export default function ShiftHistoryScreen({ navigation }) {
  const { shifts, loading, updateShift, removeShift } = useShifts();
  const [activeFilter, setActiveFilter] = useState('Todos');

  // Modal State
  const [editModal, setEditModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [editStartTime, setEditStartTime] = useState(new Date());
  const [editEndTime, setEditEndTime] = useState(new Date());
  const [editType, setEditType] = useState('normal');
  const [showEditStart, setShowEditStart] = useState(false);
  const [showEditEnd, setShowEditEnd] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return activeFilter === 'Todos' ? shifts : shifts.filter(s => s.type === activeFilter);
  }, [shifts, activeFilter]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, s) => ({
      hours: acc.hours + (s.totalHours || 0),
      extra: acc.extra + (s.extraHours || 0),
      earnings: acc.earnings + (s.earnings || 0)
    }), { hours: 0, extra: 0, earnings: 0 });
  }, [filtered]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, shift) => {
      const key = format(parseISO(shift.date), 'MMMM yyyy', { locale: es });
      if (!acc[key]) acc[key] = [];
      acc[key].push(shift);
      return acc;
    }, {});
  }, [filtered]);

  async function handleDelete(id) {
    Alert.alert('¿Eliminar turno?', 'Esta acción restará el dinero de tus estadísticas.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeShift(id) }
    ]);
  }

  async function saveEdit() {
    if (!editShift) return;
    try {
      setSaving(true);
      const start = new Date(editShift.date);
      start.setHours(editStartTime.getHours(), editStartTime.getMinutes());
      const end = new Date(editShift.date);
      end.setHours(editEndTime.getHours(), editEndTime.getMinutes());
      if (end <= start) end.setDate(end.getDate() + 1);

      await updateShift(editShift.id, {
        type: editType,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        date: editShift.date
      });
      setEditModal(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el turno');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(shift) {
    setEditShift(shift);
    setEditType(shift.type);
    setEditStartTime(new Date(shift.startTime));
    setEditEndTime(new Date(shift.endTime));
    setEditModal(true);
  }

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Turnos</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
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
      </View>

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
          <Text style={styles.totalLabel}>Ganado</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.list}
        refreshControl={<RefreshControl refreshing={loading} tintColor="#00D4FF" />}
      >
        {Object.keys(grouped).length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyText}>No hay turnos registrados</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([month, monthShifts]) => (
            <View key={month} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{month}</Text>
                <Text style={styles.monthCount}>{monthShifts.length} turnos</Text>
              </View>
              {monthShifts.map(shift => (
                <ShiftCard 
                  key={shift.id} 
                  shift={shift} 
                  onEdit={() => openEdit(shift)} 
                  onDelete={() => handleDelete(shift.id)} 
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Edición */}
      <Modal visible={editModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Turno</Text>
            
            <Text style={styles.inputLabel}>Tipo de Turno</Text>
            <View style={styles.typeSelector}>
              {['normal', 'nocturno', 'dominical', 'festivo'].map((t) => (
                <TouchableOpacity 
                  key={t}
                  style={[styles.typeOption, editType === t && { borderColor: TYPE_COLORS[t], backgroundColor: TYPE_COLORS[t] + '20' }]}
                  onPress={() => setEditType(t)}
                >
                  <Text style={[styles.typeOptionText, editType === t && { color: TYPE_COLORS[t] }]}>{TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEditStart(true)}>
              <Text style={styles.timeBtnLabel}>Hora Inicio:</Text>
              <Text style={styles.timeBtnValue}>{format(editStartTime, 'HH:mm')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEditEnd(true)}>
              <Text style={styles.timeBtnLabel}>Hora Fin:</Text>
              <Text style={styles.timeBtnValue}>{format(editEndTime, 'HH:mm')}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>

            {showEditStart && (
              <DateTimePicker
                value={editStartTime}
                mode="time"
                is24Hour={true}
                onChange={(e, date) => { setShowEditStart(false); if(date) setEditStartTime(date); }}
              />
            )}
            {showEditEnd && (
              <DateTimePicker
                value={editEndTime}
                mode="time"
                is24Hour={true}
                onChange={(e, date) => { setShowEditEnd(false); if(date) setEditEndTime(date); }}
              />
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// Componente ShiftCard Interno
const ShiftCard = ({ shift, onEdit, onDelete }) => (
  <View style={styles.card}>
    <View style={[styles.typeIndicator, { backgroundColor: TYPE_COLORS[shift.type] || '#10B981' }]} />
    <View style={styles.cardMain}>
      <Text style={styles.cardDate}>{format(parseISO(shift.date), "EEEE d 'de' MMMM", { locale: es })}</Text>
      <Text style={styles.cardHours}>{format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}</Text>
      <Text style={styles.cardEarnings}>{formatCurrency(shift.earnings)}</Text>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity onPress={onEdit} style={styles.actionIcon}><Text>✏️</Text></TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionIcon}><Text>🗑️</Text></TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  backArrow: { color: '#FFF', fontSize: 24 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  filterScroll: { maxHeight: 50, marginBottom: 15 },
  filterContent: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterChipActive: { backgroundColor: '#00D4FF', borderColor: '#00D4FF' },
  filterChipText: { color: '#94A3B8', fontSize: 13 },
  filterChipTextActive: { color: '#0A0E1A', fontWeight: 'bold' },
  totalsBanner: { flexDirection: 'row', backgroundColor: '#1E293B60', margin: 20, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  totalLabel: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  totalDivider: { width: 1, backgroundColor: '#334155', marginHorizontal: 10 },
  list: { flex: 1, paddingHorizontal: 20 },
  monthSection: { marginBottom: 25 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthTitle: { color: '#00D4FF', fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' },
  monthCount: { color: '#64748B', fontSize: 12 },
  card: { backgroundColor: '#1E293B80', borderRadius: 20, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF05' },
  typeIndicator: { width: 6 },
  cardMain: { flex: 1, padding: 16 },
  cardDate: { color: '#FFF', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  cardHours: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  cardEarnings: { color: '#10B981', fontWeight: 'bold', marginTop: 8 },
  cardActions: { padding: 10, justifyContent: 'center', gap: 15 },
  actionIcon: { width: 35, height: 35, backgroundColor: '#0F172A', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { color: '#64748B', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  inputLabel: { color: '#94A3B8', fontSize: 14, marginBottom: 10 },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  typeOptionText: { color: '#94A3B8', fontSize: 12 },
  timeBtn: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0F172A', padding: 15, borderRadius: 15, marginBottom: 10 },
  timeBtnLabel: { color: '#94A3B8' },
  timeBtnValue: { color: '#FFF', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8' },
  saveBtn: { flex: 2, backgroundColor: '#00D4FF', padding: 15, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#0A0E1A', fontWeight: 'bold' },
});