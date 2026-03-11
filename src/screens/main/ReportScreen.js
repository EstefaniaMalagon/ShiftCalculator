import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/salaryCalculator';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const { width } = Dimensions.get('window');
const BAR_MAX_HEIGHT = 100;

const TYPE_COLORS = {
  normal: '#10B981',
  nocturno: '#8B5CF6',
  dominical: '#F59E0B',
  festivo: '#EF4444',
};
const TYPE_LABELS = {
  normal: 'Diurno',
  nocturno: 'Nocturno',
  dominical: 'Dominical',
  festivo: 'Festivo',
};
const TYPE_ICONS = {
  normal: '☀️',
  nocturno: '🌙',
  dominical: '📅',
  festivo: '🎉',
};

// Last 6 months helper
function getLast6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    months.push({
      label: format(d, 'MMM', { locale: es }),
      fullLabel: format(d, 'MMMM yyyy', { locale: es }),
      start: startOfMonth(d).toISOString(),
      end: endOfMonth(d).toISOString(),
    });
  }
  return months;
}

export default function ReportScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [currentMonth, setCurrentMonth] = useState({});
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBar, setSelectedBar] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      // Load shifts
      const shiftsQ = query(
        collection(db, 'shifts'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', sixMonthsAgo),
        orderBy('date', 'desc')
      );
      const shiftsSnap = await getDocs(shiftsQ);
      const allShifts = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setShifts(allShifts);

      // Load salary comparisons
      const salaryQ = query(
        collection(db, 'salaries'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const salarySnap = await getDocs(salaryQ);
      setSalaryHistory(salarySnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Process monthly data for bar chart
      const months = getLast6Months();
      const processed = months.map(m => {
        const monthShifts = allShifts.filter(s => s.date >= m.start && s.date <= m.end);
        const earnings = monthShifts.reduce((a, s) => a + (s.earnings || 0), 0);
        const hours = monthShifts.reduce((a, s) => a + (s.totalHours || 0), 0);
        const extra = monthShifts.reduce((a, s) => a + (s.extraHours || 0), 0);
        return { ...m, earnings, hours, extra, count: monthShifts.length };
      });
      setMonthData(processed);

      // Current month stats
      const nowStart = startOfMonth(new Date()).toISOString();
      const thisMonth = allShifts.filter(s => s.date >= nowStart);
      const cmEarnings = thisMonth.reduce((a, s) => a + (s.earnings || 0), 0);
      const cmHours = thisMonth.reduce((a, s) => a + (s.totalHours || 0), 0);
      const cmExtra = thisMonth.reduce((a, s) => a + (s.extraHours || 0), 0);
      setCurrentMonth({ earnings: cmEarnings, hours: cmHours, extra: cmExtra, count: thisMonth.length });

      // Type breakdown for current month
      const types = ['normal', 'nocturno', 'dominical', 'festivo'];
      const breakdown = types.map(type => {
        const typeShifts = thisMonth.filter(s => s.type === type);
        const hours = typeShifts.reduce((a, s) => a + (s.totalHours || 0), 0);
        const earnings = typeShifts.reduce((a, s) => a + (s.earnings || 0), 0);
        return { type, hours, earnings, count: typeShifts.length };
      }).filter(t => t.count > 0);
      setTypeBreakdown(breakdown);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Bar chart max value
  const maxEarnings = Math.max(...monthData.map(m => m.earnings), 1);

  return (
    <LinearGradient colors={['#0A0E1A', '#0D1B2A']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reporte de Horas</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4FF" />}
      >
        {/* Current Month Summary */}
        <Text style={styles.sectionTitle}>
          📅 {format(new Date(), 'MMMM yyyy', { locale: es })}
        </Text>

        <View style={styles.summaryGrid}>
          <LinearGradient colors={['#00D4FF15', '#00D4FF05']} style={[styles.summaryCard, styles.summaryCardWide]}>
            <Text style={styles.summaryLabel}>💵 Salario Estimado</Text>
            <Text style={[styles.summaryValue, { color: '#00D4FF', fontSize: 28 }]}>
              {formatCurrency(currentMonth.earnings || 0)}
            </Text>
            <Text style={styles.summarySubtitle}>{currentMonth.count || 0} turnos registrados</Text>
          </LinearGradient>

          <View style={styles.summaryRow}>
            <LinearGradient colors={['#10B98115', '#10B98105']} style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>🕐</Text>
              <Text style={styles.summaryValue}>{(currentMonth.hours || 0).toFixed(1)}h</Text>
              <Text style={styles.summaryLabel}>Horas totales</Text>
            </LinearGradient>
            <LinearGradient colors={['#F59E0B15', '#F59E0B05']} style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>⚡</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{(currentMonth.extra || 0).toFixed(1)}h</Text>
              <Text style={styles.summaryLabel}>Horas extra</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Bar Chart — Last 6 Months */}
        <Text style={styles.sectionTitle}>📊 Últimos 6 Meses</Text>
        <View style={styles.chartCard}>
          <View style={styles.barChart}>
            {monthData.map((m, i) => {
              const barH = maxEarnings > 0 ? (m.earnings / maxEarnings) * BAR_MAX_HEIGHT : 0;
              const isSelected = selectedBar === i;
              return (
                <TouchableOpacity
                  key={m.label}
                  style={styles.barColumn}
                  onPress={() => setSelectedBar(isSelected ? null : i)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <View style={styles.barTooltip}>
                      <Text style={styles.barTooltipText}>{formatCurrency(m.earnings)}</Text>
                      <Text style={styles.barTooltipSub}>{m.hours.toFixed(0)}h</Text>
                    </View>
                  )}
                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={isSelected ? ['#00D4FF', '#0099CC'] : ['#00D4FF60', '#00D4FF20']}
                      style={[styles.bar, { height: Math.max(barH, 4) }]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isSelected && { color: '#00D4FF' }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.chartHint}>Toca una barra para ver el detalle</Text>
        </View>

        {/* Type Breakdown */}
        {typeBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🔍 Desglose por Tipo</Text>
            <View style={styles.breakdownCard}>
              {typeBreakdown.map((t, idx) => {
                const color = TYPE_COLORS[t.type];
                const totalEarnings = currentMonth.earnings || 1;
                const pct = ((t.earnings / totalEarnings) * 100).toFixed(0);
                return (
                  <View key={t.type}>
                    <View style={styles.breakdownRow}>
                      <View style={styles.breakdownLeft}>
                        <View style={[styles.breakdownDot, { backgroundColor: color }]} />
                        <View>
                          <Text style={styles.breakdownType}>
                            {TYPE_ICONS[t.type]} {TYPE_LABELS[t.type]}
                          </Text>
                          <Text style={styles.breakdownSub}>{t.count} turno{t.count !== 1 ? 's' : ''} · {t.hours.toFixed(1)}h</Text>
                        </View>
                      </View>
                      <View style={styles.breakdownRight}>
                        <Text style={[styles.breakdownEarnings, { color }]}>{formatCurrency(t.earnings)}</Text>
                        <Text style={styles.breakdownPct}>{pct}%</Text>
                      </View>
                    </View>
                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                      <LinearGradient
                        colors={[color, color + '80']}
                        style={[styles.progressFill, { width: `${pct}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      />
                    </View>
                    {idx < typeBreakdown.length - 1 && <View style={styles.breakdownDivider} />}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Salary Comparison History */}
        {salaryHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>💰 Historial de Comparaciones</Text>
            <View style={styles.salaryHistoryCard}>
              {salaryHistory.slice(0, 5).map(entry => {
                const positive = entry.difference >= 0;
                const monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return (
                  <View key={entry.id} style={styles.salaryHistoryRow}>
                    <View style={styles.salaryHistoryLeft}>
                      <Text style={styles.salaryHistoryMonth}>
                        {monthNames[entry.month]} {entry.year}
                      </Text>
                      <Text style={styles.salaryHistorySub}>
                        Esperado: {formatCurrency(entry.expected)}
                      </Text>
                    </View>
                    <View style={styles.salaryHistoryRight}>
                      <Text style={[styles.salaryHistoryDiff, { color: positive ? '#10B981' : '#EF4444' }]}>
                        {positive ? '+' : ''}{formatCurrency(entry.difference)}
                      </Text>
                      <View style={[
                        styles.salaryBadge,
                        { backgroundColor: positive ? '#10B98115' : '#EF444415', borderColor: positive ? '#10B98130' : '#EF444430' }
                      ]}>
                        <Text style={{ fontSize: 10, color: positive ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                          {positive ? '✓ OK' : '⚠ Diferencia'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Monthly Table */}
        <Text style={styles.sectionTitle}>📋 Resumen Mensual</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 1.5 }]}>Mes</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader]}>Horas</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader]}>Extra</Text>
            <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 1.8 }]}>Estimado</Text>
          </View>
          {[...monthData].reverse().map((m, i) => (
            <View key={m.label} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { flex: 1.5, textTransform: 'capitalize', color: '#D1D5DB' }]}>
                {m.label}
              </Text>
              <Text style={styles.tableCell}>{m.hours.toFixed(0)}h</Text>
              <Text style={[styles.tableCell, { color: '#F59E0B' }]}>{m.extra.toFixed(0)}h</Text>
              <Text style={[styles.tableCell, { flex: 1.8, color: '#10B981', fontWeight: '700' }]}>
                {m.earnings > 0 ? formatCurrency(m.earnings) : '-'}
              </Text>
            </View>
          ))}
        </View>

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
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
    paddingHorizontal: 24, marginTop: 24, marginBottom: 12,
    textTransform: 'capitalize',
  },
  // Summary
  summaryGrid: { paddingHorizontal: 24, gap: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1F2937',
  },
  summaryCardWide: { marginBottom: 0 },
  summaryIcon: { fontSize: 18, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  summarySubtitle: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  // Bar Chart
  chartCard: {
    backgroundColor: '#111827', marginHorizontal: 24,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#1F2937',
  },
  barChart: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 40, gap: 8,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  barWrapper: {
    width: '100%', alignItems: 'center',
    justifyContent: 'flex-end', height: BAR_MAX_HEIGHT,
  },
  bar: { width: '80%', borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 10, color: '#6B7280', marginTop: 6, fontWeight: '600' },
  barTooltip: {
    position: 'absolute', top: -36,
    backgroundColor: '#1F2937', borderRadius: 8, padding: 5,
    borderWidth: 1, borderColor: '#374151', alignItems: 'center', zIndex: 10,
  },
  barTooltipText: { fontSize: 9, color: '#00D4FF', fontWeight: '800' },
  barTooltipSub: { fontSize: 8, color: '#9CA3AF' },
  chartHint: { fontSize: 10, color: '#4B5563', textAlign: 'center', marginTop: 10 },
  // Breakdown
  breakdownCard: {
    backgroundColor: '#111827', marginHorizontal: 24,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#1F2937',
  },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownType: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  breakdownSub: { fontSize: 11, color: '#6B7280' },
  breakdownRight: { alignItems: 'flex-end' },
  breakdownEarnings: { fontSize: 14, fontWeight: '800' },
  breakdownPct: { fontSize: 11, color: '#6B7280' },
  progressTrack: {
    height: 4, backgroundColor: '#1F2937',
    borderRadius: 2, marginBottom: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  breakdownDivider: { height: 1, backgroundColor: '#1F2937', marginBottom: 12 },
  // Salary History
  salaryHistoryCard: {
    backgroundColor: '#111827', marginHorizontal: 24,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1F2937',
  },
  salaryHistoryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  salaryHistoryLeft: {},
  salaryHistoryMonth: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  salaryHistorySub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  salaryHistoryRight: { alignItems: 'flex-end', gap: 4 },
  salaryHistoryDiff: { fontSize: 14, fontWeight: '800' },
  salaryBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  // Table
  tableCard: {
    backgroundColor: '#111827', marginHorizontal: 24,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1F2937',
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1F2937',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  tableRowAlt: { backgroundColor: '#0F1923' },
  tableCell: {
    flex: 1, fontSize: 12, color: '#9CA3AF', textAlign: 'center',
  },
  tableCellHeader: { color: '#6B7280', fontWeight: '700', fontSize: 11 },
});
