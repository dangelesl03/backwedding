/**
 * Script de prueba para verificar que el código se puede cargar sin errores
 * Útil para debuggear problemas de build en Vercel
 * 
 * Ejecutar con: node test-build.js
 */

console.log('🧪 Iniciando prueba de carga de módulos...\n');

try {
  console.log('1. Cargando dotenv...');
  require('dotenv').config();
  console.log('   ✅ dotenv cargado');
  
  console.log('2. Cargando config...');
  const config = require('./config');
  console.log('   ✅ config cargado');
  console.log('   DATABASE_URL:', config.DATABASE_URL ? 'Configurada' : 'NO configurada');
  
  console.log('3. Cargando db...');
  const db = require('./db');
  console.log('   ✅ db cargado');
  console.log('   Pool:', db.pool ? 'Disponible' : 'No inicializado (normal si no hay DATABASE_URL)');
  
  console.log('4. Cargando server...');
  const app = require('./server');
  console.log('   ✅ server cargado');
  console.log('   App type:', typeof app);
  
  console.log('5. Cargando api/index...');
  const apiHandler = require('./api/index');
  console.log('   ✅ api/index cargado');
  console.log('   Handler type:', typeof apiHandler);
  
  console.log('\n✅ Todos los módulos se cargaron correctamente');
  console.log('✅ El código debería funcionar en Vercel');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error al cargar módulos:');
  console.error('   Mensaje:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
