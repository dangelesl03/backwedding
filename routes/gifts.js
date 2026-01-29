const express = require('express');
const Gift = require('../models/Gift');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Obtener todos los regalos (público)
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, sortBy = 'name' } = req.query;

    const queryConditions = {};

    if (category && category !== 'Todas las categorías') {
      queryConditions.category = category;
    }

    if (minPrice || maxPrice) {
      queryConditions.price = {};
      if (minPrice) queryConditions.price.$gte = parseFloat(minPrice);
      if (maxPrice) queryConditions.price.$lte = parseFloat(maxPrice);
    }

    const sortOptions = {};
    if (sortBy === 'price_asc') {
      sortOptions.price = 1;
    } else if (sortBy === 'price_desc') {
      sortOptions.price = -1;
    } else {
      sortOptions.name = 1;
    }

    queryConditions.sort = sortOptions;
    const gifts = await Gift.find(queryConditions);
    
    // Formatear respuesta para incluir contributors
    const formattedGifts = gifts.map(gift => {
      const { image_url, price, is_contributed, total_contributed, ...rest } = gift;
      const giftPrice = parseFloat(price);
      const totalContributed = parseFloat(total_contributed || 0);
      const isFullyContributed = totalContributed >= giftPrice;
      
      return {
        ...rest,
        _id: gift.id,
        price: giftPrice, // Asegurar que price sea número
        imageUrl: image_url || null, // Mapear image_url a imageUrl para el frontend
        total_contributed: totalContributed, // Incluir total contribuido para el frontend
        contributors: [], // Se puede expandir si es necesario
        isContributed: is_contributed || false, // Usar el campo de la BD
        isFullyContributed: isFullyContributed // Calcular basado en total contribuido vs precio
      };
    });
    
    res.json(formattedGifts);
  } catch (error) {
    console.error('Error obteniendo regalos:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

  // Obtener un regalo específico
  router.get('/:id', async (req, res) => {
    try {
      const gift = await Gift.findById(req.params.id);
      if (!gift) {
        return res.status(404).json({ message: 'Regalo no encontrado.' });
      }
      const totalContributed = parseFloat(gift.total_contributed || 0);
      const giftPrice = parseFloat(gift.price);
      const isFullyContributed = totalContributed >= giftPrice;
      
      res.json({
        ...gift,
        _id: gift.id,
        price: giftPrice,
        imageUrl: gift.image_url,
        isContributed: gift.is_contributed || false,
        isFullyContributed: isFullyContributed,
        contributors: await Gift.getContributions(req.params.id)
      });
    } catch (error) {
      console.error('Error obteniendo regalo:', error);
      res.status(500).json({ message: 'Error en el servidor.' });
    }
  });

// Contribuir a un regalo
router.post('/:id/contribute', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Monto de contribución inválido.' });
    }

    const gift = await Gift.findById(req.params.id);
    if (!gift) {
      return res.status(404).json({ message: 'Regalo no encontrado.' });
    }

    const currentTotalContributed = parseFloat(gift.total_contributed || 0);
    const giftPrice = parseFloat(gift.price);
    
    if (currentTotalContributed >= giftPrice) {
      return res.status(400).json({ message: 'Este regalo ya está completamente contribuido.' });
    }

    // Validar que el monto no exceda el precio del producto
    if (amount > giftPrice) {
      return res.status(400).json({ message: `El monto no puede exceder el precio del producto (S/ ${giftPrice.toFixed(2)}).` });
    }

    // Validar que el monto no exceda el disponible
    const availableAmount = giftPrice - currentTotalContributed;
    if (amount > availableAmount) {
      return res.status(400).json({ message: `El monto máximo disponible es S/ ${availableAmount.toFixed(2)}.` });
    }

    // Agregar contribución usando el método del modelo
    await Gift.addContribution(req.params.id, req.user.id, amount);
    
    // Obtener el regalo actualizado con el total contribuido correcto
    const finalGift = await Gift.findById(req.params.id);
    const newTotalContributed = parseFloat(finalGift.total_contributed || 0);
    // Reutilizar giftPrice ya que el precio no cambia
    const isFullyContributed = newTotalContributed >= giftPrice;
    
    res.json({
      ...finalGift,
      _id: finalGift.id,
      price: parseFloat(finalGift.price),
      imageUrl: finalGift.image_url,
      contributors: await Gift.getContributions(req.params.id),
      isContributed: finalGift.is_contributed || false,
      isFullyContributed: isFullyContributed
    });
  } catch (error) {
    console.error('Error contribuyendo al regalo:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear regalo (solo admin)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const gift = await Gift.create(req.body);
    res.status(201).json({
      ...gift,
      _id: gift.id,
      imageUrl: gift.image_url
    });
  } catch (error) {
    console.error('Error creando regalo:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear gift cards dinámicamente (solo admin)
router.post('/gift-cards', auth, adminAuth, async (req, res) => {
  try {
    const { amounts, quantities, themes } = req.body;
    
    // Validar datos
    if (!amounts || !Array.isArray(amounts) || amounts.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar un array de montos.' });
    }
    
    if (!quantities || typeof quantities !== 'object') {
      return res.status(400).json({ message: 'Debe proporcionar las cantidades por monto.' });
    }
    
    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar un array de temas.' });
    }
    
    const createdGiftCards = [];
    const errors = [];
    
    // Generar gift cards dinámicamente
    amounts.forEach(amount => {
      const totalQuantity = quantities[amount] || 0;
      if (totalQuantity <= 0) return;
      
      const cardsPerTheme = Math.floor(totalQuantity / themes.length);
      const remainder = totalQuantity % themes.length;
      
      themes.forEach((theme, index) => {
        const quantity = cardsPerTheme + (index < remainder ? 1 : 0);
        
        if (quantity > 0) {
          const giftCardData = {
            name: `Gift Card S/ ${amount} - ${theme.name} ${theme.emoji || ''}`,
            description: `Gift card de ${amount} soles con temática ${theme.name}`,
            price: amount,
            currency: 'PEN',
            category: 'Otro',
            available: quantity,
            total: quantity,
            imageUrl: theme.imageUrl || null
          };
          
          createdGiftCards.push(giftCardData);
        }
      });
    });
    
    // Crear las gift cards en la base de datos
    const results = [];
    for (const giftCardData of createdGiftCards) {
      try {
        // Verificar si ya existe
        const existing = await Gift.find({ category: 'Otro' });
        const exists = existing.some(g => g.name === giftCardData.name);
        
        if (!exists) {
          const gift = await Gift.create(giftCardData);
          results.push({
            ...gift,
            _id: gift.id,
            imageUrl: gift.image_url
          });
        } else {
          errors.push(`Ya existe: ${giftCardData.name}`);
        }
      } catch (error) {
        errors.push(`Error creando ${giftCardData.name}: ${error.message}`);
      }
    }
    
    res.status(201).json({
      message: `Se crearon ${results.length} gift cards exitosamente.`,
      created: results.length,
      giftCards: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error creando gift cards:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Actualizar regalo (solo admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    // Validar tamaño del cuerpo de la solicitud (máximo 4MB para Vercel)
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 4 * 1024 * 1024) {
      return res.status(413).json({ 
        message: 'La imagen es demasiado grande. Por favor, comprime la imagen o usa una URL externa.',
        maxSize: '4MB'
      });
    }
    
    // Validar tamaño de imageUrl si es Base64
    if (req.body.imageUrl && req.body.imageUrl.startsWith('data:')) {
      const base64Size = req.body.imageUrl.length;
      const maxSize = 3 * 1024 * 1024; // 3MB
      if (base64Size > maxSize) {
        return res.status(413).json({ 
          message: `La imagen Base64 es demasiado grande (${(base64Size / 1024 / 1024).toFixed(2)}MB). Por favor, comprime la imagen o usa una URL externa.`,
          maxSize: '3MB',
          currentSize: `${(base64Size / 1024 / 1024).toFixed(2)}MB`
        });
      }
    }
    
    const updatedGift = await Gift.findByIdAndUpdate(req.params.id, req.body);
    if (!updatedGift) {
      return res.status(404).json({ message: 'Regalo no encontrado.' });
    }
    
    // Obtener el regalo actualizado con total_contributed calculado
    const gift = await Gift.findById(req.params.id);
    if (!gift) {
      return res.status(404).json({ message: 'Regalo no encontrado después de actualizar.' });
    }
    
    const totalContributed = parseFloat(gift.total_contributed || 0);
    const giftPrice = parseFloat(gift.price);
    const isFullyContributed = totalContributed >= giftPrice;
    
    res.json({
      ...gift,
      _id: gift.id,
      price: parseFloat(gift.price),
      imageUrl: gift.image_url || null, // Asegurar que imageUrl refleje el cambio
      isContributed: gift.is_contributed || false,
      isFullyContributed: isFullyContributed,
      total_contributed: totalContributed
    });
  } catch (error) {
    console.error('Error actualizando regalo:', error);
    
    // Manejar errores específicos de tamaño
    if (error.message && error.message.includes('too large')) {
      return res.status(413).json({ 
        message: 'La solicitud es demasiado grande. Por favor, comprime la imagen o usa una URL externa.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      message: 'Error en el servidor.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar regalo (solo admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const gift = await Gift.findByIdAndDelete(req.params.id);
    if (!gift) {
      return res.status(404).json({ message: 'Regalo no encontrado.' });
    }
    res.json({ message: 'Regalo eliminado exitosamente.', gift: { ...gift, _id: gift.id, imageUrl: gift.image_url } });
  } catch (error) {
    console.error('Error eliminando regalo:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
