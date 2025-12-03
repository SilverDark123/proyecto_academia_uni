// models/cycleModel.js
const db = require("../db");

function formatDateForSQL(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

const Cycle = {
  async create(data) {
    const { name, start_date, end_date, duration_months, status } = data;
    const sql = `
      INSERT INTO cycles (name, start_date, end_date, duration_months, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await db.query(sql, [
      name,
      formatDateForSQL(start_date),
      formatDateForSQL(end_date),
      duration_months || null,
      status || "open",
    ]);
    return { id: result.rows[0].id };
  },

  async getAll() {
    const result = await db.query("SELECT * FROM cycles ORDER BY id DESC");
    return result.rows;
  },

  async getOne(id) {
    const result = await db.query("SELECT * FROM cycles WHERE id = $1", [id]);
    return result.rows[0];
  },

  async update(id, data) {
    const { name, start_date, end_date, duration_months, status } = data;
    const sql = `
      UPDATE cycles 
      SET name = $1, start_date = $2, end_date = $3, duration_months = $4, status = $5
      WHERE id = $6
    `;
    await db.query(sql, [
      name,
      formatDateForSQL(start_date),
      formatDateForSQL(end_date),
      duration_months || null,
      status || "open",
      id,
    ]);
    return true;
  },

  async delete(id) {
    await db.query("DELETE FROM cycles WHERE id = $1", [id]);
    return true;
  },

  async getActive() {
    const result = await db.query(
      "SELECT * FROM cycles WHERE status = 'open' OR status = 'in_progress' ORDER BY id DESC"
    );
    return result.rows;
  },
};

module.exports = Cycle;
