import { useState, useCallback } from 'react';
import {
  collection, query, where, getDocs,
  orderBy, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateShiftEarnings } from '../utils/salaryCalculator';

export function useShifts() {
  const { currentUser, userProfile } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadShifts = useCallback(async (fromDate = null) => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      let q;
      if (fromDate) {
        q = query(
          collection(db, 'shifts'),
          where('userId', '==', currentUser.uid),
          where('date', '>=', fromDate),
          orderBy('date', 'desc')
        );
      } else {
        q = query(
          collection(db, 'shifts'),
          where('userId', '==', currentUser.uid),
          orderBy('date', 'desc')
        );
      }
      const snap = await getDocs(q);
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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
    const newShift = { id: ref.id, ...payload };
    setShifts(prev => [newShift, ...prev]);
    return newShift;
  }, [currentUser, userProfile]);

  const updateShift = useCallback(async (id, updates) => {
    const hourlyRate = userProfile?.hourlyRate || 6000;
    const calc = calculateShiftEarnings(updates, hourlyRate);
    const payload = { ...updates, ...calc };
    await updateDoc(doc(db, 'shifts', id), payload);
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s));
  }, [userProfile]);

  const removeShift = useCallback(async (id) => {
    await deleteDoc(doc(db, 'shifts', id));
    setShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  return { shifts, loading, error, loadShifts, addShift, updateShift, removeShift };
}
