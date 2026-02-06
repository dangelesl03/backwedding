// Asegurar que dotenv se cargue primero
require('dotenv').config();

const { Pool } = require('pg');
const config = require('./config');

// Validar que DATABASE_URL esté configurada
// NO hacer exit durante el build de Vercel - solo validar cuando se use
let databaseUrl = '';
if (config.DATABASE_URL && config.DATABASE_URL !== '' && config.DATABASE_URL !== 'undefined') {
  databaseUrl = String(config.DATABASE_URL).trim();
}

// Si la URL está vacía, solo advertir (no hacer exit durante build)
if (!databaseUrl || databaseUrl === 'undefined' || databaseUrl === 'null') {
  // En Vercel durante el build, las variables pueden no estar disponibles aún
  // Solo advertir, no hacer exit
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  ADVERTENCIA: DATABASE_URL no está configurada');
    console.warn('   Variables disponibles:', {
      POSTGRES_URL: process.env.POSTGRES_URL ? 'Configurada' : 'NO configurada',
      DATABASE_URL: process.env.DATABASE_URL ? 'Configurada' : 'NO configurada',
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? 'Configurada' : 'NO configurada'
    });
  }
  // No hacer exit aquí - dejar que falle cuando se intente usar la conexión
}

// Lazy initialization del pool - solo crear cuando se necesite
// Esto evita problemas durante el build de Vercel
let pool = null;

const getPool = () => {
  // Si ya existe el pool, retornarlo
  if (pool) {
    return pool;
  }
  
  // Validar que tengamos una URL válida antes de crear el pool
  if (!databaseUrl || databaseUrl === '' || databaseUrl === 'undefined' || databaseUrl === 'null') {
    throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel Dashboard → Settings → Environment Variables');
  }
  
  // Configurar SSL basado en la URL de conexión (Neon siempre requiere SSL)
  const sslConfig = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;

  // Crear el pool con la URL de conexión como string explícito
  pool = new Pool({
    connectionString: String(databaseUrl),
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Manejar errores de conexión
  pool.on('error', (err) => {
    console.error('Error inesperado en el cliente PostgreSQL:', err);
    // No hacer exit en Vercel - dejar que el error se maneje normalmente
    if (process.env.VERCEL !== '1') {
      process.exit(-1);
    }
  });
  
  return pool;
};

// Función helper para queries
const query = async (text, params) => {
  const activePool = getPool(); // Lazy initialization
  
  const start = Date.now();
  try {
    const res = await activePool.query(text, params);
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
  const activePool = getPool(); // Lazy initialization
  
  const client = await activePool.connect();
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
  get pool() {
    // Lazy getter para el pool - solo se crea cuando se accede
    try {
      return getPool();
    } catch (error) {
      // Retornar null si no está configurado en lugar de lanzar error
      return null;
    }
  },
  query,
  transaction
};
