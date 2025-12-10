require('dotenv').config();
const Event = require('./models/Event');

(async () => {
  try {
    const event = await Event.findOne();
    if (event) {
      const updated = await Event.findByIdAndUpdate(event.id, {
        weddingDate: '2026-03-28'
      });
      console.log('✅ Fecha actualizada a 28 de marzo de 2026');
      console.log('   Fecha anterior:', event.wedding_date);
      console.log('   Fecha nueva:', updated.wedding_date);
    } else {
      console.log('No hay evento para actualizar');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
