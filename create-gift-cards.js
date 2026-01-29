require('dotenv').config();
const Gift = require('./models/Gift');
const giftCardConfig = require('./gift-cards-config');

// Función para generar gift cards dinámicamente
function generateGiftCards() {
  const giftCards = [];
  
  giftCardConfig.amounts.forEach(amount => {
    const totalQuantity = giftCardConfig.quantities[amount];
    const cardsPerTheme = Math.floor(totalQuantity / giftCardConfig.themes.length);
    const remainder = totalQuantity % giftCardConfig.themes.length;
    
    giftCardConfig.themes.forEach((theme, index) => {
      // Distribuir el resto equitativamente entre los primeros temas
      const quantity = cardsPerTheme + (index < remainder ? 1 : 0);
      
      if (quantity > 0) {
        giftCards.push({
          name: `Gift Card S/ ${amount} - ${theme.name} ${theme.emoji}`,
          description: `Gift card de ${amount} soles con temática ${theme.name}`,
          price: amount,
          currency: 'PEN',
          category: 'Otro',
          available: quantity,
          total: quantity,
          imageUrl: theme.imageUrl
        });
      }
    });
  });
  
  return giftCards;
}

(async () => {
  try {
    console.log('🎁 Creando Gift Cards...\n');
    
    const giftCards = generateGiftCards();
    let created = 0;
    let skipped = 0;
    
    for (const giftData of giftCards) {
      // Verificar si el regalo ya existe
      const existing = await Gift.find({ category: giftData.category });
      const exists = existing.some(g => g.name === giftData.name);
      
      if (!exists) {
        await Gift.create(giftData);
        console.log(`✅ Creado: ${giftData.name} (${giftData.available} unidades)`);
        created++;
      } else {
        console.log(`⏭️  Ya existe: ${giftData.name}`);
        skipped++;
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   ⏭️  Omitidos: ${skipped}`);
    console.log(`   📦 Total: ${giftCards.length}`);
    
    // Mostrar distribución por monto
    console.log(`\n💰 Distribución por monto:`);
    giftCardConfig.amounts.forEach(amount => {
      const cards = giftCards.filter(gc => gc.price === amount);
      const totalQuantity = cards.reduce((sum, card) => sum + card.available, 0);
      console.log(`   S/ ${amount}: ${totalQuantity} unidades (${cards.length} tipos diferentes)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando gift cards:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();
