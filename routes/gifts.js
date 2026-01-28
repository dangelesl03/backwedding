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

// Actualizar regalo (solo admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const gift = await Gift.findByIdAndUpdate(req.params.id, req.body);
    if (!gift) {
      return res.status(404).json({ message: 'Regalo no encontrado.' });
    }
    res.json({
      ...gift,
      _id: gift.id,
      imageUrl: gift.image_url
    });
  } catch (error) {
    console.error('Error actualizando regalo:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
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
