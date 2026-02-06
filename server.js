// Cargar variables de entorno PRIMERO, antes de cualquier otra cosa
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const giftRoutes = require('./routes/gifts');
const eventRoutes = require('./routes/events');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const categoryRoutes = require('./routes/categories');
const importRoutes = require('./routes/import');
const config = require('./config');
const { initDatabase } = require('./db/init');

const app = express();

// Middleware CORS - Permitir solicitudes del frontend
const allowedOrigins = [
  'https://nataliaydaniel2026.vercel.app',
  'https://frontwedding-883s.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Eliminar valores undefined/null

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos de uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/categories', categoryRoutes);
app.use('/api/import', importRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exportar app para Vercel serverless
module.exports = app;

if (process.env.VERCEL !== '1') {
  const startServer = async () => {
    try {
      const { query } = require('./db');
      await query('SELECT NOW()');

      const PORT = config.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Error starting server:', error.message);
      process.exit(1);
    }
  };

  startServer();
}
