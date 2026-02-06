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

// Solo crear el pool si tenemos una URL válida
// Si no hay URL, el pool será null y fallará cuando se intente usar
let pool = null;

if (databaseUrl && databaseUrl !== '' && databaseUrl !== 'undefined' && databaseUrl !== 'null') {
  // Configurar SSL basado en la URL de conexión (Neon siempre requiere SSL)
  const sslConfig = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;

  // Crear el pool con la URL de conexión como string explícito
  // Asegurarse de que la URL sea un string primitivo, no un objeto
  pool = new Pool({
    connectionString: String(databaseUrl),
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  // Crear un pool dummy que fallará con un mensaje claro cuando se use
  pool = {
    query: async () => {
      throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel.');
    },
    connect: async () => {
      throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel.');
    },
    on: () => {}
  };
}

// Manejar errores de conexión (solo si el pool es válido)
if (pool && typeof pool.on === 'function') {
  pool.on('error', (err) => {
    console.error('Error inesperado en el cliente PostgreSQL:', err);
    // No hacer exit en Vercel - dejar que el error se maneje normalmente
    if (process.env.VERCEL !== '1') {
      process.exit(-1);
    }
  });
}

// Función helper para queries
const query = async (text, params) => {
  // Validar que el pool esté configurado antes de usar
  if (!pool || !databaseUrl || databaseUrl === '' || databaseUrl === 'undefined') {
    throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel Dashboard → Settings → Environment Variables');
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
  // Validar que el pool esté configurado antes de usar
  if (!pool || !databaseUrl || databaseUrl === '' || databaseUrl === 'undefined') {
    throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel Dashboard → Settings → Environment Variables');
  }
  
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
