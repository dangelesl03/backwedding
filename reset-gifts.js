require('dotenv').config();
const { query } = require('./db');

(async () => {
  try {
    console.log('🔄 Reiniciando regalos a disponibles...\n');

    // Resetear is_contributed a false para todos los regalos
    const resetResult = await query(
      'UPDATE gifts SET is_contributed = false WHERE is_contributed = true RETURNING id, name'
    );
    
    console.log(`✅ ${resetResult.rowCount} regalo(s) marcado(s) como disponible(s):`);
    resetResult.rows.forEach(gift => {
      console.log(`   - ${gift.name} (ID: ${gift.id})`);
    });

    // Opcional: Limpiar todas las contribuciones (descomentar si quieres eliminar el historial)
    // const deleteContributions = await query('DELETE FROM gift_contributions RETURNING id');
    // console.log(`\n🗑️  ${deleteContributions.rowCount} contribución(es) eliminada(s)`);

    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error reiniciando regalos:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();

