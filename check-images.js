require('dotenv').config();
const Gift = require('./models/Gift');

(async () => {
  try {
    const gifts = await Gift.find();
    console.log('\n🖼️  Verificando imágenes de regalos:\n');
    
    gifts.forEach((gift, index) => {
      console.log(`${index + 1}. ${gift.name}`);
      console.log(`   ID: ${gift.id}`);
      console.log(`   image_url: ${gift.image_url || '❌ NO TIENE'}`);
      console.log('');
    });
    
    const withImages = gifts.filter(g => g.image_url).length;
    const withoutImages = gifts.filter(g => !g.image_url).length;
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Con imágenes: ${withImages}`);
    console.log(`   ❌ Sin imágenes: ${withoutImages}`);
    console.log(`   📦 Total: ${gifts.length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
