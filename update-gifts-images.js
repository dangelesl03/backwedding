require('dotenv').config();
const Gift = require('./models/Gift');
const { query } = require('./db');

// Imágenes para cada regalo basadas en su nombre
const giftImages = {
  'Pasajes aéreos para luna de miel': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop',
  'Noche de hospedaje en hotel 5 estrellas': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
  'Tour por Machu Picchu': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&h=600&fit=crop',
  'Equipo de sonido Bluetooth': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=600&fit=crop',
  'Set de vajilla para 12 personas': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
  'Decoración para el hogar': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
  'Cena romántica en restaurante': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
  'Spa y masajes para dos': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop',
  'Lámpara de diseño moderno': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=600&fit=crop',
  'Juego de sábanas de algodón egipcio': 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=600&fit=crop'
};

(async () => {
  try {
    console.log('🖼️  Actualizando imágenes de regalos...\n');
    
    const gifts = await Gift.find();
    let updated = 0;
    let skipped = 0;
    
    for (const gift of gifts) {
      const imageUrl = giftImages[gift.name];
      
      if (imageUrl && !gift.image_url) {
        await query(
          'UPDATE gifts SET image_url = $1 WHERE id = $2',
          [imageUrl, gift.id]
        );
        console.log(`✅ Actualizado: ${gift.name}`);
        updated++;
      } else if (gift.image_url) {
        console.log(`⏭️  Ya tiene imagen: ${gift.name}`);
        skipped++;
      } else {
        console.log(`⚠️  Sin imagen disponible: ${gift.name}`);
        skipped++;
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏭️  Omitidos: ${skipped}`);
    console.log(`   📦 Total: ${gifts.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando imágenes:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();
