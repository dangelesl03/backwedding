// Configuración de Gift Cards
// Puedes modificar las URLs de imágenes aquí para usar tus propias imágenes profesionales

module.exports = {
  amounts: [200, 400, 600],
  quantities: {
    200: 15,
    400: 10,
    600: 5
  },
  themes: [
    { 
      name: 'Fútbol', 
      emoji: '⚽', 
      // Alianza Lima - Equipo de fútbol peruano
      // URL de Unsplash con imagen de fútbol profesional
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
      // Para usar logo oficial de Alianza Lima, reemplaza con:
      // 'https://commons.wikimedia.org/wiki/File:Alianza.jpg'
      // O sube tu propia imagen a Imgur/Cloudinary
    },
    { 
      name: 'Hello Kitty', 
      emoji: '🎀', 
      // Hello Kitty - Gatito blanco animado de Sanrio
      // URL de Pixabay con gato blanco (puedes buscar Hello Kitty específico)
      imageUrl: 'https://cdn.pixabay.com/photo/2016/03/28/12/35/cat-1285341_1280.jpg'
      // Para Hello Kitty específico, busca en: https://pixabay.com/images/search/hello%20kitty/
      // O sube tu propia imagen a Imgur/Cloudinary
    },
    { 
      name: 'Avengers', 
      emoji: '🦸', 
      // Iron Man - Superhéroe de Marvel Avengers
      // URL de PxHere (gratuita, CC0)
      imageUrl: 'https://images.unsplash.com/photo-1618945372299-c952c377ed44?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
      // Alternativa gratuita: https://pxhere.com/en/photo/674695
      // O busca en: https://images.unsplash.com/s/photos/iron-man
    },
    { 
      name: 'Star Wars', 
      emoji: '⭐', 
      // Chewbacca - Personaje de Star Wars
      // URL de Unsplash con tema Star Wars
      imageUrl: 'https://images.unsplash.com/photo-1472457847783-3d10540b03d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
      // Para Chewbacca específico, busca PNGs en: https://www.pngarts.com/explore/161894
      // O sube tu propia imagen a Imgur/Cloudinary
    },
    { 
      name: 'Derecho', 
      emoji: '⚖️', 
      // Balanza de la justicia - Símbolo legal profesional
      // URL de Pexels (gratuita, profesional)
      imageUrl: 'https://images.pexels.com/photos/5669619/pexels-photo-5669619.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
      // Alternativa: https://images.unsplash.com/photos/a-wooden-balance-scale-with-a-black-background-diZeo4uzp0o
      // Más opciones en: https://www.pexels.com/search/law/
    }
  ]
};

// INSTRUCCIONES PARA USAR TUS PROPIAS IMÁGENES:
// 1. Sube tus imágenes de gift cards a un servicio de hosting (ej: Cloudinary, Imgur, o tu propio servidor)
// 2. Reemplaza las URLs en el objeto 'themes' arriba con las URLs de tus imágenes
// 3. Ejecuta: node create-gift-cards.js
//
// Ejemplo de URLs personalizadas:
// imageUrl: 'https://tudominio.com/images/gift-cards/futbol-card.jpg'
// imageUrl: 'https://tudominio.com/images/gift-cards/hello-kitty-card.jpg'
// etc.
