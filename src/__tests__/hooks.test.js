import { renderHook, act } from '@testing-library/react-native';
import { useShifts } from '../hooks/useShifts';

// Mock de Firebase
jest.mock('../config/firebase', () => ({
  db: {}
}));

// Mock del contexto de Auth
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-123' },
    userProfile: { hourlyRate: 10000 }
  })
}));

// Mock de Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // Devuelve una función de limpieza
  orderBy: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
}));

import { addDoc } from 'firebase/firestore';

describe('Módulo: Hooks - useShifts', () => {
  
  test('addShift(): Debería intentar guardar un turno con los cálculos correctos', async () => {
    // Configuramos el mock para que devuelva un ID ficticio
    addDoc.mockResolvedValueOnce({ id: 'shift-abc' });

    const { result } = renderHook(() => useShifts());

    const shiftData = {
      startTime: '2026-05-27T08:00:00',
      endTime: '2026-05-27T16:00:00',
      type: 'diurno',
      date: '2026-05-27'
    };

    let addedShift;
    await act(async () => {
      addedShift = await result.current.addShift(shiftData);
    });

    // Verificamos que se llamó a Firebase con los datos y cálculos
    expect(addDoc).toHaveBeenCalled();
    expect(addedShift.earnings).toBe(80000); // 8h * 10000
    expect(addedShift.totalHours).toBe(8);
    expect(addedShift.userId).toBe('user-123');
  });

  test('removeShift(): Debería intentar eliminar un turno por su ID', async () => {
    const { result } = renderHook(() => useShifts());
    
    await act(async () => {
      await result.current.removeShift('shift-123');
    });

    const { deleteDoc } = require('firebase/firestore');
    expect(deleteDoc).toHaveBeenCalled();
  });
});
