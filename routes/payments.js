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

    // Registrar las contribuciones pagadas (pueden ser parciales)
    const updatedGifts = [];
    const { amounts } = req.body; // Montos pagados por cada regalo (opcional)
    
    for (let i = 0; i < giftIds.length; i++) {
      try {
        // Convertir giftId a número si es string
        const id = typeof giftIds[i] === 'string' ? parseInt(giftIds[i]) : giftIds[i];
        
        const gift = await Gift.findById(id);
        if (!gift) {
          console.warn(`Regalo con ID ${id} no encontrado`);
          continue;
        }

        // Si se proporciona un monto específico para este regalo, usarlo
        // De lo contrario, calcular el monto restante (comportamiento anterior para compatibilidad)
        let amountToContribute;
        if (amounts && amounts[i] !== undefined) {
          // Usar el monto específico proporcionado
          amountToContribute = parseFloat(amounts[i]);
        } else {
          // Comportamiento anterior: completar el regalo
          const totalContributed = parseFloat(gift.total_contributed || 0);
          const price = parseFloat(gift.price);
          amountToContribute = Math.max(0, price - totalContributed);
        }
        
        // Validaciones
        const totalContributed = parseFloat(gift.total_contributed || 0);
        const price = parseFloat(gift.price);
        
        // Validar que el monto no exceda el precio del producto
        if (amountToContribute > price) {
          console.warn(`Monto ${amountToContribute} excede el precio ${price} del regalo ${id}`);
          amountToContribute = price; // Limitar al precio máximo
        }
        
        // Validar que el monto no exceda el disponible
        const availableAmount = price - totalContributed;
        if (amountToContribute > availableAmount) {
          console.warn(`Monto ${amountToContribute} excede el disponible ${availableAmount} del regalo ${id}`);
          amountToContribute = Math.max(0, availableAmount); // Limitar al disponible, mínimo 0
        }
        
        // Validar que el monto sea positivo y válido antes de procesar
        if (amountToContribute > 0 && amountToContribute <= availableAmount && amountToContribute <= price) {
          try {
            // Agregar contribución usando el método del modelo (que maneja correctamente el estado)
            await Gift.addContribution(id, userId, amountToContribute);
            updatedGifts.push(id);
          } catch (contributionError) {
            console.error(`Error agregando contribución al regalo ${id}:`, contributionError);
            console.error('Error details:', contributionError.message, contributionError.stack);
            // Continuar con el siguiente regalo en lugar de fallar todo
          }
        } else {
          const reason = amountToContribute <= 0 ? 'monto inválido (0 o negativo)' 
            : amountToContribute > availableAmount ? 'excede el disponible' 
            : amountToContribute > price ? 'excede el precio' 
            : 'desconocido';
          console.warn(`No se puede procesar regalo ${id}: ${reason}. Monto: ${amountToContribute}, Disponible: ${availableAmount}, Precio: ${price}`);
          // No agregar a updatedGifts si el monto es 0 o inválido
        }
      } catch (giftError) {
        console.error(`Error procesando regalo ${giftIds[i]}:`, giftError);
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
