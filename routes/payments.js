const express = require('express');
const Gift = require('../models/Gift');
const { auth } = require('../middleware/auth');
const { query } = require('../db');

const router = express.Router();

// Marcar regalos como vendidos después del pago
router.post('/confirm', auth, async (req, res) => {
  try {
    const { giftIds, paymentMethod, paymentReference } = req.body;

    console.log('Confirmando pago:', { giftIds, userId: req.user?.id, user: req.user });

    if (!giftIds || !Array.isArray(giftIds) || giftIds.length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un regalo para confirmar.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado.' });
    }
    
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      console.error('Usuario sin ID:', req.user);
      return res.status(401).json({ message: 'Usuario no válido.' });
    }

    // Marcar cada regalo como vendido/contribuido completamente
    const updatedGifts = [];
    for (const giftId of giftIds) {
      try {
        // Convertir giftId a número si es string
        const id = typeof giftId === 'string' ? parseInt(giftId) : giftId;
        
        const gift = await Gift.findById(id);
        if (!gift) {
          console.warn(`Regalo con ID ${id} no encontrado`);
          continue;
        }

        // Registrar el pago completo
        const totalContributed = parseFloat(gift.total_contributed || 0);
        const price = parseFloat(gift.price);
        const remaining = Math.max(0, price - totalContributed);
        
        if (remaining > 0) {
          // Agregar contribución restante
          await query(
            'INSERT INTO gift_contributions (gift_id, user_id, amount) VALUES ($1, $2, $3)',
            [id, userId, remaining]
          );
        }
        
        // Marcar como completamente contribuido
        await query(
          'UPDATE gifts SET is_contributed = true WHERE id = $1',
          [id]
        );
        
        updatedGifts.push(id);
      } catch (giftError) {
        console.error(`Error procesando regalo ${giftId}:`, giftError);
        // Continuar con los demás regalos
      }
    }

    if (updatedGifts.length === 0) {
      return res.status(400).json({ message: 'No se pudo procesar ningún regalo.' });
    }

    res.json({
      message: 'Pago confirmado exitosamente',
      updatedGifts,
      paymentMethod,
      paymentReference
    });
  } catch (error) {
    console.error('Error confirmando pago:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Error en el servidor.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
