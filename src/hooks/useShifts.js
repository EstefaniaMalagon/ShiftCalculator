import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, onSnapshot,
  orderBy, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateShiftEarnings } from '../utils/salaryCalculator';

export function useShifts() {
  const { currentUser, userProfile } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // EFECTO DE TIEMPO REAL: Se activa solo al montar el hook o cambiar de usuario
  useEffect(() => {
    if (!currentUser) {
      setShifts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Consulta base: Todos los turnos del usuario actual
    const q = query(
      collection(db, 'shifts'),
      where('userId', '==', currentUser.uid),
      orderBy('date', 'desc')
    );

    // El Listener 'onSnapshot' es el que hace la magia de actualizar sin recargar
    const unsubscribe = onSnapshot(q, 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setShifts(data);
        setLoading(false);
      }, 
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    // Limpiamos el listener cuando el componente se destruye
    return () => unsubscribe();
  }, [currentUser]);

  // addShift ahora es más simple porque el listener se encarga de actualizar la lista 'shifts'
  const addShift = useCallback(async (shiftData) => {
    if (!currentUser) throw new Error('Not authenticated');
    
    const hourlyRate = userProfile?.hourlyRate || 6000;
    const calc = calculateShiftEarnings(shiftData, hourlyRate);
    
    const payload = {
      userId: currentUser.uid,
      ...shiftData,
      ...calc,
      createdAt: new Date().toISOString(),
    };

    const ref = await addDoc(collection(db, 'shifts'), payload);
    return { id: ref.id, ...payload };
  }, [currentUser, userProfile]);

  const updateShift = useCallback(async (id, updates) => {
    const hourlyRate = userProfile?.hourlyRate || 6000;
    const calc = calculateShiftEarnings(updates, hourlyRate);
    const payload = { ...updates, ...calc };
    await updateDoc(doc(db, 'shifts', id), payload);
  }, [userProfile]);

  const removeShift = useCallback(async (id) => {
    await deleteDoc(doc(db, 'shifts', id));
  }, []);

  return { shifts, loading, error, addShift, updateShift, removeShift };
}