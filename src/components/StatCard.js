import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function StatCard({ icon, value, label, color = '#00D4FF', style }) {
  return (
    <LinearGradient
      colors={[color + '18', color + '05']}
      style={[statStyles.card, { borderColor: color + '25' }, style]}
    >
      {icon && <Text style={statStyles.icon}>{icon}</Text>}
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </LinearGradient>
  );
}

const statStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16,
    borderWidth: 1,
  },
  icon: { fontSize: 20, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
});
