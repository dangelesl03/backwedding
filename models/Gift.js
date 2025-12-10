const { query } = require('../db');

class Gift {
  static async find(queryConditions = {}) {
    let sql = 'SELECT g.*, COALESCE(SUM(gc.amount), 0) as total_contributed FROM gifts g LEFT JOIN gift_contributions gc ON g.id = gc.gift_id WHERE g.is_active = true';
    const params = [];
    let paramIndex = 1;

    if (queryConditions.category && queryConditions.category !== 'Todas las categorías') {
      sql += ` AND g.category = $${paramIndex}`;
      params.push(queryConditions.category);
      paramIndex++;
    }

    if (queryConditions.price) {
      if (queryConditions.price.$gte !== undefined) {
        sql += ` AND g.price >= $${paramIndex}`;
        params.push(queryConditions.price.$gte);
        paramIndex++;
      }
      if (queryConditions.price.$lte !== undefined) {
        sql += ` AND g.price <= $${paramIndex}`;
        params.push(queryConditions.price.$lte);
        paramIndex++;
      }
    }

    sql += ' GROUP BY g.id';

    // Ordenar
    if (queryConditions.sort) {
      if (queryConditions.sort.price === 1) {
        sql += ' ORDER BY g.price ASC';
      } else if (queryConditions.sort.price === -1) {
        sql += ' ORDER BY g.price DESC';
      } else {
        sql += ' ORDER BY g.name ASC';
      }
    } else {
      sql += ' ORDER BY g.name ASC';
    }

    const result = await query(sql, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT g.*, COALESCE(SUM(gc.amount), 0) as total_contributed 
       FROM gifts g 
       LEFT JOIN gift_contributions gc ON g.id = gc.gift_id 
       WHERE g.id = $1 
       GROUP BY g.id`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(giftData) {
    const {
      name,
      description,
      price,
      currency = 'PEN',
      category = 'Otro',
      available = 1,
      total = 1,
      imageUrl,
      isActive = true
    } = giftData;

    const result = await query(
      `INSERT INTO gifts (name, description, price, currency, category, available, total, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, description, price, currency, category, available, total, imageUrl, isActive]
    );
    return result.rows[0];
  }

  static async findByIdAndUpdate(id, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const setClause = fields.join(', ');

    const result = await query(
      `UPDATE gifts SET ${setClause} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async findByIdAndDelete(id) {
    const result = await query('DELETE FROM gifts WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  static async addContribution(giftId, userId, amount) {
    // Obtener el regalo actual para verificar el total contribuido antes de agregar
    const currentGift = await this.findById(giftId);
    const currentTotal = parseFloat(currentGift.total_contributed || 0);
    const giftPrice = parseFloat(currentGift.price);
    
    // Insertar contribución
    await query(
      'INSERT INTO gift_contributions (gift_id, user_id, amount) VALUES ($1, $2, $3)',
      [giftId, userId, amount]
    );

    // Calcular el nuevo total contribuido después de agregar la contribución
    const newTotalContributed = currentTotal + parseFloat(amount);
    
    // Solo marcar como completamente contribuido si el nuevo total alcanza o supera el precio completo
    // Usar >= para manejar casos donde múltiples contribuciones puedan exceder ligeramente el precio
    if (newTotalContributed >= giftPrice) {
      await query('UPDATE gifts SET is_contributed = true WHERE id = $1', [giftId]);
    } else {
      // Asegurarse de que NO esté marcado como contribuido si aún no alcanza el precio completo
      await query('UPDATE gifts SET is_contributed = false WHERE id = $1', [giftId]);
    }

    return await this.findById(giftId);
  }

  static async getContributions(giftId) {
    const result = await query(
      `SELECT gc.*, u.username 
       FROM gift_contributions gc 
       JOIN users u ON gc.user_id = u.id 
       WHERE gc.gift_id = $1 
       ORDER BY gc.contributed_at DESC`,
      [giftId]
    );
    return result.rows;
  }
}

module.exports = Gift;