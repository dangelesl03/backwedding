/**
 * Migración: Cambiar image_url de VARCHAR(500) a TEXT
 * 
 * Este script actualiza la columna image_url en la tabla gifts
 * para permitir almacenar imágenes Base64 que pueden ser muy largas.
 * 
 * Ejecutar con: node db/migrate-image-url-to-text.js
 */

require('dotenv').config();
const { query } = require('../db');

async function migrate() {
  try {
    console.log('🔄 Iniciando migración: image_url VARCHAR(500) -> TEXT');
    
    // Verificar si la columna existe y su tipo actual
    const checkColumn = await query(`
      SELECT data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'gifts' AND column_name = 'image_url'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('❌ La columna image_url no existe en la tabla gifts');
      process.exit(1);
    }
    
    const currentType = checkColumn.rows[0].data_type;
    const currentLength = checkColumn.rows[0].character_maximum_length;
    
    console.log(`📊 Tipo actual: ${currentType}${currentLength ? `(${currentLength})` : ''}`);
    
    // Si ya es TEXT, no hacer nada
    if (currentType === 'text') {
      console.log('✅ La columna ya es de tipo TEXT. No se requiere migración.');
      process.exit(0);
    }
    
    // Cambiar el tipo de dato a TEXT
    console.log('🔄 Cambiando tipo de dato a TEXT...');
    await query(`
      ALTER TABLE gifts 
      ALTER COLUMN image_url TYPE TEXT 
      USING image_url::TEXT
    `);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📝 La columna image_url ahora puede almacenar imágenes Base64 de cualquier tamaño');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
