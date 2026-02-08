/**
 * Migración para agregar campo gift_type a la tabla gifts
 * Tipos: 'Ticket', 'Aporte libre', 'Pago total'
 */

require('dotenv').config();
const { query } = require('../db');

async function migrate() {
  try {
    console.log('🔄 Iniciando migración: agregar campo gift_type...\n');

    // 1. Verificar si la columna ya existe
    console.log('📝 Verificando si la columna gift_type existe...');
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gifts' 
      AND column_name = 'gift_type'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ La columna gift_type ya existe. No se requiere migración.');
      return;
    }

    // 2. Agregar columna gift_type
    console.log('📝 Agregando columna gift_type...');
    await query(`
      ALTER TABLE gifts 
      ADD COLUMN gift_type VARCHAR(50) DEFAULT 'Pago total' 
      CHECK (gift_type IN ('Ticket', 'Aporte libre', 'Pago total'))
    `);
    console.log('✅ Columna gift_type agregada');

    // 3. Migrar datos existentes basándose en el precio
    console.log('📝 Migrando datos existentes...');
    // Si precio es 0 o null, probablemente es "Aporte libre"
    await query(`
      UPDATE gifts 
      SET gift_type = 'Aporte libre' 
      WHERE price = 0 OR price IS NULL
    `);
    
    // Si available > 1, probablemente es "Ticket"
    await query(`
      UPDATE gifts 
      SET gift_type = 'Ticket' 
      WHERE available > 1 AND gift_type = 'Pago total'
    `);

    console.log('✅ Migración completada\n');

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    try {
      const { pool } = require('../db');
      await pool.end();
    } catch (error) {
      // Ignorar errores al cerrar conexión
    }
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
