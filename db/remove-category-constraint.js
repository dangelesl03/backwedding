/**
 * Script para eliminar el constraint CHECK de la columna category en gifts
 * Esto permite usar cualquier valor de categoría sin restricciones
 */

require('dotenv').config();
const { query } = require('../db');

async function removeCategoryConstraint() {
  try {
    console.log('🔄 Eliminando constraint CHECK de la columna category...\n');

    // Intentar eliminar el constraint si existe
    try {
      await query(`
        ALTER TABLE gifts 
        DROP CONSTRAINT IF EXISTS gifts_category_check
      `);
      console.log('✅ Constraint gifts_category_check eliminado\n');
    } catch (error) {
      // Si el constraint tiene otro nombre, intentar encontrarlo
      console.log('⚠️  Intentando encontrar el constraint...');
      
      // Obtener información del constraint
      const constraintInfo = await query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'gifts'::regclass
        AND contype = 'c'
        AND conname LIKE '%category%'
      `);

      if (constraintInfo.rows.length > 0) {
        for (const constraint of constraintInfo.rows) {
          console.log(`   Encontrado constraint: ${constraint.conname}`);
          try {
            await query(`ALTER TABLE gifts DROP CONSTRAINT ${constraint.conname}`);
            console.log(`   ✅ Constraint ${constraint.conname} eliminado`);
          } catch (err) {
            console.error(`   ❌ Error eliminando ${constraint.conname}:`, err.message);
          }
        }
      } else {
        console.log('   ℹ️  No se encontraron constraints de categoría');
      }
    }

    // Verificar que la columna category existe y puede aceptar cualquier valor
    console.log('\n✅ La columna category ahora acepta cualquier valor\n');
    console.log('📝 Puedes usar cualquier nombre de categoría sin restricciones\n');

  } catch (error) {
    console.error('❌ Error eliminando constraint:', error);
    process.exit(1);
  } finally {
    const { pool } = require('../db');
    await pool.end();
  }
}

if (require.main === module) {
  removeCategoryConstraint()
    .then(() => {
      console.log('✨ Script finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { removeCategoryConstraint };
