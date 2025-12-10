// Asegurar que dotenv se cargue primero si no se ha cargado ya
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv puede no estar disponible, pero eso está bien si las variables ya están en el entorno
  }
}

// Asegurar que DATABASE_URL siempre sea un string válido
const getDatabaseUrl = () => {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    return '';
  }
  // Convertir a string y limpiar espacios
  return String(url).trim();
};

module.exports = {
  // PostgreSQL connection - Vercel/Neon compatible
  DATABASE_URL: getDatabaseUrl(),
  JWT_SECRET: process.env.JWT_SECRET || 'tu_jwt_secret_aqui',
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development'
};
