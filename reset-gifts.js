require('dotenv').config();
const { query } = require('./db');

(async () => {
  try {
    console.log('🔄 Reiniciando regalos y eliminando todos los pagos...\n');

    // Primero, obtener información de las contribuciones antes de eliminarlas
    const contributionsInfo = await query(
      'SELECT COUNT(*) as total, SUM(amount) as total_amount FROM gift_contributions'
    );
    const totalContributions = contributionsInfo.rows[0]?.total || 0;
    const totalAmount = contributionsInfo.rows[0]?.total_amount || 0;

    // Eliminar todas las contribuciones (pagos)
    const deleteContributions = await query('DELETE FROM gift_contributions RETURNING id, gift_id, amount');
    console.log(`🗑️  ${deleteContributions.rowCount} contribución(es) eliminada(s)`);
    if (totalAmount > 0) {
      console.log(`   Total eliminado: S/ ${parseFloat(totalAmount).toFixed(2)}`);
    }

    // Resetear is_contributed a false para todos los regalos
    const resetResult = await query(
      'UPDATE gifts SET is_contributed = false WHERE is_contributed = true RETURNING id, name'
    );
    
    console.log(`\n✅ ${resetResult.rowCount} regalo(s) marcado(s) como disponible(s):`);
    resetResult.rows.forEach(gift => {
      console.log(`   - ${gift.name} (ID: ${gift.id})`);
    });

    // Verificar que todos los regalos estén disponibles
    const allGifts = await query('SELECT id, name, is_contributed FROM gifts WHERE is_active = true');
    const stillContributed = allGifts.rows.filter(g => g.is_contributed);
    if (stillContributed.length > 0) {
      console.log(`\n⚠️  Advertencia: ${stillContributed.length} regalo(s) aún marcado(s) como contribuido(s):`);
      stillContributed.forEach(gift => {
        console.log(`   - ${gift.name} (ID: ${gift.id})`);
      });
    }

    console.log('\n✅ Proceso completado exitosamente');
    console.log(`📊 Resumen:`);
    console.log(`   - Contribuciones eliminadas: ${deleteContributions.rowCount}`);
    console.log(`   - Regalos reseteados: ${resetResult.rowCount}`);
    console.log(`   - Total de regalos activos: ${allGifts.rowCount}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error reiniciando regalos:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();

