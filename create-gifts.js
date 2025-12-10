require('dotenv').config();
const Gift = require('./models/Gift');

const dummyGifts = [
  {
    name: 'Pasajes aéreos para luna de miel',
    description: 'Contribución para nuestros pasajes de luna de miel a un destino romántico',
    price: 2000,
    currency: 'PEN',
    category: 'Luna de Miel',
    available: 1,
    total: 1,
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400'
  },
  {
    name: 'Noche de hospedaje en hotel 5 estrellas',
    description: 'Una noche especial en un hotel de lujo para nuestra luna de miel',
    price: 800,
    currency: 'PEN',
    category: 'Luna de Miel',
    available: 2,
    total: 2,
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
  },
  {
    name: 'Tour por Machu Picchu',
    description: 'Excursión guiada por la maravilla del mundo para nuestra luna de miel',
    price: 400,
    currency: 'PEN',
    category: 'Luna de Miel',
    available: 4,
    total: 4,
    imageUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=400'
  },
  {
    name: 'Equipo de sonido Bluetooth',
    description: 'Sistema de sonido inalámbrico para nuestras fiestas y celebraciones',
    price: 350,
    currency: 'PEN',
    category: 'Arte y Deco',
    available: 1,
    total: 1,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'
  },
  {
    name: 'Set de vajilla para 12 personas',
    description: 'Hermosa vajilla completa para nuestros almuerzos familiares',
    price: 600,
    currency: 'PEN',
    category: 'Arte y Deco',
    available: 1,
    total: 1,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400'
  },
  {
    name: 'Decoración para el hogar',
    description: 'Elementos decorativos elegantes para nuestro nuevo hogar',
    price: 250,
    currency: 'PEN',
    category: 'Arte y Deco',
    available: 3,
    total: 3,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'
  },
  {
    name: 'Cena romántica en restaurante',
    description: 'Una cena especial en un restaurante de alta cocina',
    price: 300,
    currency: 'PEN',
    category: 'Luna de Miel',
    available: 2,
    total: 2,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'
  },
  {
    name: 'Spa y masajes para dos',
    description: 'Un día de relajación y cuidado personal para ambos',
    price: 450,
    currency: 'PEN',
    category: 'Luna de Miel',
    available: 1,
    total: 1,
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400'
  },
  {
    name: 'Lámpara de diseño moderno',
    description: 'Lámpara elegante para iluminar nuestro hogar',
    price: 180,
    currency: 'PEN',
    category: 'Arte y Deco',
    available: 2,
    total: 2,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400'
  },
  {
    name: 'Juego de sábanas de algodón egipcio',
    description: 'Sábanas de alta calidad para nuestro dormitorio',
    price: 320,
    currency: 'PEN',
    category: 'Arte y Deco',
    available: 1,
    total: 1,
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400'
  }
];

(async () => {
  try {
    console.log('🎁 Creando regalos dummy...\n');
    
    let created = 0;
    let skipped = 0;
    
    for (const giftData of dummyGifts) {
      // Verificar si el regalo ya existe
      const existing = await Gift.find({ category: giftData.category });
      const exists = existing.some(g => g.name === giftData.name);
      
      if (!exists) {
        await Gift.create(giftData);
        console.log(`✅ Creado: ${giftData.name}`);
        created++;
      } else {
        console.log(`⏭️  Ya existe: ${giftData.name}`);
        skipped++;
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   ⏭️  Omitidos: ${skipped}`);
    console.log(`   📦 Total: ${dummyGifts.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando regalos:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();
