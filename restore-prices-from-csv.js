/**
 * Script para restaurar precios desde un archivo CSV
 * Solo restaura precios de items con precio < 1000
 * Uso: node restore-prices-from-csv.js [ruta-al-csv]
 * Ejemplo: node restore-prices-from-csv.js bk/regalos.csv
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./db');
const Gift = require('./models/Gift');

/**
 * Parsea una línea CSV simple (no maneja comillas complejas)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Extrae el precio numérico de un string como "S/ 139.00" o "Aporte libre"
 */
function extractPrice(priceString) {
  if (!priceString || priceString.toLowerCase().includes('aporte libre')) {
    return null;
  }
  
  // Buscar números en el string
  const match = priceString.match(/[\d,]+\.?\d*/);
  if (match) {
    // Remover comas y convertir a número
    return parseFloat(match[0].replace(/,/g, ''));
  }
  
  return null;
}

async function restorePricesFromCSV(csvPath) {
  try {
    const fullPath = path.isAbsolute(csvPath) ? csvPath : path.join(__dirname, csvPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ No se encontró el archivo CSV: ${fullPath}`);
      process.exit(1);
    }

    console.log(`📖 Leyendo CSV: ${fullPath}\n`);
    const csvContent = fs.readFileSync(fullPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      console.error('❌ El archivo CSV está vacío o no tiene datos.');
      process.exit(1);
    }

    // Leer encabezados
    const headers = parseCSVLine(lines[0]);
    const numeroIndex = headers.indexOf('numero');
    const tituloIndex = headers.indexOf('titulo');
    const precioIndex = headers.indexOf('precio');

    if (numeroIndex === -1 || tituloIndex === -1 || precioIndex === -1) {
      console.error('❌ El CSV debe tener las columnas: numero, titulo, precio');
      console.log(`   Columnas encontradas: ${headers.join(', ')}`);
      process.exit(1);
    }

    console.log('📋 Procesando regalos del CSV...\n');

    const updates = [];
    let skippedCount = 0;
    let invalidPriceCount = 0;

    // Procesar cada línea (saltar encabezado)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = parseCSVLine(line);
      if (columns.length < Math.max(numeroIndex, tituloIndex, precioIndex) + 1) {
        continue;
      }

      const numero = columns[numeroIndex];
      const titulo = columns[tituloIndex];
      const precioStr = columns[precioIndex];

      const precio = extractPrice(precioStr);

      // Solo procesar items con precio < 1000
      if (precio === null) {
        skippedCount++;
        continue;
      }

      if (precio >= 1000) {
        skippedCount++;
        continue;
      }

      updates.push({
        numero: numero,
        titulo: titulo.trim(),
        precio: precio
      });
    }

    if (updates.length === 0) {
      console.log('⚠️  No se encontraron regalos con precio < 1000 para restaurar.');
      console.log(`   - Omitidos (sin precio válido o >= 1000): ${skippedCount}`);
      return;
    }

    console.log(`📝 Se restaurarán ${updates.length} precios (solo items < 1000):\n`);

    // Obtener todos los regalos de la base de datos para hacer match
    const allGiftsResult = await query('SELECT id, name, price FROM gifts ORDER BY id');
    const allGifts = allGiftsResult.rows;

    const toRestore = [];
    const notFound = [];

    // Buscar coincidencias por nombre
    for (const update of updates) {
      // Buscar por nombre exacto o similar
      const matchingGift = allGifts.find(gift => {
        const giftName = gift.name.trim().toLowerCase();
        const csvTitle = update.titulo.toLowerCase();
        
        // Match exacto
        if (giftName === csvTitle) {
          return true;
        }
        
        // Match parcial (por si hay diferencias menores)
        if (giftName.includes(csvTitle) || csvTitle.includes(giftName)) {
          return true;
        }
        
        return false;
      });

      if (matchingGift) {
        const currentPrice = parseFloat(matchingGift.price);
        if (currentPrice !== update.precio) {
          toRestore.push({
            id: matchingGift.id,
            name: matchingGift.name,
            currentPrice: currentPrice,
            newPrice: update.precio,
            csvTitle: update.titulo
          });
        }
      } else {
        notFound.push({
          numero: update.numero,
          titulo: update.titulo,
          precio: update.precio
        });
      }
    }

    if (toRestore.length === 0) {
      console.log('✅ No hay cambios que restaurar (todos los precios ya están correctos o no se encontraron coincidencias).\n');
      if (notFound.length > 0) {
        console.log(`⚠️  ${notFound.length} regalos del CSV no se encontraron en la base de datos:`);
        notFound.forEach(item => {
          console.log(`   - "${item.titulo}" (Número: ${item.numero}, Precio: S/ ${item.precio.toFixed(2)})`);
        });
      }
      return;
    }

    console.log(`📝 Se restaurarán ${toRestore.length} precios:\n`);
    toRestore.forEach(item => {
      console.log(`   • ${item.name} (ID: ${item.id})`);
      console.log(`     S/ ${item.currentPrice.toFixed(2)} → S/ ${item.newPrice.toFixed(2)}\n`);
    });

    if (notFound.length > 0) {
      console.log(`\n⚠️  ${notFound.length} regalos del CSV no se encontraron en la base de datos:`);
      notFound.forEach(item => {
        console.log(`   - "${item.titulo}" (Número: ${item.numero}, Precio: S/ ${item.precio.toFixed(2)})`);
      });
      console.log('');
    }

    console.log('⚠️  ¿Deseas continuar con la restauración? (Ctrl+C para cancelar)');
    console.log('   Presiona Enter para continuar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    let restoredCount = 0;
    let errorCount = 0;

    // Restaurar los precios
    for (const item of toRestore) {
      try {
        await Gift.findByIdAndUpdate(item.id, { price: item.newPrice });
        restoredCount++;
        console.log(`✅ Restaurado: ${item.name} (ID: ${item.id}) - S/ ${item.newPrice.toFixed(2)}`);
      } catch (error) {
        console.error(`❌ Error restaurando ${item.name} (ID: ${item.id}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Resumen de restauración:');
    console.log(`   - Restaurados: ${restoredCount}`);
    console.log(`   - Errores: ${errorCount}`);
    console.log(`   - No encontrados en BD: ${notFound.length}`);
    console.log(`   - Omitidos (precio >= 1000 o sin precio): ${skippedCount}`);
    console.log(`   - Total procesados del CSV: ${updates.length + skippedCount}\n`);

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
  const csvPath = process.argv[2] || 'bk/regalos.csv';

  restorePricesFromCSV(csvPath)
    .then(() => {
      console.log('✨ Script finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { restorePricesFromCSV };
