// Cálculo de salario según ley laboral colombiana

export const SURCHARGES = {
  extraDay: 1.25,        // Hora extra diurna
  extraNight: 1.75,      // Hora extra nocturna
  nightRecargo: 1.35,    // Recargo nocturno (9pm - 6am)
  sunday: 2.0,           // Domingo / Festivo
  extraSunday: 2.75,     // Hora extra dominical
};

// Horas normales de jornada diaria
const DAILY_HOURS_LIMIT = 8;

/**
 * Calcula si una hora cae en turno nocturno (21:00 - 06:00)
 */
export function isNightHour(hour) {
  return hour >= 21 || hour < 6;
}

/**
 * Calcula las horas trabajadas entre dos fechas
 */
export function calcHoursWorked(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  return diffMs / (1000 * 60 * 60); // Convertir ms a horas
}

/**
 * Calcula el pago de un turno
 * @param {Object} shift - { startTime, endTime, type, hourlyRate }
 * @param {Object} surcharges - Recargos configurados por el usuario
 */
export function calculateShiftEarnings(shift, hourlyRate, surcharges = SURCHARGES) {
  const { startTime, endTime, type } = shift;
  
  const totalHours = calcHoursWorked(startTime, endTime);
  const normalHours = Math.min(totalHours, DAILY_HOURS_LIMIT);
  const extraHours = Math.max(0, totalHours - DAILY_HOURS_LIMIT);

  let earnings = 0;

  if (type === 'dominical' || type === 'festivo') {
    // Horas dominicales / festivas
    earnings += normalHours * hourlyRate * surcharges.sunday;
    if (extraHours > 0) {
      earnings += extraHours * hourlyRate * surcharges.extraSunday;
    }
  } else if (type === 'nocturno') {
    // Turno nocturno con recargo
    earnings += normalHours * hourlyRate * surcharges.nightRecargo;
    if (extraHours > 0) {
      earnings += extraHours * hourlyRate * surcharges.extraNight;
    }
  } else {
    // Turno normal diurno
    earnings += normalHours * hourlyRate;
    if (extraHours > 0) {
      earnings += extraHours * hourlyRate * surcharges.extraDay;
    }
  }

  return {
    totalHours: parseFloat(totalHours.toFixed(2)),
    normalHours: parseFloat(normalHours.toFixed(2)),
    extraHours: parseFloat(extraHours.toFixed(2)),
    earnings: parseFloat(earnings.toFixed(0)),
  };
}

/**
 * Calcula el total del mes
 */
export function calculateMonthlyEarnings(shifts, hourlyRate) {
  return shifts.reduce((acc, shift) => {
    const result = calculateShiftEarnings(shift, hourlyRate);
    return {
      totalHours: acc.totalHours + result.totalHours,
      extraHours: acc.extraHours + result.extraHours,
      earnings: acc.earnings + result.earnings,
    };
  }, { totalHours: 0, extraHours: 0, earnings: 0 });
}

/**
 * Formatea un número como moneda colombiana
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}
