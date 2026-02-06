// Asegurar que dotenv se cargue primero
require('dotenv').config();

const { Pool } = require('pg');
const config = require('./config');

// Validar que DATABASE_URL esté configurada
// Durante el build de Vercel, las variables pueden no estar disponibles inmediatamente
// Por lo tanto, solo validar y hacer exit en desarrollo local
let databaseUrl = '';
if (config.DATABASE_URL && config.DATABASE_URL !== '' && config.DATABASE_URL !== 'undefined') {
  databaseUrl = String(config.DATABASE_URL).trim();
}

// Si la URL está vacía, manejar según el entorno
if (!databaseUrl || databaseUrl === 'undefined' || databaseUrl === 'null') {
  // En desarrollo local, hacer exit si no hay DATABASE_URL
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    console.error('❌ ERROR: DATABASE_URL no está configurada en las variables de entorno');
    console.error('   Verifica que el archivo .env tenga la variable DATABASE_URL o POSTGRES_URL');
    console.error('   Variables disponibles:', {
      POSTGRES_URL: process.env.POSTGRES_URL ? 'Configurada' : 'NO configurada',
      DATABASE_URL: process.env.DATABASE_URL ? 'Configurada' : 'NO configurada',
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? 'Configurada' : 'NO configurada'
    });
    process.exit(1);
  }
  // En Vercel, si no hay URL durante el build, usar una URL dummy temporal
  // El pool se creará pero fallará cuando se intente usar (lo cual está bien para el build)
  // Esto permite que el build complete sin errores
  databaseUrl = 'postgresql://dummy:dummy@localhost:5432/dummy';
  console.warn('⚠️  DATABASE_URL no disponible durante build, usando URL temporal');
}

// Configurar SSL basado en la URL de conexión (Neon siempre requiere SSL)
const sslConfig = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
  ? { rejectUnauthorized: false }
  : false;

// Crear el pool con la URL de conexión como string explícito
// Asegurarse de que la URL sea un string primitivo, no un objeto
let pool = new Pool({
  connectionString: String(databaseUrl),
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Manejar errores de conexión
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente PostgreSQL:', err);
  // Solo hacer exit en desarrollo local, no en Vercel
  if (process.env.VERCEL !== '1') {
    process.exit(-1);
  }
});

// Función helper para queries
const query = async (text, params) => {
  // Validar que tengamos una URL real antes de hacer queries
  // Si estamos usando la URL dummy, intentar obtener la URL real de las variables de entorno
  if (databaseUrl.includes('dummy@localhost')) {
    const realUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
    if (realUrl && realUrl !== '' && realUrl !== 'undefined') {
      // Recrear el pool con la URL real
      databaseUrl = String(realUrl).trim();
      const sslConfig = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false;
      pool.end().catch(() => {}); // Cerrar pool anterior si existe
      pool = new Pool({
        connectionString: String(databaseUrl),
        ssl: sslConfig,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      pool.on('error', (err) => {
        console.error('Error inesperado en el cliente PostgreSQL:', err);
        if (process.env.VERCEL !== '1') {
          process.exit(-1);
        }
      });
    } else {
      throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel Dashboard → Settings → Environment Variables');
    }
  }
  
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Query ejecutada', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Error en query:', { 
      text: text.substring(0, 200), 
      params,
      error: error.message,
      code: error.code
    });
    throw error;
  }
};

// Función helper para transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction
};
