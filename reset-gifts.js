require('dotenv').config();
const { query } = require('./db');

(async () => {
  try {
    console.log('🔄 Reiniciando regalos y eliminando todas las contribuciones...\n');

    // Obtener información detallada de las contribuciones antes de eliminarlas
    const contributionsInfo = await query(`
      SELECT 
        COUNT(*) as total, 
        SUM(amount) as total_amount,
        COUNT(CASE WHEN receipt_file IS NOT NULL THEN 1 END) as with_receipt,
        COUNT(CASE WHEN note IS NOT NULL AND note != '' THEN 1 END) as with_note
      FROM gift_contributions
    `);
    const totalContributions = parseInt(contributionsInfo.rows[0]?.total || 0);
    const totalAmount = parseFloat(contributionsInfo.rows[0]?.total_amount || 0);
    const withReceipt = parseInt(contributionsInfo.rows[0]?.with_receipt || 0);
    const withNote = parseInt(contributionsInfo.rows[0]?.with_note || 0);

    console.log(`📊 Información antes de eliminar:`);
    console.log(`   - Total de contribuciones: ${totalContributions}`);
    console.log(`   - Monto total: S/ ${totalAmount.toFixed(2)}`);
    console.log(`   - Contribuciones con comprobante: ${withReceipt}`);
    console.log(`   - Contribuciones con nota: ${withNote}\n`);

    // Eliminar todas las contribuciones (incluye receipt_file y note por CASCADE o directamente)
    // Esto eliminará automáticamente todos los datos relacionados:
    // - amount (monto)
    // - receipt_file (comprobante Base64)
    // - note (nota del usuario)
    // - contributed_at (fecha)
    const deleteContributions = await query(`
      DELETE FROM gift_contributions 
      RETURNING id, gift_id, amount, receipt_file, note
    `);
    
    console.log(`🗑️  ${deleteContributions.rowCount} contribución(es) eliminada(s)`);
    if (totalAmount > 0) {
      console.log(`   💰 Total eliminado: S/ ${totalAmount.toFixed(2)}`);
    }
    if (withReceipt > 0) {
      console.log(`   📎 Comprobantes eliminados: ${withReceipt}`);
    }
    if (withNote > 0) {
      console.log(`   📝 Notas eliminadas: ${withNote}`);
    }

    // Verificar que no queden contribuciones huérfanas
    const remainingContributions = await query('SELECT COUNT(*) as total FROM gift_contributions');
    const remainingCount = parseInt(remainingContributions.rows[0]?.total || 0);
    if (remainingCount > 0) {
      console.log(`\n⚠️  Advertencia: Aún quedan ${remainingCount} contribución(es) en la base de datos`);
    } else {
      console.log(`\n✅ Verificación: No quedan contribuciones en la base de datos`);
    }

    // Resetear is_contributed a false para TODOS los regalos (activos e inactivos)
    const resetResult = await query(`
      UPDATE gifts 
      SET is_contributed = false 
      WHERE is_contributed = true 
      RETURNING id, name, is_active
    `);
    
    console.log(`\n🔄 ${resetResult.rowCount} regalo(s) marcado(s) como disponible(s):`);
    const activeGifts = resetResult.rows.filter(g => g.is_active);
    const inactiveGifts = resetResult.rows.filter(g => !g.is_active);
    
    if (activeGifts.length > 0) {
      console.log(`   Activos (${activeGifts.length}):`);
      activeGifts.forEach(gift => {
        console.log(`     - ${gift.name} (ID: ${gift.id})`);
      });
    }
    if (inactiveGifts.length > 0) {
      console.log(`   Inactivos (${inactiveGifts.length}):`);
      inactiveGifts.forEach(gift => {
        console.log(`     - ${gift.name} (ID: ${gift.id})`);
      });
    }

    // Verificar que todos los regalos estén disponibles (tanto activos como inactivos)
    const allGifts = await query('SELECT id, name, is_contributed, is_active FROM gifts ORDER BY is_active DESC, name');
    const stillContributed = allGifts.rows.filter(g => g.is_contributed);
    
    if (stillContributed.length > 0) {
      console.log(`\n⚠️  Advertencia: ${stillContributed.length} regalo(s) aún marcado(s) como contribuido(s):`);
      stillContributed.forEach(gift => {
        const status = gift.is_active ? 'Activo' : 'Inactivo';
        console.log(`   - ${gift.name} (ID: ${gift.id}, ${status})`);
      });
    } else {
      console.log(`\n✅ Verificación: Todos los regalos están marcados como disponibles`);
    }

    // Verificar integridad: asegurar que no haya contribuciones sin regalo asociado
    const orphanContributions = await query(`
      SELECT COUNT(*) as total 
      FROM gift_contributions gc
      LEFT JOIN gifts g ON gc.gift_id = g.id
      WHERE g.id IS NULL
    `);
    const orphanCount = parseInt(orphanContributions.rows[0]?.total || 0);
    if (orphanCount > 0) {
      console.log(`\n⚠️  Advertencia: Se encontraron ${orphanCount} contribución(es) huérfana(s) (sin regalo asociado)`);
      // Eliminar contribuciones huérfanas
      const deleteOrphans = await query(`
        DELETE FROM gift_contributions 
        WHERE gift_id NOT IN (SELECT id FROM gifts)
        RETURNING id
      `);
      console.log(`   🗑️  ${deleteOrphans.rowCount} contribución(es) huérfana(s) eliminada(s)`);
    }

    // Resumen final
    console.log('\n✅ Proceso completado exitosamente');
    console.log(`📊 Resumen final:`);
    console.log(`   - Contribuciones eliminadas: ${deleteContributions.rowCount}`);
    console.log(`   - Comprobantes eliminados: ${withReceipt}`);
    console.log(`   - Notas eliminadas: ${withNote}`);
    console.log(`   - Regalos reseteados: ${resetResult.rowCount}`);
    console.log(`   - Total de regalos en BD: ${allGifts.rowCount}`);
    console.log(`   - Regalos activos: ${allGifts.rows.filter(g => g.is_active).length}`);
    console.log(`   - Regalos inactivos: ${allGifts.rows.filter(g => !g.is_active).length}`);
    console.log(`   - Contribuciones restantes: ${remainingCount}`);
    
    if (remainingCount === 0 && stillContributed.length === 0 && orphanCount === 0) {
      console.log(`\n✨ Estado: Base de datos completamente limpia`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error reiniciando regalos:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
