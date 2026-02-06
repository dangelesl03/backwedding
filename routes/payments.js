const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Gift = require('../models/Gift');
const { optionalAuth } = require('../middleware/auth');
const { query } = require('../db');

const router = express.Router();

// Configurar multer para almacenar archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único: timestamp + nombre original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: function (req, file, cb) {
    // Permitir imágenes y PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF) o PDF'));
    }
  }
});

// Marcar regalos como vendidos después del pago
router.post('/confirm', optionalAuth, upload.single('receipt'), async (req, res) => {
  try {
    // Parsear giftIds desde FormData
    let giftIds;
    try {
      giftIds = JSON.parse(req.body.giftIds);
    } catch (e) {
      giftIds = req.body.giftIds;
    }
    
    // Parsear amounts desde FormData
    let amounts;
    if (req.body.amounts) {
      try {
        amounts = JSON.parse(req.body.amounts);
      } catch (e) {
        amounts = req.body.amounts;
      }
    }

    const paymentMethod = req.body.paymentMethod || 'Transferencia';
    const paymentReference = req.body.paymentReference || '';
    const note = req.body.note || req.body.paymentReference || '';
    const receiptFile = req.file;

    console.log('Confirmando pago:', { 
      giftIds, 
      userId: req.user?.id, 
      user: req.user,
      hasReceipt: !!receiptFile,
      note: note?.substring(0, 50) + '...'
    });

    if (!giftIds || !Array.isArray(giftIds) || giftIds.length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un regalo para confirmar.' });
    }

    // Validar que se haya subido el comprobante
    if (!receiptFile) {
      return res.status(400).json({ message: 'Se requiere subir el comprobante de pago.' });
    }

    // Validar que se haya proporcionado una nota
    if (!note || note.trim() === '') {
      // Eliminar el archivo subido si falta la nota
      if (receiptFile && fs.existsSync(receiptFile.path)) {
        fs.unlinkSync(receiptFile.path);
      }
      return res.status(400).json({ message: 'Se requiere una nota con tu nombre.' });
    }

    // Si hay usuario autenticado, usarlo; si no, crear un usuario invitado temporal
    let userId;
    if (req.user && (req.user.id || req.user.userId)) {
      userId = req.user.id || req.user.userId;
    } else {
      // Crear o obtener usuario invitado temporal
      // Usar un ID fijo para invitados anónimos
      const guestResult = await query(
        `SELECT id FROM users WHERE username = 'invitado' AND role = 'guest' LIMIT 1`
      );
      if (guestResult.rows.length > 0) {
        userId = guestResult.rows[0].id;
      } else {
        // Crear usuario invitado temporal
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('temp', 10);
        const newGuest = await query(
          `INSERT INTO users (username, password, role) VALUES ('invitado', $1, 'guest') RETURNING id`,
          [hashedPassword]
        );
        userId = newGuest.rows[0].id;
      }
    }
    
    if (!userId) {
      console.error('No se pudo obtener o crear usuario');
      // Eliminar el archivo subido si hay error
      if (receiptFile && fs.existsSync(receiptFile.path)) {
        fs.unlinkSync(receiptFile.path);
      }
      return res.status(500).json({ message: 'Error al procesar el usuario.' });
    }

    // Registrar las contribuciones pagadas (pueden ser parciales)
    const updatedGifts = [];
    
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
            // Guardar la ruta del archivo relativa para almacenar en BD
            const receiptFilePath = receiptFile ? `/uploads/receipts/${path.basename(receiptFile.path)}` : null;
            
            // Agregar contribución usando el método del modelo (que maneja correctamente el estado)
            await Gift.addContribution(id, userId, amountToContribute, receiptFilePath, note);
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
