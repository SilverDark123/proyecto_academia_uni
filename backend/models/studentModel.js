// models/studentModel.js
const db = require("../db");

const Student = {
  async create(data) {
    const {
      dni,
      first_name,
      last_name,
      phone,
      parent_name,
      parent_phone,
      password_hash,
    } = data;
    const sql = `
      INSERT INTO students (dni, first_name, last_name, phone, parent_name, parent_phone, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
    const result = await db.query(sql, [
      dni,
      first_name,
      last_name,
      phone,
      parent_name,
      parent_phone,
      password_hash,
    ]);
    return result.rows[0];
  },

  async getAll() {
    const result = await db.query("SELECT * FROM students");
    return result.rows;
  },

  async getByDni(dni) {
    const result = await db.query("SELECT * FROM students WHERE dni = $1", [
      dni,
    ]);
    return result.rows[0];
  },
};

module.exports = Student;
