const express = require('express');
const Event = require('../models/Event');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Obtener información del evento (público)
router.get('/', async (req, res) => {
  try {
    const event = await Event.findOne();
    if (!event) {
      return res.status(404).json({ message: 'Evento no encontrado.' });
    }
    // Formatear respuesta para compatibilidad con frontend
    res.json({
      ...event,
      coupleNames: event.couple_names,
      weddingDate: event.wedding_date,
      dressCode: event.dress_code,
      dressCodeDescription: event.dress_code_description,
      bannerImageUrl: event.banner_image_url,
      additionalInfo: event.additional_info
    });
  } catch (error) {
    console.error('Error obteniendo evento:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear evento (solo admin)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({
      ...event,
      coupleNames: event.couple_names,
      weddingDate: event.wedding_date,
      dressCode: event.dress_code,
      dressCodeDescription: event.dress_code_description,
      bannerImageUrl: event.banner_image_url,
      additionalInfo: event.additional_info
    });
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Actualizar evento (solo admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body);
    if (!event) {
      return res.status(404).json({ message: 'Evento no encontrado.' });
    }
    res.json({
      ...event,
      coupleNames: event.couple_names,
      weddingDate: event.wedding_date,
      dressCode: event.dress_code,
      dressCodeDescription: event.dress_code_description,
      bannerImageUrl: event.banner_image_url,
      additionalInfo: event.additional_info
    });
  } catch (error) {
    console.error('Error actualizando evento:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
