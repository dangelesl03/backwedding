// Asegurar que dotenv se cargue primero
require('dotenv').config();

const { Pool } = require('pg');
const config = require('./config');

// Validar que DATABASE_URL esté configurada
if (!config.DATABASE_URL || config.DATABASE_URL === '' || config.DATABASE_URL === 'undefined') {
  console.error('❌ ERROR: DATABASE_URL no está configurada en las variables de entorno');
  console.error('   Verifica que el archivo .env tenga la variable DATABASE_URL o POSTGRES_URL');
  console.error('   Variables disponibles:', {
    POSTGRES_URL: process.env.POSTGRES_URL ? 'Configurada' : 'NO configurada',
    DATABASE_URL: process.env.DATABASE_URL ? 'Configurada' : 'NO configurada',
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? 'Configurada' : 'NO configurada'
  });
  process.exit(1);
}

// Asegurar que DATABASE_URL sea un string válido
let databaseUrl = String(config.DATABASE_URL).trim();

// Si la URL está vacía después de convertir a string, hay un problema
if (!databaseUrl || databaseUrl === 'undefined' || databaseUrl === 'null') {
  console.error('❌ ERROR: DATABASE_URL no es válida');
  console.error('   Valor recibido:', config.DATABASE_URL);
  process.exit(1);
}

// Configurar SSL basado en la URL de conexión (Neon siempre requiere SSL)
const sslConfig = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
  ? { rejectUnauthorized: false }
  : false;

// Crear el pool con la URL de conexión como string explícito
// Asegurarse de que la URL sea un string primitivo, no un objeto
const pool = new Pool({
  connectionString: String(databaseUrl),
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Manejar errores de conexión
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente PostgreSQL:', err);
  process.exit(-1);
});

// Función helper para queries
const query = async (text, params) => {
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
