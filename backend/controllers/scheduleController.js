// controllers/scheduleController.js
const db = require("../db");

exports.create = async (req, res) => {
  try {
    const { course_offering_id, day_of_week, start_time, end_time, classroom } =
      req.body;

    if (!course_offering_id) {
      return res
        .status(400)
        .json({ message: "course_offering_id es requerido" });
    }

    const result = await db.query(
      "INSERT INTO schedules (course_offering_id, day_of_week, start_time, end_time, classroom) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [course_offering_id, day_of_week, start_time, end_time, classroom]
    );

    res.status(201).json({
      message: "Horario creado exitosamente",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear el horario" });
  }
};

exports.getByCourseOffering = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, co.id as course_offering_id, co.course_id, co.group_label, c.name as course_name, cyc.name as cycle_name
       FROM schedules s
       LEFT JOIN course_offerings co ON s.course_offering_id = co.id
       LEFT JOIN courses c ON co.course_id = c.id
       LEFT JOIN cycles cyc ON co.cycle_id = cyc.id
       WHERE s.course_offering_id = $1
       ORDER BY s.day_of_week, s.start_time`,
      [req.params.courseOfferingId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener los horarios" });
  }
};

// Obtener horarios por package_offering
// 1) Usa mapeo exacto package_offering_courses -> course_offerings
// 2) Fallback: por cursos del paquete en el mismo ciclo
exports.getByPackageOffering = async (req, res) => {
  try {
    const packageOfferingId = req.params.packageOfferingId;
    // Intentar mapeo exacto
    const mapped = await db.query(
      `SELECT s.*, co.id AS course_offering_id, co.course_id, co.group_label,
              c.name AS course_name, cyc.name AS cycle_name,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM package_offering_courses poc
       JOIN course_offerings co ON co.id = poc.course_offering_id
       JOIN courses c ON c.id = co.course_id
       LEFT JOIN teachers t ON t.id = co.teacher_id
       JOIN cycles cyc ON cyc.id = co.cycle_id
       LEFT JOIN schedules s ON s.course_offering_id = co.id
       WHERE poc.package_offering_id = $1
       ORDER BY c.id, co.id, s.day_of_week, s.start_time`,
      [packageOfferingId]
    );
    if (mapped.rows && mapped.rows.length > 0) {
      return res.json(mapped.rows);
    }

    // Fallback: por cursos/ciclo
    const result = await db.query(
      `SELECT s.*, co.id as course_offering_id, co.course_id, co.group_label,
              c.name as course_name, cyc.name as cycle_name,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM package_offerings po
       JOIN packages p ON po.package_id = p.id
       JOIN package_courses pc ON pc.package_id = p.id
       JOIN course_offerings co ON co.course_id = pc.course_id AND co.cycle_id = po.cycle_id
       JOIN courses c ON c.id = co.course_id
       LEFT JOIN teachers t ON t.id = co.teacher_id
       JOIN cycles cyc ON cyc.id = co.cycle_id
       LEFT JOIN schedules s ON s.course_offering_id = co.id
       WHERE po.id = $1
       ORDER BY c.id, co.id, s.day_of_week, s.start_time`,
      [packageOfferingId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error al obtener los horarios del paquete" });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { day_of_week, start_time, end_time, classroom } = req.body;
    await db.query(
      "UPDATE schedules SET day_of_week = $1, start_time = $2, end_time = $3, classroom = $4 WHERE id = $5",
      [day_of_week, start_time, end_time, classroom, id]
    );
    res.json({ message: "Horario actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar horario:", err);
    res.status(500).json({ message: "Error al actualizar horario" });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query("DELETE FROM schedules WHERE id = $1", [id]);
    res.json({ message: "Horario eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar horario:", err);
    res.status(500).json({ message: "Error al eliminar horario" });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, co.id as course_offering_id, co.course_id, co.group_label, c.name as course_name, cyc.name as cycle_name
      FROM schedules s
      LEFT JOIN course_offerings co ON s.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN cycles cyc ON co.cycle_id = cyc.id
      ORDER BY co.course_id, s.day_of_week, s.start_time
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener todos los horarios:", err);
    res.status(500).json({ message: "Error al obtener horarios" });
  }
};
