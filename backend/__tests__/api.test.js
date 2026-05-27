const request = require('supertest');
const app = require('../index');

describe('Módulo: Backend API - Endpoints', () => {
  
  test('GET /: Debería confirmar que el servidor está corriendo', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'Servidor corriendo 🚀');
  });

  describe('Auth - Password Reset', () => {
    test('POST /auth/forgot-password: Debería generar un token de recuperación', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('debug_token');
    });

    test('POST /auth/forgot-password: Debería fallar sin email', async () => {
      const res = await request(app).post('/auth/forgot-password').send({});
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('Shifts - Gestión de Turnos', () => {
    test('POST /shifts: Debería crear un turno correctamente', async () => {
      const shiftData = {
        date: '2026-05-27',
        startTime: '2026-05-27T08:00:00',
        endTime: '2026-05-27T16:00:00',
        type: 'diurno'
      };

      const res = await request(app)
        .post('/shifts')
        .send(shiftData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shift.totalHours).toBe(8);
    });

    test('GET /shifts/:userId: Debería obtener los turnos de un usuario', async () => {
      const res = await request(app).get('/shifts/user_123');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.shifts)).toBe(true);
    });
  });

  describe('Salary - Reportes', () => {
    test('GET /salary/:userId: Debería calcular el total acumulado', async () => {
      const res = await request(app).get('/salary/user_123');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('totalEarnings');
      expect(res.body.totalEarnings).toBeGreaterThan(0);
    });
  });
});
