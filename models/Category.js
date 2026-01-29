const { query } = require('../db');

class Category {
  static async find(queryConditions = {}) {
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (queryConditions.isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(queryConditions.isActive);
      paramIndex++;
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByName(name) {
    const result = await query('SELECT * FROM categories WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  static async create(categoryData) {
    const {
      name,
      description,
      isActive = true
    } = categoryData;

    const result = await query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, isActive]
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
      `UPDATE categories SET ${setClause} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async findByIdAndDelete(id) {
    // Verificar si hay regalos usando esta categoría
    const giftsCheck = await query('SELECT COUNT(*) FROM gifts WHERE category_id = $1', [id]);
    const giftCount = parseInt(giftsCheck.rows[0].count);

    if (giftCount > 0) {
      throw new Error(`No se puede eliminar la categoría porque ${giftCount} regalo(s) la están usando.`);
    }

    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }
}

module.exports = Category;
