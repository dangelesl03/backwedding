/**
 * Migración: Agregar campos receipt_file y note a gift_contributions
 * 
 * Este script agrega los campos receipt_file (para almacenar la ruta del comprobante)
 * y note (para almacenar la nota del usuario) a la tabla gift_contributions.
 * 
 * Ejecutar con: node db/migrate-add-payment-fields.js
 */

require('dotenv').config();
const { query } = require('../db');

async function migrate() {
  try {
    console.log('🔄 Iniciando migración: Agregar campos receipt_file y note a gift_contributions');
    
    // Verificar si las columnas ya existen
    const checkColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gift_contributions' 
      AND column_name IN ('receipt_file', 'note')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    // Agregar receipt_file si no existe
    if (!existingColumns.includes('receipt_file')) {
      console.log('🔄 Agregando columna receipt_file...');
      await query(`
        ALTER TABLE gift_contributions 
        ADD COLUMN receipt_file VARCHAR(500)
      `);
      console.log('✅ Columna receipt_file agregada');
    } else {
      console.log('✅ Columna receipt_file ya existe');
    }
    
    // Agregar note si no existe
    if (!existingColumns.includes('note')) {
      console.log('🔄 Agregando columna note...');
      await query(`
        ALTER TABLE gift_contributions 
        ADD COLUMN note TEXT
      `);
      console.log('✅ Columna note agregada');
    } else {
      console.log('✅ Columna note ya existe');
    }
    
    console.log('✅ Migración completada exitosamente');
    console.log('📝 Los campos receipt_file y note están disponibles en gift_contributions');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
