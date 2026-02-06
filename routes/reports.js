const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { query } = require('../db');

const router = express.Router();

const checkAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo los administradores pueden acceder a los reportes.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};

router.get('/contributions', auth, checkAdmin, async (req, res) => {
  try {
    const giftsResult = await query(`
      SELECT 
        g.id,
        g.name,
        g.price,
        g.is_contributed,
        COALESCE(SUM(gc.amount), 0) as total_contributed
      FROM gifts g
      LEFT JOIN gift_contributions gc ON g.id = gc.gift_id
      WHERE g.is_active = true
      GROUP BY g.id, g.name, g.price, g.is_contributed
      ORDER BY g.name
    `);

    const contributionsResult = await query(`
      SELECT 
        gc.gift_id,
        gc.amount,
        gc.contributed_at,
        gc.receipt_file,
        gc.note,
        u.id as user_id,
        u.username
      FROM gift_contributions gc
      JOIN users u ON gc.user_id = u.id
      ORDER BY gc.gift_id, gc.contributed_at DESC
    `);

    const contributionsMap = new Map();
    contributionsResult.rows.forEach(row => {
      const giftId = row.gift_id;
      if (!contributionsMap.has(giftId)) {
        contributionsMap.set(giftId, []);
      }
      contributionsMap.get(giftId).push({
        userId: row.user_id.toString(),
        username: row.username,
        amount: parseFloat(row.amount),
        contributedAt: row.contributed_at,
        receiptFile: row.receipt_file,
        note: row.note || ''
      });
    });

    // Combinar regalos con sus contribuciones
    const gifts = giftsResult.rows.map(row => ({
      giftId: row.id.toString(),
      giftName: row.name,
      giftPrice: parseFloat(row.price),
      isContributed: row.is_contributed,
      totalContributed: parseFloat(row.total_contributed),
      contributions: contributionsMap.get(row.id) || []
    }));

    res.json(gifts);
  } catch (error) {
    console.error('Error obteniendo reporte de contribuciones:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

router.get('/summary', auth, checkAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        g.id,
        g.name,
        g.price,
        g.is_contributed,
        COALESCE(SUM(gc.amount), 0) as total_contributed,
        COUNT(gc.id) as contribution_count
      FROM gifts g
      LEFT JOIN gift_contributions gc ON g.id = gc.gift_id
      WHERE g.is_active = true
      GROUP BY g.id, g.name, g.price, g.is_contributed
      ORDER BY g.name
    `);

    const summary = result.rows.map(row => ({
      giftId: row.id,
      giftName: row.name,
      giftPrice: parseFloat(row.price),
      isContributed: row.is_contributed,
      totalContributed: parseFloat(row.total_contributed),
      contributionCount: parseInt(row.contribution_count),
      remaining: parseFloat(row.price) - parseFloat(row.total_contributed),
      percentage: parseFloat(row.price) > 0 
        ? (parseFloat(row.total_contributed) / parseFloat(row.price)) * 100 
        : 0
    }));

    res.json(summary);
  } catch (error) {
    console.error('Error obteniendo resumen de contribuciones:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;

