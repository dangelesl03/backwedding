const bcrypt = require('bcryptjs');
const { query } = require('../db');

class User {
  static async findByUsername(username) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(userData) {
    const { username, password, role = 'guest' } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, hashedPassword, role]
    );
    return result.rows[0];
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async findOne(conditions) {
    if (conditions.role) {
      const result = await query('SELECT * FROM users WHERE role = $1 LIMIT 1', [conditions.role]);
      return result.rows[0] || null;
    }
    return null;
  }
}

module.exports = User;