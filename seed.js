const User = require('./models/User');
const Event = require('./models/Event');
const Gift = require('./models/Gift');
const { initDatabase } = require('./db/init');

const seedData = async () => {
  try {
    // Inicializar esquema de base de datos
    await initDatabase();
    console.log('Esquema de base de datos inicializado');

    // Crear usuario administrador
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        username: 'natalia_daniel',
        password: 'boda2026',
        role: 'admin'
      });
      console.log('Usuario administrador creado: natalia_daniel / boda2026');
    } else {
      console.log('Usuario administrador ya existe');
    }

    // Crear evento
    const eventExists = await Event.findOne();
    if (!eventExists) {
      await Event.create({
        title: '¡Acompañanos a celebrar!',
        coupleNames: 'Natalia & Daniel',
        weddingDate: '2026-11-28',
        location: 'Lima, Perú',
        address: 'Por definir - Próximamente',
        dressCode: 'Elegante',
        dressCodeDescription: 'Te invitamos a vestir en armonía con nuestros colores para que juntos pintemos un recuerdo para siempre. Los colores principales son rosa y morado.',
        additionalInfo: 'Será una celebración llena de amor, alegría y momentos inolvidables. ¡No podemos esperar a compartir este día tan especial con ustedes!'
      });
      console.log('Evento creado');
    } else {
      console.log('Evento ya existe');
    }

    // Crear regalos de ejemplo
    const giftsExist = await Gift.findById(1);
    if (!giftsExist) {
      const gifts = [
        {
          name: 'Pasajes aéreos',
          description: 'Contribución para nuestros pasajes de luna de miel',
          price: 2000,
          currency: 'PEN',
          category: 'Luna de Miel',
          available: 1,
          total: 1
        },
        {
          name: 'Noche de hospedaje en hotel 5 estrellas',
          description: 'Una noche especial en un hotel de lujo',
          price: 800,
          currency: 'PEN',
          category: 'Luna de Miel',
          available: 2,
          total: 2
        },
        {
          name: 'Tour por Machu Picchu',
          description: 'Excursión guiada por la maravilla del mundo',
          price: 400,
          currency: 'PEN',
          category: 'Luna de Miel',
          available: 4,
          total: 4
        },
        {
          name: 'Equipo de sonido Bluetooth',
          description: 'Para nuestras fiestas y celebraciones',
          price: 350,
          currency: 'PEN',
          category: 'Arte y Deco',
          available: 1,
          total: 1
        },
        {
          name: 'Set de vajilla para 12 personas',
          description: 'Para nuestros almuerzos familiares',
          price: 600,
          currency: 'PEN',
          category: 'Arte y Deco',
          available: 1,
          total: 1
        },
        {
          name: 'Decoración para el hogar',
          description: 'Elementos decorativos para nuestro nuevo hogar',
          price: 250,
          currency: 'PEN',
          category: 'Arte y Deco',
          available: 3,
          total: 3
        }
      ];

      for (const gift of gifts) {
        await Gift.create(gift);
      }
      console.log('Regalos de ejemplo creados');
    } else {
      console.log('Regalos ya existen');
    }

    console.log('Datos de ejemplo insertados correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error insertando datos:', error);
    process.exit(1);
  }
};

seedData();