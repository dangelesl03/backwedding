/**
 * Migración: Cambiar receipt_file de VARCHAR(500) a TEXT para almacenar Base64
 * 
 * Este script actualiza la columna receipt_file en la tabla gift_contributions
 * para permitir almacenar imágenes Base64 que pueden ser muy largas.
 * 
 * Ejecutar con: node db/migrate-receipt-file-to-text.js
 */

require('dotenv').config();
const { query } = require('../db');

async function migrate() {
  try {
    console.log('🔄 Iniciando migración: receipt_file VARCHAR(500) -> TEXT');
    
    // Verificar si la columna existe y su tipo actual
    const checkColumn = await query(`
      SELECT data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'gift_contributions' AND column_name = 'receipt_file'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('❌ La columna receipt_file no existe en la tabla gift_contributions');
      console.log('💡 Ejecuta primero: node db/migrate-add-payment-fields.js');
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
      ALTER TABLE gift_contributions 
      ALTER COLUMN receipt_file TYPE TEXT 
      USING receipt_file::TEXT
    `);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📝 La columna receipt_file ahora puede almacenar imágenes Base64 de cualquier tamaño');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
