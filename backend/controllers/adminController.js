// controllers/adminController.js
const db = require("../db");

// Obtener dashboard admin usando la vista extendida
exports.getDashboard = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM view_dashboard_admin_extended ORDER BY student_id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo dashboard admin:", err);
    res.status(500).json({
      message: "Error al obtener dashboard",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Error interno del servidor",
    });
  }
};

// Obtener analytics summary
exports.getAnalytics = async (req, res) => {
  try {
    const { cycle_id, student_id } = req.query;
    let sql = "SELECT * FROM analytics_summary WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (cycle_id) {
      sql += ` AND cycle_id = $${paramIndex++}`;
      params.push(cycle_id);
    }

    if (student_id) {
      sql += ` AND student_id = $${paramIndex++}`;
      params.push(student_id);
    }

    sql += " ORDER BY updated_at DESC";

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo analytics:", err);
    res.status(500).json({ message: "Error al obtener analytics" });
  }
};

// Obtener notificaciones recientes
exports.getNotifications = async (req, res) => {
  try {
    const { student_id, type, limit = 50 } = req.query;
    let sql = `
      SELECT nl.*, s.first_name, s.last_name, s.dni
      FROM notifications_log nl
      JOIN students s ON nl.student_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      sql += ` AND nl.student_id = $${paramIndex++}`;
      params.push(student_id);
    }

    if (type) {
      sql += ` AND nl.type = $${paramIndex++}`;
      params.push(type);
    }

    sql += ` ORDER BY nl.sent_at DESC LIMIT $${paramIndex++}`;
    params.push(parseInt(limit));

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo notificaciones:", err);
    res.status(500).json({ message: "Error al obtener notificaciones" });
  }
};
