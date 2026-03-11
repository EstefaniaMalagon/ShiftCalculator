import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export function CustomInput({
  label, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, autoCapitalize,
  error, style,
}) {
  return (
    <View style={[inputStyles.wrapper, style]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TextInput
        style={[inputStyles.input, error && inputStyles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#4A5568"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
      />
      {error && <Text style={inputStyles.errorText}>{error}</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', marginBottom: 7, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 14,
    color: '#FFFFFF', fontSize: 15,
    borderWidth: 1, borderColor: '#374151',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 11, marginTop: 5 },
});
