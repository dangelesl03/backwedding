const express = require('express');
const Category = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Obtener todas las categorías (público, solo activas)
router.get('/', async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const categories = await Category.find({ 
      isActive: includeInactive === 'true' ? undefined : true 
    });
    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Obtener una categoría específica
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }
    res.json(category);
  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear categoría (solo admin)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre de la categoría es requerido.' });
    }

    // Verificar si ya existe una categoría con ese nombre
    const existing = await Category.findByName(name.trim());
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre.' });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || null,
      isActive: isActive !== false
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Actualizar categoría (solo admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'El nombre de la categoría no puede estar vacío.' });
      }
      // Verificar si otro nombre ya existe
      const existing = await Category.findByName(name.trim());
      if (existing && existing.id !== parseInt(req.params.id)) {
        return res.status(400).json({ message: 'Ya existe una categoría con ese nombre.' });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }

    res.json(updatedCategory);
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Eliminar categoría (solo admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }
    res.json({ message: 'Categoría eliminada exitosamente.', category });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    if (error.message && error.message.includes('regalo')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
