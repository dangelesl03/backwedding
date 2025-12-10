const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const isValidPassword = await User.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error en el servidor.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Verificar token
router.get('/verify', auth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Crear usuario administrador (solo para inicialización)
router.post('/setup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar si ya existe un usuario admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Ya existe un usuario administrador.' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }

    await User.create({
      username,
      password,
      role: 'admin'
    });

    res.status(201).json({ message: 'Usuario administrador creado exitosamente.' });
  } catch (error) {
    console.error('Error creando usuario admin:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
