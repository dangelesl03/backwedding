/**
 * Migración: Agregar tabla de categorías y actualizar gifts
 * 
 * Ejecutar con: node db/migrate-add-categories.js
 */

require('dotenv').config();
const { query } = require('../db');

async function migrate() {
  try {
    console.log('🔄 Iniciando migración: Agregar tabla de categorías...\n');
    
    // 1. Crear tabla de categorías si no existe
    console.log('📝 Creando tabla de categorías...');
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla de categorías creada');

    // 2. Crear trigger para updated_at
    console.log('📝 Creando trigger para updated_at...');
    await query(`
      CREATE TRIGGER update_categories_updated_at 
      BEFORE UPDATE ON categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `).catch(() => {
      // El trigger ya existe, ignorar
    });
    console.log('✅ Trigger creado');

    // 3. Agregar columna category_id a gifts si no existe
    console.log('📝 Agregando columna category_id a gifts...');
    await query(`
      ALTER TABLE gifts 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
    `);
    console.log('✅ Columna category_id agregada');

    // 4. Crear índice si no existe
    console.log('📝 Creando índice...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_gifts_category_id ON gifts(category_id)
    `);
    console.log('✅ Índice creado');

    // 5. Crear categorías iniciales si no existen
    console.log('\n📝 Creando categorías iniciales...');
    const defaultCategories = [
      { name: 'Luna de Miel', description: 'Regalos para la luna de miel' },
      { name: 'Arte y Deco', description: 'Arte y decoración para el hogar' },
      { name: 'Otro', description: 'Otras categorías' }
    ];

    for (const catData of defaultCategories) {
      const check = await query('SELECT id FROM categories WHERE name = $1', [catData.name]);
      if (check.rows.length === 0) {
        await query(
          'INSERT INTO categories (name, description) VALUES ($1, $2)',
          [catData.name, catData.description]
        );
        console.log(`   ✅ Categoría "${catData.name}" creada`);
      } else {
        console.log(`   ⏭️  Categoría "${catData.name}" ya existe`);
      }
    }

    // 6. Migrar datos existentes: asociar regalos con categorías por nombre
    console.log('\n📝 Migrando regalos existentes a categorías...');
    const gifts = await query('SELECT id, category FROM gifts WHERE category_id IS NULL');
    let migrated = 0;

    for (const gift of gifts.rows) {
      if (gift.category) {
        const catResult = await query('SELECT id FROM categories WHERE name = $1', [gift.category]);
        if (catResult.rows.length > 0) {
          await query('UPDATE gifts SET category_id = $1 WHERE id = $2', [
            catResult.rows[0].id,
            gift.id
          ]);
          migrated++;
        }
      }
    }
    console.log(`✅ ${migrated} regalo(s) migrado(s)`);

    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migrate();
