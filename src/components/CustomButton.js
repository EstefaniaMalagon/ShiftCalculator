import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function PrimaryButton({ title, onPress, loading = false, disabled = false, style }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, (loading || disabled) && styles.disabled, style]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <LinearGradient
        colors={['#00D4FF', '#0099CC']}
        style={styles.primaryGradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        {loading
          ? <ActivityIndicator color="#0A0E1A" size="small" />
          : <Text style={styles.primaryText}>{title}</Text>
        }
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.secondaryBtn, style]} onPress={onPress}>
      <Text style={styles.secondaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function DangerButton({ title, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.dangerBtn, style]} onPress={onPress}>
      <Text style={styles.dangerText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryBtn: { borderRadius: 14, overflow: 'hidden' },
  primaryGradient: { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  primaryText: { color: '#0A0E1A', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },
  secondaryBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151',
  },
  secondaryText: { color: '#9CA3AF', fontWeight: '700', fontSize: 16 },
  dangerBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444440',
  },
  dangerText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
});
