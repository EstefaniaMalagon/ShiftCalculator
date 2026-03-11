export const COLORS = {
  bg: '#0A0E1A',
  surface: '#0E1726',
  card: '#111827',
  border: '#1F2937',
  cyan: '#00D4FF',
  green: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  red: '#EF4444',
  text: '#FFFFFF',
  muted: '#9CA3AF',
  subtle: '#6B7280',
};

export const SHIFT_TYPES = ['normal', 'nocturno', 'dominical', 'festivo'];

export const SHIFT_TYPE_INFO = {
  normal:    { label: 'Diurno',    icon: '☀️', color: COLORS.green },
  nocturno:  { label: 'Nocturno',  icon: '🌙', color: COLORS.purple },
  dominical: { label: 'Dominical', icon: '📅', color: COLORS.amber },
  festivo:   { label: 'Festivo',   icon: '🎉', color: COLORS.red },
};

export const MONTHS_ES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
