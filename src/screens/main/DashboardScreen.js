import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateMonthlyEarnings, formatCurrency } from '../../utils/salaryCalculator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const [stats, setStats] = useState({ totalHours: 0, extraHours: 0, earnings: 0 });
  const [recentShifts, setRecentShifts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const monthName = format(new Date(), 'MMMM yyyy', { locale: es });

  async function loadData() {
    if (!currentUser) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const q = query(
      collection(db, 'shifts'),
      where('userId', '==', currentUser.uid),
      where('date', '>=', startOfMonth),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const shifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    setRecentShifts(shifts.slice(0, 3));
    
    const hourlyRate = userProfile?.hourlyRate || 6000;
    const monthly = calculateMonthlyEarnings(shifts, hourlyRate);
    setStats(monthly);
  }

  useEffect(() => { loadData(); }, [currentUser]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {userProfile?.name?.split(' ')[0] || 'Usuario'} 👋</Text>
            <Text style={styles.monthLabel}>{monthName}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Config')} style={styles.configBtn}>
            <Text style={styles.configIcon}>⚙️</Text>
          </TouchableOpacity>
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

        {recentShifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No hay turnos este mes</Text>
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

function ShiftItem({ shift }) {
  const typeColors = {
    normal: '#10B981', nocturno: '#8B5CF6',
    dominical: '#F59E0B', festivo: '#EF4444',
  };
  const typeLabels = {
    normal: 'Diurno', nocturno: 'Nocturno',
    dominical: 'Dominical', festivo: 'Festivo',
  };

  return (
    <View style={styles.shiftCard}>
      <View style={[styles.shiftDot, { backgroundColor: typeColors[shift.type] || '#00D4FF' }]} />
      <View style={styles.shiftInfo}>
        <Text style={styles.shiftDate}>{format(new Date(shift.date), 'dd MMM', { locale: es })}</Text>
        <Text style={styles.shiftType}>{typeLabels[shift.type] || shift.type}</Text>
      </View>
      <View style={styles.shiftRight}>
        <Text style={styles.shiftHours}>{shift.totalHours}h</Text>
        <Text style={styles.shiftEarnings}>{formatCurrency(shift.earnings)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  monthLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' },
  configBtn: { padding: 8 },
  configIcon: { fontSize: 24 },
  statsGrid: { paddingHorizontal: 24, gap: 12, marginBottom: 8 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1F2937',
  },
  statCardWide: { marginBottom: 0 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', paddingHorizontal: 24, marginTop: 24, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 },
  seeAll: { color: '#00D4FF', fontSize: 14 },
  actionsGrid: { flexDirection: 'row', paddingHorizontal: 24, gap: 12 },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, marginBottom: 6,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  emptyCard: {
    margin: 24, borderRadius: 16,
    backgroundColor: '#111827', padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#1F2937',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#6B7280', fontSize: 15, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: '#00D4FF20',
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#00D4FF40',
  },
  emptyBtnText: { color: '#00D4FF', fontWeight: '700' },
  shiftCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', marginHorizontal: 24,
    marginBottom: 8, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937',
  },
  shiftDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  shiftInfo: { flex: 1 },
  shiftDate: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  shiftType: { color: '#9CA3AF', fontSize: 13 },
  shiftRight: { alignItems: 'flex-end' },
  shiftHours: { color: '#9CA3AF', fontSize: 13 },
  shiftEarnings: { color: '#10B981', fontWeight: '700', fontSize: 15 },
});
