import { isNightHour, calculateShiftEarnings } from '../utils/salaryCalculator';

describe('Módulo: Utils - salaryCalculator', () => {
  
  test('isNightHour(): Debería identificar correctamente las horas nocturnas (9 PM - 6 AM)', () => {
    // Casos positivos (Nocturnos)
    expect(isNightHour(21)).toBe(true);  // 9 PM
    expect(isNightHour(23)).toBe(true);  // 11 PM
    expect(isNightHour(0)).toBe(true);   // Medianoche
    expect(isNightHour(5)).toBe(true);   // 5 AM
    
    // Casos negativos (Diurnos)
    expect(isNightHour(6)).toBe(false);  // 6 AM
    expect(isNightHour(12)).toBe(false); // Mediodía
    expect(isNightHour(20)).toBe(false); // 8 PM
  });

  test('calculateShiftEarnings(): Cálculo de turno diurno normal (8 horas)', () => {
    const shift = {
      startTime: '2026-05-27T08:00:00',
      endTime: '2026-05-27T16:00:00',
      type: 'diurno'
    };
    const hourlyRate = 10000;
    const result = calculateShiftEarnings(shift, hourlyRate);

    expect(result.totalHours).toBe(8);
    expect(result.normalHours).toBe(8);
    expect(result.extraHours).toBe(0);
    expect(result.earnings).toBe(80000); // 8 * 10,000
  });

  test('calculateShiftEarnings(): Cálculo con Horas Extras Diurnas (> 8 horas)', () => {
    const shift = {
      startTime: '2026-05-27T08:00:00',
      endTime: '2026-05-27T18:00:00', // 10 horas totales
      type: 'diurno'
    };
    const hourlyRate = 10000;
    const result = calculateShiftEarnings(shift, hourlyRate);

    expect(result.totalHours).toBe(10);
    expect(result.normalHours).toBe(8);
    expect(result.extraHours).toBe(2);
    // 8 * 10,000 + 2 * 10,000 * 1.25 = 80,000 + 25,000 = 105,000
    expect(result.earnings).toBe(105000);
  });

  test('calculateShiftEarnings(): Cálculo de turno Dominical con recargo', () => {
    const shift = {
      startTime: '2026-05-31T08:00:00', // Domingo
      endTime: '2026-05-31T16:00:00',
      type: 'dominical'
    };
    const hourlyRate = 10000;
    const result = calculateShiftEarnings(shift, hourlyRate);

    // 8 horas * 10,000 * 2.0 = 160,000
    expect(result.earnings).toBe(160000);
  });
});
