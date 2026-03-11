import { useState, useCallback } from 'react';
import {
  collection, query, where, getDocs,
  addDoc, orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useSalary() {
  const { currentUser } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSalaries = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'salaries'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setSalaries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const saveSalaryComparison = useCallback(async ({ expected, received, month, year }) => {
    if (!currentUser) throw new Error('Not authenticated');
    const difference = received - expected;
    const payload = {
      userId: currentUser.uid,
      expected,
      received,
      difference,
      month,
      year,
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'salaries'), payload);
    const entry = { id: ref.id, ...payload };
    setSalaries(prev => [entry, ...prev]);
    return entry;
  }, [currentUser]);

  return { salaries, loading, loadSalaries, saveSalaryComparison };
}
