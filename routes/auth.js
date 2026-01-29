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

router.get('/verify', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    res.json({
      user: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

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

router.get('/users', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Solo los administradores pueden ver usuarios.' });
    }

    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

router.post('/users', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Solo los administradores pueden crear usuarios.' });
    }

    const { username, password, role = 'guest' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
    }

    if (role !== 'admin' && role !== 'guest') {
      return res.status(400).json({ message: 'El rol debe ser "admin" o "guest".' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }

    const newUser = await User.create({
      username,
      password,
      role
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente.',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ message: 'El usuario ya existe.' });
    }
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Solo los administradores pueden eliminar usuarios.' });
    }

    const userId = parseInt(req.params.id);

    if (userId === currentUser.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }

    const deletedUser = await User.delete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({
      message: 'Usuario eliminado exitosamente.',
      user: deletedUser
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
