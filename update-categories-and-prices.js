/**
 * Script para actualizar categorías y precios desde CSV
 * - Elimina todas las categorías existentes
 * - Crea nuevas categorías desde el CSV
 * - Actualiza precios solo de regalos < 1000
 * - Relaciona regalos con categorías
 * - Genera un MD con diferencias de precios
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./db');
const Gift = require('./models/Gift');
const Category = require('./models/Category');

/**
 * Parsea una línea CSV simple
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
  
  const match = priceString.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  
  return null;
}

async function updateCategoriesAndPrices() {
  try {
    console.log('🔄 Iniciando actualización de categorías y precios...\n');

    // 0. Verificar conexión a la base de datos
    console.log('🔌 Verificando conexión a la base de datos...');
    try {
      await query('SELECT 1');
      console.log('✅ Conexión a la base de datos establecida\n');
    } catch (error) {
      console.error('❌ Error al conectar con la base de datos:', error.message);
      console.error('   Verifica que DATABASE_URL esté configurada correctamente en el archivo .env');
      process.exit(1);
    }

    // 1. Leer el CSV
    const csvPath = path.join(__dirname, 'bk', 'regalos.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ No se encontró el archivo CSV: ${csvPath}`);
      process.exit(1);
    }

    console.log('📖 Leyendo CSV...');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
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
    const categoriaIndex = headers.indexOf('categoria');
    const tipoRegaloIndex = headers.indexOf('tipo_regalo');
    const ticketsDisponiblesIndex = headers.indexOf('tickets_disponibles');

    if (numeroIndex === -1 || tituloIndex === -1 || precioIndex === -1 || categoriaIndex === -1) {
      console.error('❌ El CSV debe tener las columnas: numero, titulo, precio, categoria');
      process.exit(1);
    }

    // Las columnas tipo_regalo y tickets_disponibles son opcionales
    if (tipoRegaloIndex === -1) {
      console.log('⚠️  No se encontró la columna "tipo_regalo" en el CSV. Se inferirá del precio.');
    }
    if (ticketsDisponiblesIndex === -1) {
      console.log('⚠️  No se encontró la columna "tickets_disponibles" en el CSV.');
    }

    // 2. Verificar que la columna gift_type existe, si no, ejecutar migración
    console.log('🔍 Verificando columna gift_type...');
    try {
      const checkColumn = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'gifts' 
        AND column_name = 'gift_type'
      `);
      
      if (checkColumn.rows.length === 0) {
        console.log('📝 La columna gift_type no existe. Ejecutando migración...');
        const { migrate } = require('./db/migrate-add-gift-type');
        await migrate();
        console.log('✅ Migración completada\n');
      } else {
        console.log('✅ La columna gift_type ya existe\n');
      }
    } catch (error) {
      console.error('⚠️  Error al verificar columna gift_type:', error.message);
      console.log('   Continuando sin verificar...\n');
    }

    // 3. Obtener todos los regalos actuales de la BD
    console.log('📦 Obteniendo regalos actuales de la base de datos...');
    let allGifts = [];
    try {
      const allGiftsResult = await query('SELECT id, name, price, category, category_id, gift_type, available, total FROM gifts ORDER BY id');
      allGifts = allGiftsResult.rows;
      console.log(`   Se encontraron ${allGifts.length} regalos en la BD\n`);
    } catch (error) {
      console.error('❌ Error al obtener regalos de la BD:', error.message);
      throw error;
    }

    // 4. Procesar el CSV
    console.log('📝 Procesando datos del CSV...');
    const csvGifts = [];
    const categoriesSet = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = parseCSVLine(line);
      if (columns.length < Math.max(numeroIndex, tituloIndex, precioIndex, categoriaIndex) + 1) {
        continue;
      }

      const numero = columns[numeroIndex];
      const titulo = columns[tituloIndex];
      const precioStr = columns[precioIndex];
      const categoria = columns[categoriaIndex];
      const tipoRegalo = tipoRegaloIndex !== -1 ? columns[tipoRegaloIndex] : null;
      const ticketsDisponiblesStr = ticketsDisponiblesIndex !== -1 ? columns[ticketsDisponiblesIndex] : null;

      const precio = extractPrice(precioStr);
      
      // Inferir tipo de regalo si no está en el CSV
      let giftType = null;
      if (tipoRegalo && tipoRegalo.trim()) {
        const tipo = tipoRegalo.trim();
        if (['Ticket', 'Aporte libre', 'Pago total'].includes(tipo)) {
          giftType = tipo;
        } else {
          console.log(`⚠️  Tipo de regalo inválido "${tipo}" para "${titulo}". Se inferirá del precio.`);
        }
      }
      
      // Si no se especificó tipo, inferirlo del precio
      if (!giftType) {
        if (precio === null || precio === 0) {
          giftType = 'Aporte libre';
        } else {
          giftType = 'Pago total';
        }
      }

      // Procesar tickets disponibles
      let ticketsDisponibles = null;
      if (ticketsDisponiblesStr && ticketsDisponiblesStr.trim()) {
        const tickets = parseInt(ticketsDisponiblesStr.trim());
        if (!isNaN(tickets) && tickets >= 0) {
          ticketsDisponibles = tickets;
          // Si hay tickets disponibles > 0, el tipo debe ser Ticket
          if (tickets > 0 && giftType !== 'Aporte libre') {
            giftType = 'Ticket';
          }
        }
      }

      if (categoria && categoria.trim()) {
        categoriesSet.add(categoria.trim());
      }

      csvGifts.push({
        numero: numero,
        titulo: titulo.trim(),
        precio: precio,
        categoria: categoria ? categoria.trim() : null,
        tipoRegalo: giftType,
        ticketsDisponibles: ticketsDisponibles
      });
    }

    console.log(`   Se procesaron ${csvGifts.length} regalos del CSV`);
    console.log(`   Categorías encontradas: ${Array.from(categoriesSet).join(', ')}\n`);

    // 4. Eliminar constraint CHECK de category si existe
    console.log('🔓 Eliminando constraint CHECK de category...');
    try {
      // Intentar eliminar el constraint con diferentes nombres posibles
      await query(`ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_category_check`).catch(() => {});
      
      // Buscar y eliminar cualquier constraint relacionado con category
      const constraints = await query(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'gifts'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%category%'
      `);
      
      for (const constraint of constraints.rows) {
        try {
          await query(`ALTER TABLE gifts DROP CONSTRAINT ${constraint.conname}`);
          console.log(`   ✅ Eliminado constraint: ${constraint.conname}`);
        } catch (err) {
          // Ignorar si ya no existe
        }
      }
      console.log('✅ Constraints de category eliminados\n');
    } catch (error) {
      console.log(`   ⚠️  No se pudo eliminar constraint (puede que no exista): ${error.message}\n`);
    }

    // 5. Desvincular regalos de categorías antes de eliminar
    console.log('🔗 Desvinculando regalos de categorías existentes...');
    try {
      await query('UPDATE gifts SET category_id = NULL');
      console.log('✅ Regalos desvinculados\n');
    } catch (error) {
      console.error('❌ Error al desvincular regalos:', error.message);
      throw error;
    }

    // 6. Eliminar todas las categorías existentes
    console.log('🗑️  Eliminando todas las categorías existentes...');
    let existingCategories = [];
    try {
      existingCategories = await Category.find();
      for (const cat of existingCategories) {
        try {
          await query('DELETE FROM categories WHERE id = $1', [cat.id]);
          console.log(`   ✅ Eliminada: ${cat.name}`);
        } catch (error) {
          console.error(`   ⚠️  Error al eliminar categoría ${cat.name}:`, error.message);
        }
      }
      console.log(`✅ Se eliminaron ${existingCategories.length} categorías\n`);
    } catch (error) {
      console.error('❌ Error al obtener/eliminar categorías:', error.message);
      throw error;
    }

    // 7. Crear nuevas categorías desde el CSV
    console.log('✨ Creando nuevas categorías...');
    const categoryMap = new Map();
    const categoriesArray = Array.from(categoriesSet).sort();

    try {
      for (const catName of categoriesArray) {
        try {
          const category = await Category.create({
            name: catName,
            description: `Categoría: ${catName}`,
            isActive: true
          });
          categoryMap.set(catName, category.id);
          console.log(`   ✅ Creada: ${catName} (ID: ${category.id})`);
        } catch (error) {
          console.error(`   ❌ Error al crear categoría ${catName}:`, error.message);
          throw error;
        }
      }
      console.log(`✅ Se crearon ${categoriesArray.length} categorías\n`);
    } catch (error) {
      console.error('❌ Error al crear categorías:', error.message);
      throw error;
    }

    // 8. Preparar actualizaciones de precios y categorías usando LIKE de SQL
    console.log('📊 Preparando actualizaciones (usando LIKE para matching flexible)...');
    const priceUpdates = [];
    const categoryUpdates = [];
    const giftTypeUpdates = []; // Actualizaciones de tipo de regalo
    const priceDifferences = [];
    const skippedHighPrice = [];
    const notFoundGifts = []; // Regalos del CSV que no encontraron coincidencia

    for (const csvGift of csvGifts) {
      // Buscar regalo usando LIKE de SQL (más flexible)
      const csvTitle = csvGift.titulo.trim();
      const csvTitleLower = csvTitle.toLowerCase();
      
      // Intentar diferentes estrategias de matching con LIKE
      let matchingGift = null;
      
      // 1. Match exacto (case insensitive)
      let result = await query(
        `SELECT id, name, price, category, category_id 
         FROM gifts 
         WHERE LOWER(name) = $1 AND is_active = true 
         LIMIT 1`,
        [csvTitleLower]
      );
      
      if (result.rows.length > 0) {
        matchingGift = result.rows[0];
      } else {
        // 2. LIKE con % al inicio y final (contiene)
        result = await query(
          `SELECT id, name, price, category, category_id 
           FROM gifts 
           WHERE LOWER(name) LIKE $1 AND is_active = true 
           LIMIT 1`,
          [`%${csvTitleLower}%`]
        );
        
        if (result.rows.length > 0) {
          matchingGift = result.rows[0];
        } else {
          // 3. LIKE con palabras clave (al menos 3 caracteres)
          const words = csvTitleLower.split(/\s+/).filter(w => w.length >= 3);
          if (words.length > 0) {
            // Buscar regalos que contengan al menos 2 palabras clave (usando parámetros seguros)
            if (words.length >= 2) {
              // Intentar con las primeras 2 palabras más significativas
              const word1 = words[0];
              const word2 = words[1];
              result = await query(
                `SELECT id, name, price, category, category_id 
                 FROM gifts 
                 WHERE LOWER(name) LIKE $1 AND LOWER(name) LIKE $2 AND is_active = true 
                 LIMIT 1`,
                [`%${word1}%`, `%${word2}%`]
              );
              
              if (result.rows.length > 0) {
                matchingGift = result.rows[0];
              }
            }
            
            // Si aún no hay coincidencia, intentar con la palabra más larga
            if (!matchingGift && words.length > 0) {
              const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);
              result = await query(
                `SELECT id, name, price, category, category_id 
                 FROM gifts 
                 WHERE LOWER(name) LIKE $1 AND is_active = true 
                 LIMIT 1`,
                [`%${longestWord}%`]
              );
              
              if (result.rows.length > 0) {
                matchingGift = result.rows[0];
              }
            }
          }
          
          // 4. LIKE con inicio similar (primeras 5+ caracteres)
          if (!matchingGift && csvTitleLower.length >= 5) {
            const prefix = csvTitleLower.substring(0, 5);
            result = await query(
              `SELECT id, name, price, category, category_id 
               FROM gifts 
               WHERE LOWER(name) LIKE $1 AND is_active = true 
               LIMIT 1`,
              [`${prefix}%`]
            );
            
            if (result.rows.length > 0) {
              matchingGift = result.rows[0];
            }
          }
        }
      }

      if (matchingGift) {
        const currentPrice = parseFloat(matchingGift.price);
        const csvPrice = csvGift.precio;

        // Actualizar categoría siempre (incluso si ya tiene una)
        if (csvGift.categoria && categoryMap.has(csvGift.categoria)) {
          const currentCategory = matchingGift.category || '';
          const newCategory = csvGift.categoria;
          
          // Actualizar si la categoría es diferente o si no tiene category_id
          if (currentCategory !== newCategory || !matchingGift.category_id) {
            categoryUpdates.push({
              giftId: matchingGift.id,
              giftName: matchingGift.name,
              categoryId: categoryMap.get(csvGift.categoria),
              categoryName: csvGift.categoria,
              oldCategory: currentCategory,
              csvTitle: csvGift.titulo
            });
          }
        }

        // Actualizar tipo de regalo y tickets disponibles
        if (csvGift.tipoRegalo) {
          const currentGiftType = matchingGift.gift_type || 'Pago total';
          const currentAvailable = matchingGift.available || 1;
          const currentTotal = matchingGift.total || 1;
          
          let needsUpdate = false;
          let newAvailable = currentAvailable;
          let newTotal = currentTotal;
          
          // Si el tipo cambió o si hay tickets disponibles especificados
          if (currentGiftType !== csvGift.tipoRegalo) {
            needsUpdate = true;
          }
          
          // Si es Ticket y se especificaron tickets disponibles
          if (csvGift.tipoRegalo === 'Ticket' && csvGift.ticketsDisponibles !== null) {
            newAvailable = csvGift.ticketsDisponibles;
            newTotal = csvGift.ticketsDisponibles; // Por ahora, total = disponible
            if (currentAvailable !== newAvailable || currentTotal !== newTotal) {
              needsUpdate = true;
            }
          } else if (csvGift.tipoRegalo === 'Ticket' && csvGift.ticketsDisponibles === null) {
            // Si es Ticket pero no se especificaron tickets, mantener los actuales o usar 1
            if (currentAvailable === 1 && currentTotal === 1 && currentGiftType !== 'Ticket') {
              newAvailable = 1;
              newTotal = 1;
              needsUpdate = true;
            }
          }
          
          if (needsUpdate) {
            giftTypeUpdates.push({
              giftId: matchingGift.id,
              giftName: matchingGift.name,
              oldGiftType: currentGiftType,
              newGiftType: csvGift.tipoRegalo,
              oldAvailable: currentAvailable,
              newAvailable: newAvailable,
              oldTotal: currentTotal,
              newTotal: newTotal
            });
          }
        }

        // Actualizar precio solo si < 1000
        if (csvPrice !== null) {
          if (csvPrice < 1000) {
            if (currentPrice !== csvPrice) {
              priceUpdates.push({
                giftId: matchingGift.id,
                giftName: matchingGift.name,
                oldPrice: currentPrice,
                newPrice: csvPrice
              });
              priceDifferences.push({
                giftId: matchingGift.id,
                giftName: matchingGift.name,
                oldPrice: currentPrice,
                newPrice: csvPrice,
                difference: csvPrice - currentPrice
              });
            }
          } else {
            // Precio >= 1000, solo registrar diferencia sin actualizar
            if (currentPrice !== csvPrice) {
              skippedHighPrice.push({
                giftId: matchingGift.id,
                giftName: matchingGift.name,
                oldPrice: currentPrice,
                newPrice: csvPrice,
                difference: csvPrice - currentPrice
              });
            }
          }
        }
      } else {
        // No se encontró coincidencia
        notFoundGifts.push({
          numero: csvGift.numero,
          titulo: csvGift.titulo,
          categoria: csvGift.categoria,
          precio: csvGift.precio
        });
      }
    }

    console.log(`   - Precios a actualizar (< 1000): ${priceUpdates.length}`);
    console.log(`   - Categorías a actualizar: ${categoryUpdates.length}`);
    console.log(`   - Tipos de regalo a actualizar: ${giftTypeUpdates.length}`);
    console.log(`   - Precios >= 1000 (no actualizados): ${skippedHighPrice.length}`);
    console.log(`   - Regalos sin coincidencia en CSV: ${notFoundGifts.length}`);
    
    if (notFoundGifts.length > 0) {
      console.log(`\n⚠️  Regalos del CSV que no encontraron coincidencia en BD:`);
      notFoundGifts.slice(0, 10).forEach(item => {
        console.log(`   - "${item.titulo}" (Número: ${item.numero}, Categoría: ${item.categoria || 'N/A'})`);
      });
      if (notFoundGifts.length > 10) {
        console.log(`   ... y ${notFoundGifts.length - 10} más`);
      }
      console.log('');
    }

    // 9. Mostrar resumen antes de actualizar
    if (priceUpdates.length > 0) {
      console.log('📝 Precios que se actualizarán (< 1000):\n');
      priceUpdates.slice(0, 10).forEach(update => {
        console.log(`   • ${update.giftName}`);
        console.log(`     S/ ${update.oldPrice.toFixed(2)} → S/ ${update.newPrice.toFixed(2)}\n`);
      });
      if (priceUpdates.length > 10) {
        console.log(`   ... y ${priceUpdates.length - 10} más\n`);
      }
    }

    if (skippedHighPrice.length > 0) {
      console.log('⚠️  Precios >= 1000 que NO se actualizarán:\n');
      skippedHighPrice.slice(0, 5).forEach(item => {
        console.log(`   • ${item.giftName}`);
        console.log(`     BD: S/ ${item.oldPrice.toFixed(2)} → CSV: S/ ${item.newPrice.toFixed(2)} (diferencia: S/ ${item.difference.toFixed(2)})\n`);
      });
      if (skippedHighPrice.length > 5) {
        console.log(`   ... y ${skippedHighPrice.length - 5} más\n`);
      }
    }

    console.log('⚠️  ¿Deseas continuar con la actualización? (Ctrl+C para cancelar)');
    console.log('   Continuando en 2 segundos...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 10. Actualizar precios (< 1000) en lotes
    console.log('💰 Actualizando precios (< 1000)...');
    let updatedPrices = 0;
    const batchSize = 10;
    for (let i = 0; i < priceUpdates.length; i += batchSize) {
      const batch = priceUpdates.slice(i, i + batchSize);
      for (const update of batch) {
        try {
          await Gift.findByIdAndUpdate(update.giftId, { price: update.newPrice });
          updatedPrices++;
          if (updatedPrices % 10 === 0) {
            console.log(`   Progreso: ${updatedPrices}/${priceUpdates.length}...`);
          }
        } catch (error) {
          console.error(`   ❌ Error actualizando ${update.giftName}:`, error.message);
        }
      }
      // Pequeña pausa entre lotes para evitar sobrecargar la conexión
      if (i + batchSize < priceUpdates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log(`✅ Se actualizaron ${updatedPrices} precios\n`);

    // 11. Actualizar categorías en lotes
    console.log('🏷️  Actualizando categorías...');
    let updatedCategories = 0;
    const categoryBatchSize = 10;
    for (let i = 0; i < categoryUpdates.length; i += categoryBatchSize) {
      const batch = categoryUpdates.slice(i, i + categoryBatchSize);
      for (const update of batch) {
        try {
          await Gift.findByIdAndUpdate(update.giftId, { 
            category: update.categoryName,
            categoryId: update.categoryId
          });
          updatedCategories++;
          if (updatedCategories % 10 === 0) {
            console.log(`   Progreso: ${updatedCategories}/${categoryUpdates.length}...`);
          }
        } catch (error) {
          console.error(`   ❌ Error actualizando categoría de ${update.giftName}:`, error.message);
        }
      }
      // Pequeña pausa entre lotes
      if (i + categoryBatchSize < categoryUpdates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log(`✅ Se actualizaron ${updatedCategories} categorías\n`);

    // 11.5. Actualizar tipos de regalo y tickets disponibles
    if (giftTypeUpdates.length > 0) {
      console.log('🎫 Actualizando tipos de regalo y tickets disponibles...');
      let updatedGiftTypes = 0;
      const giftTypeBatchSize = 10;
      for (let i = 0; i < giftTypeUpdates.length; i += giftTypeBatchSize) {
        const batch = giftTypeUpdates.slice(i, i + giftTypeBatchSize);
        for (const update of batch) {
          try {
            await Gift.findByIdAndUpdate(update.giftId, {
              giftType: update.newGiftType,
              available: update.newAvailable,
              total: update.newTotal
            });
            updatedGiftTypes++;
            if (updatedGiftTypes % 10 === 0) {
              console.log(`   Progreso: ${updatedGiftTypes}/${giftTypeUpdates.length}...`);
            }
          } catch (error) {
            console.error(`   ❌ Error actualizando tipo de ${update.giftName}:`, error.message);
          }
        }
        // Pequeña pausa entre lotes
        if (i + giftTypeBatchSize < giftTypeUpdates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      console.log(`✅ Se actualizaron ${updatedGiftTypes} tipos de regalo\n`);
    }

    // 11.6. Verificar que todos los regalos tengan categoría actualizada
    console.log('🔍 Verificando que todos los regalos tengan categoría...');
    const allGiftsAfterUpdate = await query('SELECT id, name, category, category_id FROM gifts WHERE is_active = true');
    const giftsWithoutCategory = [];
    const validCategoryIds = Array.from(categoryMap.values());
    const validCategoryNames = Array.from(categoryMap.keys());
    
    for (const gift of allGiftsAfterUpdate.rows) {
      // Verificar si la categoría actual existe en las nuevas categorías
      const hasValidCategory = gift.category && validCategoryNames.includes(gift.category);
      // Verificar si el category_id existe en las nuevas categorías
      const hasValidCategoryId = gift.category_id && validCategoryIds.includes(gift.category_id);
      
      // Si no tiene categoría válida o el category_id no coincide con una categoría válida
      if (!hasValidCategory || !hasValidCategoryId || !gift.category_id) {
        giftsWithoutCategory.push({
          id: gift.id,
          name: gift.name,
          currentCategory: gift.category || 'Sin categoría',
          currentCategoryId: gift.category_id || null
        });
      }
    }
    
    if (giftsWithoutCategory.length > 0) {
      console.log(`   ⚠️  Se encontraron ${giftsWithoutCategory.length} regalos sin categoría válida:`);
      // Asignar categoría por defecto (primera categoría disponible o "Otro")
      const defaultCategory = categoryMap.has('Otro') ? 'Otro' : categoriesArray[0];
      const defaultCategoryId = categoryMap.get(defaultCategory);
      
      console.log(`   📝 Asignando categoría por defecto "${defaultCategory}" a estos regalos...`);
      let fixedCount = 0;
      for (const gift of giftsWithoutCategory) {
        try {
          await Gift.findByIdAndUpdate(gift.id, {
            category: defaultCategory,
            categoryId: defaultCategoryId
          });
          fixedCount++;
          if (fixedCount % 10 === 0) {
            console.log(`      Progreso: ${fixedCount}/${giftsWithoutCategory.length}...`);
          }
        } catch (error) {
          console.error(`      ❌ Error actualizando ${gift.name}:`, error.message);
        }
      }
      console.log(`   ✅ Se asignó categoría por defecto a ${fixedCount} regalos\n`);
    } else {
      console.log('   ✅ Todos los regalos tienen categoría válida\n');
    }

    // 12. Generar archivo MD con diferencias
    console.log('📄 Generando reporte de diferencias de precios...');
    const reportDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const reportPath = path.join(reportDir, `price-differences-${timestamp}.md`);

    let mdContent = `# Reporte de Diferencias de Precios\n\n`;
    mdContent += `**Fecha:** ${new Date().toLocaleString('es-ES')}\n\n`;
    mdContent += `**Total de regalos procesados:** ${csvGifts.length}\n\n`;

    // Precios actualizados (< 1000)
    if (priceDifferences.length > 0) {
      mdContent += `## Precios Actualizados (< 1000)\n\n`;
      mdContent += `**Total:** ${priceDifferences.length}\n\n`;
      mdContent += `| ID | Regalo | Precio Anterior | Precio Nuevo | Diferencia |\n`;
      mdContent += `|----|--------|-----------------|--------------|------------|\n`;
      
      priceDifferences.forEach(item => {
        const diffSign = item.difference >= 0 ? '+' : '';
        mdContent += `| ${item.giftId} | ${item.giftName} | S/ ${item.oldPrice.toFixed(2)} | S/ ${item.newPrice.toFixed(2)} | ${diffSign}S/ ${item.difference.toFixed(2)} |\n`;
      });
      mdContent += `\n`;
    }

    // Precios NO actualizados (>= 1000)
    if (skippedHighPrice.length > 0) {
      mdContent += `## Precios NO Actualizados (>= 1000)\n\n`;
      mdContent += `**Total:** ${skippedHighPrice.length}\n\n`;
      mdContent += `*Estos precios no se actualizaron porque son >= 1000*\n\n`;
      mdContent += `| ID | Regalo | Precio en BD | Precio en CSV | Diferencia |\n`;
      mdContent += `|----|--------|--------------|---------------|------------|\n`;
      
      skippedHighPrice.forEach(item => {
        const diffSign = item.difference >= 0 ? '+' : '';
        mdContent += `| ${item.giftId} | ${item.giftName} | S/ ${item.oldPrice.toFixed(2)} | S/ ${item.newPrice.toFixed(2)} | ${diffSign}S/ ${item.difference.toFixed(2)} |\n`;
      });
      mdContent += `\n`;
    }

    // Regalos sin coincidencia
    if (notFoundGifts.length > 0) {
      mdContent += `## Regalos Sin Coincidencia en Base de Datos\n\n`;
      mdContent += `**Total:** ${notFoundGifts.length}\n\n`;
      mdContent += `*Estos regalos del CSV no encontraron coincidencia en la base de datos usando LIKE flexible*\n\n`;
      mdContent += `| Número | Título | Categoría | Precio CSV |\n`;
      mdContent += `|--------|--------|-----------|------------|\n`;
      
      notFoundGifts.forEach(item => {
        const precio = item.precio !== null ? `S/ ${item.precio.toFixed(2)}` : 'Aporte libre';
        mdContent += `| ${item.numero} | ${item.titulo} | ${item.categoria || 'N/A'} | ${precio} |\n`;
      });
      mdContent += `\n`;
    }

    // Tipos de regalo actualizados
    if (giftTypeUpdates.length > 0) {
      mdContent += `## Tipos de Regalo Actualizados\n\n`;
      mdContent += `**Total:** ${giftTypeUpdates.length}\n\n`;
      mdContent += `| ID | Regalo | Tipo Anterior | Tipo Nuevo | Tickets Disponibles |\n`;
      mdContent += `|----|--------|---------------|------------|---------------------|\n`;
      
      giftTypeUpdates.forEach(item => {
        const ticketsInfo = item.newGiftType === 'Ticket' 
          ? `${item.newAvailable} disponible(s)` 
          : '-';
        mdContent += `| ${item.giftId} | ${item.giftName} | ${item.oldGiftType} | ${item.newGiftType} | ${ticketsInfo} |\n`;
      });
      mdContent += `\n`;
    }

    // Resumen de categorías
    mdContent += `## Categorías Creadas\n\n`;
    categoriesArray.forEach(catName => {
      mdContent += `- **${catName}** (ID: ${categoryMap.get(catName)})\n`;
    });
    mdContent += `\n`;

    // Resumen final
    mdContent += `## Resumen\n\n`;
    mdContent += `- ✅ Precios actualizados (< 1000): ${updatedPrices}\n`;
    mdContent += `- ⚠️  Precios NO actualizados (>= 1000): ${skippedHighPrice.length}\n`;
    mdContent += `- 🏷️  Categorías actualizadas: ${updatedCategories}\n`;
    mdContent += `- 🎫 Tipos de regalo actualizados: ${giftTypeUpdates.length}\n`;
    mdContent += `- 📦 Categorías creadas: ${categoriesArray.length}\n`;
    mdContent += `- ❌ Regalos sin coincidencia: ${notFoundGifts.length}\n`;

    fs.writeFileSync(reportPath, mdContent, 'utf8');
    console.log(`✅ Reporte guardado en: ${reportPath}\n`);

    console.log('📊 Resumen final:');
    console.log(`   - Precios actualizados (< 1000): ${updatedPrices}`);
    console.log(`   - Precios NO actualizados (>= 1000): ${skippedHighPrice.length}`);
    console.log(`   - Categorías actualizadas: ${updatedCategories}`);
    console.log(`   - Tipos de regalo actualizados: ${giftTypeUpdates.length}`);
    console.log(`   - Categorías creadas: ${categoriesArray.length}`);
    console.log(`   - Regalos sin coincidencia: ${notFoundGifts.length}\n`);

    console.log('✅ Actualización completada.\n');

  } catch (error) {
    console.error('\n❌ Error en la actualización:', error.message);
    if (error.message.includes('timeout') || error.message.includes('Connection terminated')) {
      console.error('\n💡 Posibles soluciones:');
      console.error('   1. Verifica que la base de datos esté disponible y accesible');
      console.error('   2. Verifica que DATABASE_URL esté correctamente configurada en el archivo .env');
      console.error('   3. Si usas Neon o una base de datos en la nube, verifica que la conexión esté activa');
      console.error('   4. Intenta ejecutar el script nuevamente');
    }
    console.error('\nDetalles del error:', error);
    process.exit(1);
  } finally {
    // Cerrar la conexión a la base de datos
    try {
      const { pool } = require('./db');
      await pool.end();
    } catch (error) {
      // Ignorar errores al cerrar la conexión
    }
  }
}

// Ejecutar el script
if (require.main === module) {
  updateCategoriesAndPrices()
    .then(() => {
      console.log('✨ Script finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { updateCategoriesAndPrices };
