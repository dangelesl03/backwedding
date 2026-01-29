/**
 * Script para crear categorías iniciales
 * Ejecutar con: node db/seed-categories.js
 */

require('dotenv').config();
const Category = require('../models/Category');

async function seedCategories() {
  try {
    console.log('🌱 Creando categorías iniciales...\n');

    const defaultCategories = [
      { name: 'Luna de Miel', description: 'Regalos para la luna de miel' },
      { name: 'Arte y Deco', description: 'Arte y decoración para el hogar' },
      { name: 'Otro', description: 'Otras categorías' }
    ];

    const created = [];
    const skipped = [];

    for (const catData of defaultCategories) {
      try {
        // Verificar si ya existe
        const existing = await Category.findByName(catData.name);
        if (existing) {
          skipped.push(catData.name);
          console.log(`⏭️  Categoría "${catData.name}" ya existe, omitiendo...`);
        } else {
          const category = await Category.create(catData);
          created.push(category.name);
          console.log(`✅ Categoría creada: ${category.name}`);
        }
      } catch (error) {
        console.error(`❌ Error creando categoría "${catData.name}":`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Creadas: ${created.length}`);
    console.log(`   ⏭️  Omitidas: ${skipped.length}`);

    if (created.length > 0) {
      console.log(`\n✅ Categorías creadas exitosamente: ${created.join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la creación de categorías:', error);
    process.exit(1);
  }
}

seedCategories();
