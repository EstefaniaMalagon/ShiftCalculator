import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/salaryCalculator';

const TYPE_COLORS = { normal: '#10B981', nocturno: '#8B5CF6', dominical: '#F59E0B', festivo: '#EF4444' };
const TYPE_ICONS = { normal: '☀️', nocturno: '🌙', dominical: '📅', festivo: '🎉' };
const TYPE_LABELS = { normal: 'Diurno', nocturno: 'Nocturno', dominical: 'Dominical', festivo: 'Festivo' };

export function ShiftCard({ shift, onEdit, onDelete, compact = false }) {
  const color = TYPE_COLORS[shift.type] || '#00D4FF';
  return (
    <View style={[cardStyles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={cardStyles.left}>
        <Text style={cardStyles.dateDay}>{format(parseISO(shift.date), 'dd', { locale: es })}</Text>
        <Text style={cardStyles.dateMon}>{format(parseISO(shift.date), 'MMM', { locale: es })}</Text>
      </View>
      <View style={cardStyles.center}>
        <Text style={[cardStyles.type, { color }]}>{TYPE_ICONS[shift.type]} {TYPE_LABELS[shift.type]}</Text>
        <Text style={cardStyles.time}>
          {format(new Date(shift.startTime), 'HH:mm')} → {format(new Date(shift.endTime), 'HH:mm')}
        </Text>
        <Text style={cardStyles.hours}>{shift.totalHours}h {shift.extraHours > 0 ? `(+${shift.extraHours}h extra)` : ''}</Text>
      </View>
      <View style={cardStyles.right}>
        <Text style={cardStyles.earnings}>{formatCurrency(shift.earnings)}</Text>
        {!compact && (
          <View style={cardStyles.actions}>
            {onEdit && (
              <TouchableOpacity style={cardStyles.actionBtn} onPress={onEdit}>
                <Text>✏️</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.deleteBtn]} onPress={onDelete}>
                <Text>🗑</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1F2937',
  },
  left: { alignItems: 'center', width: 32, marginRight: 12 },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  dateMon: { fontSize: 10, color: '#6B7280', textTransform: 'capitalize' },
  center: { flex: 1 },
  type: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  time: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  hours: { fontSize: 11, color: '#9CA3AF' },
  right: { alignItems: 'flex-end', gap: 6 },
  earnings: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#1F2937', justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: '#374151',
  },
  deleteBtn: { borderColor: '#EF444430', backgroundColor: '#EF444410' },
});
