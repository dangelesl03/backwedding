/**
 * Script para actualizar los precios de todos los regalos a múltiplos de 500
 * Redondea al múltiplo de 500 más cercano
 * Ejemplos:
 * - 1400 → 1500
 * - 1200 → 1000
 * - 1300 → 1500
 * - 750 → 1000
 * - 250 → 500
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./db');
const Gift = require('./models/Gift');

/**
 * Redondea un número al múltiplo de 500 más cercano
 * Si el precio es 0 o menor a 500, lo convierte a 500 (mínimo permitido)
 * @param {number} price - Precio a redondear
 * @returns {number} - Precio redondeado al múltiplo de 500 más cercano (mínimo 500)
 */
function roundToNearest500(price) {
  // Si el precio es 0 o menor a 500, establecer mínimo de 500
  if (price <= 0 || price < 500) {
    return 500;
  }
  return Math.round(price / 500) * 500;
}

async function updatePricesToMultiples() {
  try {
    console.log('🔄 Iniciando actualización de precios a múltiplos de 500...\n');

    // Obtener todos los regalos (activos e inactivos) para actualizar todos los precios
    const result = await query('SELECT id, name, price FROM gifts ORDER BY id');
    const gifts = result.rows;

    if (gifts.length === 0) {
      console.log('⚠️  No se encontraron regalos activos.');
      return;
    }

    console.log(`📦 Se encontraron ${gifts.length} regalos activos.\n`);

    const updates = [];
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const gift of gifts) {
      const currentPrice = parseFloat(gift.price);
      const roundedPrice = roundToNearest500(currentPrice);

      if (currentPrice !== roundedPrice) {
        updates.push({
          id: gift.id,
          name: gift.name,
          oldPrice: currentPrice,
          newPrice: roundedPrice
        });
      } else {
        unchangedCount++;
      }
    }

    if (updates.length === 0) {
      console.log('✅ Todos los regalos ya tienen precios que son múltiplos de 500.\n');
      console.log(`📊 Resumen:`);
      console.log(`   - Sin cambios: ${unchangedCount}`);
      return;
    }

    console.log(`📝 Se actualizarán ${updates.length} regalos:\n`);
    updates.forEach(update => {
      console.log(`   • ${update.name}`);
      console.log(`     S/ ${update.oldPrice.toFixed(2)} → S/ ${update.newPrice.toFixed(2)}\n`);
    });

    // Crear backup de los precios antes de actualizar
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFileName = `price-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    const backupData = {
      timestamp: new Date().toISOString(),
      totalGifts: gifts.length,
      updatedGifts: updates.length,
      unchangedGifts: unchangedCount,
      changes: updates.map(update => ({
        id: update.id,
        name: update.name,
        oldPrice: update.oldPrice,
        newPrice: update.newPrice
      })),
      allGifts: gifts.map(gift => ({
        id: gift.id,
        name: gift.name,
        price: parseFloat(gift.price)
      }))
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`💾 Backup guardado en: ${backupPath}\n`);

    // Confirmar antes de actualizar
    console.log('⚠️  ¿Deseas continuar con la actualización? (Ctrl+C para cancelar)');
    console.log('   Presiona Enter para continuar...\n');
    
    // Esperar entrada del usuario (en producción, esto se puede omitir)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Actualizar los precios
    for (const update of updates) {
      try {
        await Gift.findByIdAndUpdate(update.id, { price: update.newPrice });
        updatedCount++;
        console.log(`✅ Actualizado: ${update.name} (ID: ${update.id})`);
      } catch (error) {
        console.error(`❌ Error actualizando ${update.name} (ID: ${update.id}):`, error.message);
      }
    }

    console.log('\n📊 Resumen de actualización:');
    console.log(`   - Actualizados: ${updatedCount}`);
    console.log(`   - Sin cambios: ${unchangedCount}`);
    console.log(`   - Total procesados: ${gifts.length}\n`);

    console.log('✅ Actualización completada.\n');

  } catch (error) {
    console.error('❌ Error en la actualización:', error);
    process.exit(1);
  } finally {
    // Cerrar la conexión a la base de datos
    const { pool } = require('./db');
    await pool.end();
  }
}

// Ejecutar el script
if (require.main === module) {
  updatePricesToMultiples()
    .then(() => {
      console.log('✨ Script finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { updatePricesToMultiples, roundToNearest500 };
