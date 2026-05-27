import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../components/CustomButton';
import { CustomInput } from '../components/CustomInput';

describe('Módulo: Components - UI Elements', () => {
  
  describe('CustomButton', () => {
    test('Debería renderizar el título correctamente', () => {
      const { getByText } = render(<PrimaryButton title="Presionar" onPress={() => {}} />);
      expect(getByText('Presionar')).toBeTruthy();
    });

    test('Debería llamar a onPress cuando se presiona', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(<PrimaryButton title="Click" onPress={onPressMock} />);
      
      fireEvent.press(getByText('Click'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    test('Debería mostrar ActivityIndicator cuando está cargando', () => {
      const { UNSAFE_getByType } = render(<PrimaryButton title="Test" loading={true} />);
      // Buscamos el componente ActivityIndicator
      expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();
    });
  });

  describe('CustomInput', () => {
    test('Debería mostrar el label y el placeholder', () => {
      const { getByText, getByPlaceholderText } = render(
        <CustomInput label="Email" placeholder="Ingrese su email" />
      );
      expect(getByText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Ingrese su email')).toBeTruthy();
    });

    test('Debería llamar a onChangeText al escribir', () => {
      const onChangeMock = jest.fn();
      const { getByPlaceholderText } = render(
        <CustomInput placeholder="Escriba aquí" onChangeText={onChangeMock} />
      );
      
      fireEvent.changeText(getByPlaceholderText('Escriba aquí'), 'Hola');
      expect(onChangeMock).toHaveBeenCalledWith('Hola');
    });

    test('Debería mostrar mensaje de error si se proporciona', () => {
      const { getByText } = render(<CustomInput error="Campo obligatorio" />);
      expect(getByText('Campo obligatorio')).toBeTruthy();
    });
  });
});
