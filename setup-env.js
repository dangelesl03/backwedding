// Script para configurar variables de entorno
// Ejecutar: node setup-env.js

const fs = require('fs');
const path = require('path');

const envContent = `# PostgreSQL Connection (Vercel/Neon)
POSTGRES_URL=postgresql://neondb_owner:npg_Puhv1C0NSoga@ep-little-dawn-a4n48z0d-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=postgresql://neondb_owner:npg_Puhv1C0NSoga@ep-little-dawn-a4n48z0d-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret
JWT_SECRET=tu_jwt_secret_aqui_cambiar_en_produccion

# Port
PORT=5000

# Node Environment
NODE_ENV=development
`;

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado con las credenciales de PostgreSQL');
  console.log('⚠️  IMPORTANTE: Cambia JWT_SECRET por un valor seguro antes de desplegar');
} else {
  console.log('⚠️  El archivo .env ya existe. No se sobrescribió.');
  console.log('Si quieres actualizarlo, elimínalo primero y vuelve a ejecutar este script.');
}
