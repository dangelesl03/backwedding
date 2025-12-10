const { query } = require('../db');

class Event {
  static async findOne(sort = { createdAt: -1 }) {
    const result = await query(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0] || null;
  }

  static async create(eventData) {
    const {
      title,
      coupleNames,
      weddingDate,
      location,
      address,
      dressCode = 'Elegante',
      dressCodeDescription,
      bannerImageUrl,
      additionalInfo
    } = eventData;

    const result = await query(
      `INSERT INTO events (title, couple_names, wedding_date, location, address, dress_code, dress_code_description, banner_image_url, additional_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, coupleNames, weddingDate, location, address, dressCode, dressCodeDescription, bannerImageUrl, additionalInfo]
    );
    return result.rows[0];
  }

  static async findByIdAndUpdate(id, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        // Convertir camelCase a snake_case
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
      `UPDATE events SET ${setClause} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

module.exports = Event;