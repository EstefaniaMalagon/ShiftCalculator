import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useShifts } from '../../hooks/useShifts';
import { calculateMonthlyEarnings, formatCurrency } from '../../utils/salaryCalculator';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardScreen({ navigation }) {
  const { userProfile } = useAuth();
  const { shifts, loading } = useShifts();

  const monthName = format(new Date(), 'MMMM yyyy', { locale: es });

  // CALCULAMOS LAS ESTADÍSTICAS DEL MES ACTUAL
  const stats = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    // Filtramos comparando mes y año directamente para evitar errores de desfase
    const currentMonthShifts = shifts.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate.getMonth() === mesActual && 
             shiftDate.getFullYear() === anioActual;
    });
    
    const hourlyRate = userProfile?.hourlyRate || 6000;
    return calculateMonthlyEarnings(currentMonthShifts, hourlyRate);
  }, [shifts, userProfile]);

  // Mostramos los 3 más recientes sin importar el mes para dar feedback visual
  const recentShifts = useMemo(() => shifts.slice(0, 3), [shifts]);

  const quickActions = [
    { icon: '⏰', label: 'Registrar\nTurno', screen: 'RegisterShift', color: '#00D4FF' },
    { icon: '📋', label: 'Historial\nTurnos', screen: 'History', color: '#10B981' },
    { icon: '💰', label: 'Comparar\nSalario', screen: 'Compare', color: '#F59E0B' },
    { icon: '📊', label: 'Ver\nReporte', screen: 'Report', color: '#8B5CF6' },
  ];

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} tintColor="#00D4FF" />}
      >
        {/* Header */}
        <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hola, {userProfile?.name?.split(' ')[0] || 'Usuario'} 👋
          </Text>
          <Text style={styles.monthLabel}>{monthName}</Text>
        </View>

        {/* 👇 Contenedor de botones */}
          <View style={styles.headerRight}>
    
        {/* Botón ShiftBot */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Chatbot')}
            style={styles.botBtn}
        >
        <LinearGradient
          colors={['#00D4FF', '#0099CC']}
          style={styles.botBtnInner}
        >
          <Text style={styles.botIcon}>🤖</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Botón Config */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Config')}
            style={styles.configBtn}
          >
            <Text style={styles.configIcon}>⚙️</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LinearGradient colors={['#00D4FF20', '#00D4FF05']} style={[styles.statCard, styles.statCardWide]}>
            <Text style={styles.statLabel}>Salario Estimado del Mes</Text>
            <Text style={[styles.statValue, { color: '#00D4FF', fontSize: 28 }]}>
              {formatCurrency(stats.earnings)}
            </Text>
          </LinearGradient>

          <View style={styles.statRow}>
            <LinearGradient colors={['#10B98120', '#10B98105']} style={styles.statCard}>
              <Text style={styles.statIcon}>🕐</Text>
              <Text style={styles.statValue}>{stats.totalHours.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Horas Totales</Text>
            </LinearGradient>

            <LinearGradient colors={['#F59E0B20', '#F59E0B05']} style={styles.statCard}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.extraHours.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Horas Extra</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.screen}
              style={styles.actionBtn}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20', borderColor: action.color + '40' }]}>
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Turnos Recientes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Turnos Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAll}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {recentShifts.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No hay turnos registrados</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('RegisterShift')}
            >
              <Text style={styles.emptyBtnText}>+ Registrar primer turno</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentShifts.map((shift) => <ShiftItem key={shift.id} shift={shift} />)
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const ShiftItem = ({ shift }) => {
  const typeStyles = {
    normal: { bg: '#10B98120', text: '#10B981', label: 'Diurno' },
    nocturno: { bg: '#8B5CF620', text: '#8B5CF6', label: 'Nocturno' },
    dominical: { bg: '#F59E0B20', text: '#F59E0B', label: 'Dominical' },
    festivo: { bg: '#EF444420', text: '#EF4444', label: 'Festivo' },
  };

  const style = typeStyles[shift.type] || typeStyles.normal;

  return (
    <View style={styles.shiftCard}>
      <View style={styles.shiftInfo}>
        <Text style={styles.shiftDate}>
          {format(new Date(shift.date), "EEEE d 'de' MMMM", { locale: es })}
        </Text>
        <Text style={styles.shiftHours}>
          {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
        </Text>
      </View>
      <View style={styles.shiftBadge}>
        <View style={[styles.typeTag, { backgroundColor: style.bg }]}>
          <Text style={[styles.typeText, { color: style.text }]}>{style.label}</Text>
        </View>
        <Text style={styles.shiftEarnings}>{formatCurrency(shift.earnings)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 16, color: '#94A3B8', marginBottom: 4 },
  monthLabel: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  configBtn: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  configIcon: { fontSize: 20 },
  statsGrid: { paddingHorizontal: 20, marginBottom: 30 },
  statCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FFFFFF10',
    flex: 1,
  },
  statCardWide: { marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 12 },
  statLabel: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  statValue: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  statIcon: { fontSize: 20, marginBottom: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  actionBtn: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 15,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 10,
  },
  seeAll: { color: '#00D4FF', fontSize: 14 },
  shiftCard: {
    backgroundColor: '#1E293B60',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF05',
  },
  shiftDate: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  shiftHours: { color: '#64748B', fontSize: 13, marginTop: 2 },
  shiftBadge: { alignItems: 'flex-end' },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  typeText: { fontSize: 11, fontWeight: '700' },
  shiftEarnings: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  emptyCard: {
    marginHorizontal: 20,
    padding: 40,
    backgroundColor: '#1E293B40',
    borderRadius: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#64748B', fontSize: 15, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: '#00D4FF20',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D4FF40',
  },
  emptyBtnText: { color: '#00D4FF', fontWeight: '600' },
  headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  },

  botBtn: {
    shadowColor: '#00D4FF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },

  botBtnInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  botIcon: {
    fontSize: 20,
    color: '#fff',
  },
});