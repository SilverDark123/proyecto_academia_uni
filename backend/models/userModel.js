// models/userModel.js
const db = require("../db");
const bcrypt = require("bcrypt");

const User = {
  async create({ username, password, role, related_id }) {
    const password_hash = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (username, password_hash, role, related_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const result = await db.query(sql, [
      username,
      password_hash,
      role,
      related_id || null,
    ]);
    return result.rows[0].id;
  },

  async findByUsername(username) {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    return result.rows[0];
  },

  async verifyPassword(plain, hash) {
    return await bcrypt.compare(plain, hash);
  },
};

module.exports = User;
