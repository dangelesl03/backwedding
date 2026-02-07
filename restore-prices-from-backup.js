/**
 * Script para restaurar precios desde un archivo de backup
 * Uso: node restore-prices-from-backup.js <nombre-del-archivo-backup>
 * Ejemplo: node restore-prices-from-backup.js price-backup-2026-02-06_14-30-00.json
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./db');
const Gift = require('./models/Gift');

async function restorePricesFromBackup(backupFileName) {
  try {
    const backupDir = path.join(__dirname, 'backups');
    const backupPath = path.join(backupDir, backupFileName);

    if (!fs.existsSync(backupPath)) {
      console.error(`❌ No se encontró el archivo de backup: ${backupPath}`);
      console.log('\n📁 Archivos de backup disponibles:');
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
        if (files.length === 0) {
          console.log('   (No hay archivos de backup)');
        } else {
          files.forEach(file => console.log(`   - ${file}`));
        }
      }
      process.exit(1);
    }

    console.log(`📖 Leyendo backup: ${backupFileName}\n`);
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);

    console.log(`📋 Información del backup:`);
    console.log(`   - Fecha: ${backupData.timestamp}`);
    console.log(`   - Total de regalos: ${backupData.totalGifts}`);
    console.log(`   - Regalos modificados: ${backupData.updatedGifts}`);
    console.log(`   - Regalos sin cambios: ${backupData.unchangedGifts}\n`);

    if (!backupData.changes || backupData.changes.length === 0) {
      console.log('⚠️  Este backup no contiene cambios para restaurar.');
      return;
    }

    console.log(`📝 Se restaurarán ${backupData.changes.length} precios:\n`);
    backupData.changes.forEach(change => {
      console.log(`   • ${change.name} (ID: ${change.id})`);
      console.log(`     S/ ${change.newPrice.toFixed(2)} → S/ ${change.oldPrice.toFixed(2)}\n`);
    });

    console.log('⚠️  ¿Deseas continuar con la restauración? (Ctrl+C para cancelar)');
    console.log('   Presiona Enter para continuar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    let restoredCount = 0;
    let errorCount = 0;

    // Restaurar los precios
    for (const change of backupData.changes) {
      try {
        // Verificar que el regalo existe
        const gift = await Gift.findById(change.id);
        if (!gift) {
          console.error(`⚠️  Regalo no encontrado: ${change.name} (ID: ${change.id})`);
          errorCount++;
          continue;
        }

        await Gift.findByIdAndUpdate(change.id, { price: change.oldPrice });
        restoredCount++;
        console.log(`✅ Restaurado: ${change.name} (ID: ${change.id}) - S/ ${change.oldPrice.toFixed(2)}`);
      } catch (error) {
        console.error(`❌ Error restaurando ${change.name} (ID: ${change.id}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Resumen de restauración:');
    console.log(`   - Restaurados: ${restoredCount}`);
    console.log(`   - Errores: ${errorCount}`);
    console.log(`   - Total procesados: ${backupData.changes.length}\n`);

    console.log('✅ Restauración completada.\n');

  } catch (error) {
    console.error('❌ Error en la restauración:', error);
    process.exit(1);
  } finally {
    // Cerrar la conexión a la base de datos
    const { pool } = require('./db');
    await pool.end();
  }
}

// Ejecutar el script
if (require.main === module) {
  const backupFileName = process.argv[2];

  if (!backupFileName) {
    console.error('❌ Debes especificar el nombre del archivo de backup.');
    console.log('\n📖 Uso:');
    console.log('   node restore-prices-from-backup.js <nombre-del-archivo-backup>');
    console.log('\n📖 Ejemplo:');
    console.log('   node restore-prices-from-backup.js price-backup-2026-02-06_14-30-00.json');
    process.exit(1);
  }

  restorePricesFromBackup(backupFileName)
    .then(() => {
      console.log('✨ Script finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { restorePricesFromBackup };
