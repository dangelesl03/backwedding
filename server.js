// Cargar variables de entorno PRIMERO, antes de cualquier otra cosa
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const giftRoutes = require('./routes/gifts');
const eventRoutes = require('./routes/events');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const config = require('./config');
const { initDatabase } = require('./db/init');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de logging para desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    message: 'Error en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rutas (registradas antes de iniciar el servidor)
app.use('/api/auth', authRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exportar app para Vercel serverless
module.exports = app;

// Solo iniciar servidor si no estamos en Vercel (vercel dev o producción)
if (process.env.VERCEL !== '1') {
  // Inicializar base de datos y luego iniciar servidor
  const startServer = async () => {
    try {
      console.log('🔌 Verificando conexión a la base de datos...');
      
      // Verificar conexión a la base de datos (sin inicializar schema cada vez)
      const { query } = require('./db');
      
      // Probar la conexión
      await query('SELECT NOW()');
      console.log('✅ Base de datos PostgreSQL conectada correctamente');

      const PORT = config.PORT || 5000;

      app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`📝 API disponible en http://localhost:${PORT}/api`);
        console.log(`💳 Endpoint de pagos: http://localhost:${PORT}/api/payments/confirm`);
        console.log(`🔐 Endpoint de login: http://localhost:${PORT}/api/auth/login`);
      });
    } catch (error) {
      console.error('❌ Error iniciando servidor:', error.message);
      console.error('Stack trace:', error.stack);
      if (error.code) {
        console.error('Código de error:', error.code);
      }
      process.exit(1);
    }
  };

  startServer();
}
