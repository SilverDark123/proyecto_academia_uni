// controllers/teacherController.js
const db = require("../db");
const { sendNotificationToParent } = require("../utils/notifications");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");

exports.create = async (req, res) => {
  try {
    const { first_name, last_name, dni, phone, email, specialization } =
      req.body;
    const result = await db.query(
      "INSERT INTO teachers (first_name, last_name, dni, phone, email, specialization) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [first_name, last_name, dni, phone, email, specialization]
    );
    const teacherId = result.rows[0].id;

    // Crear usuario para el docente: username=dni, password=dni (por defecto)
    try {
      await User.create({
        username: dni,
        password: dni,
        role: "teacher",
        related_id: teacherId,
      });
    } catch (e) {
      // Si ya existe el usuario, ignorar duplicado (PostgreSQL unique_violation code is 23505)
      if (e && e.code !== "23505") {
        console.error("Error creando usuario de docente:", e);
      }
    }

    res
      .status(201)
      .json({ id: teacherId, message: "Profesor creado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear profesor" });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, first_name, last_name, dni, phone, email, specialization FROM teachers"
    );
    // devolver name para compatibilidad frontend
    const mapped = result.rows.map((t) => ({
      ...t,
      name: `${t.first_name} ${t.last_name}`,
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener profesores" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, first_name, last_name, dni, phone, email, specialization FROM teachers WHERE id = $1",
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Profesor no encontrado" });
    const t = result.rows[0];
    res.json({ ...t, name: `${t.first_name} ${t.last_name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener profesor" });
  }
};

exports.update = async (req, res) => {
  try {
    const { first_name, last_name, dni, phone, email, specialization } =
      req.body;
    await db.query(
      "UPDATE teachers SET first_name = $1, last_name = $2, dni = $3, phone = $4, email = $5, specialization = $6 WHERE id = $7",
      [first_name, last_name, dni, phone, email, specialization, req.params.id]
    );
    res.json({ message: "Profesor actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar profesor" });
  }
};

exports.delete = async (req, res) => {
  try {
    await db.query("DELETE FROM teachers WHERE id = $1", [req.params.id]);
    res.json({ message: "Profesor eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar profesor" });
  }
};

// Resetear contraseña del usuario docente a su DNI
exports.resetPassword = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const rows = await db.query(
      "SELECT dni FROM teachers WHERE id = $1 LIMIT 1",
      [teacherId]
    );
    if (!rows.rows.length)
      return res.status(404).json({ message: "Profesor no encontrado" });
    const dni = rows.rows[0].dni;
    const password_hash = await bcrypt.hash(dni, 10);
    const upd = await db.query(
      "UPDATE users SET password_hash = $1 WHERE role = $2 AND related_id = $3",
      [password_hash, "teacher", teacherId]
    );
    if (upd.rowCount === 0) {
      // Si no existía usuario, crearlo
      try {
        await User.create({
          username: dni,
          password: dni,
          role: "teacher",
          related_id: teacherId,
        });
      } catch (e) {
        /* ignorar duplicados */
      }
    }
    res.json({ message: "Contraseña restablecida al DNI" });
  } catch (err) {
    console.error("Error al resetear contraseña de docente:", err);
    res.status(500).json({ message: "Error al resetear contraseña" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const result = await db.query(
      `
      SELECT DISTINCT s.*
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      JOIN course_offerings co ON e.course_offering_id = co.id
      WHERE co.teacher_id = $1
        AND e.enrollment_type = 'course'
        AND e.status = 'aceptado'
    `,
      [teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener estudiantes" });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { schedule_id, student_id, status } = req.body;
    const date = new Date().toISOString().split("T")[0];

    const teacherParamId = Number(req.params.id);
    // Si el usuario es teacher, validar que su related_id coincida
    if (
      req.user.role === "teacher" &&
      req.user.related_id &&
      Number(req.user.related_id) !== teacherParamId
    ) {
      return res.status(403).json({
        message: "No autorizado para marcar asistencia como este profesor",
      });
    }

    // Verificar que el profesor está asignado al course_offering del schedule
    const courseCheck = await db.query(
      `
      SELECT co.* FROM course_offerings co
      JOIN schedules s ON co.id = s.course_offering_id
      WHERE s.id = $1 AND co.teacher_id = $2
    `,
      [schedule_id, teacherParamId]
    );

    if (!courseCheck.rows.length) {
      return res.status(403).json({
        message: "No tienes permiso para marcar asistencia en este curso",
      });
    }

    // Verificar que el estudiante tenga una matrícula aceptada en el course_offering de este schedule
    const enrollmentCheck = await db.query(
      `
      SELECT e.id
      FROM enrollments e
      JOIN schedules s ON s.course_offering_id = e.course_offering_id
      WHERE s.id = $1
        AND e.student_id = $2
        AND e.enrollment_type = 'course'
        AND e.status = 'aceptado'
      LIMIT 1
    `,
      [schedule_id, student_id]
    );

    if (!enrollmentCheck.rows.length) {
      return res.status(400).json({
        message: "El estudiante no tiene una matrícula aceptada en este curso",
      });
    }

    // Verificar si ya existe asistencia para esta fecha
    const existing = await db.query(
      "SELECT id FROM attendance WHERE schedule_id = $1 AND student_id = $2 AND date = $3",
      [schedule_id, student_id, date]
    );

    if (existing.rows.length > 0) {
      // Actualizar asistencia existente
      await db.query("UPDATE attendance SET status = $1 WHERE id = $2", [
        status,
        existing.rows[0].id,
      ]);
    } else {
      // Insertar nueva asistencia
      await db.query(
        "INSERT INTO attendance (schedule_id, student_id, date, status) VALUES ($1, $2, $3, $4)",
        [schedule_id, student_id, date, status]
      );
    }

    // Si ausente, verificar faltas totales en ese schedule
    if (status === "ausente") {
      const absences = await db.query(
        `
        SELECT COUNT(*) as count FROM attendance 
        WHERE student_id = $1 AND status = 'ausente' AND schedule_id = $2
      `,
        [student_id, schedule_id]
      );

      if (Number(absences.rows[0].count) >= 3) {
        const student = await db.query("SELECT * FROM students WHERE id = $1", [
          student_id,
        ]);
        if (student.rows.length && student.rows[0].parent_phone) {
          try {
            await sendNotificationToParent(
              student_id,
              student.rows[0].parent_phone,
              `Su hijo/a ${student.rows[0].first_name} ${student.rows[0].last_name} ha acumulado ${absences.rows[0].count} faltas en este horario`,
              "absences_3"
            );
          } catch (notifErr) {
            console.error("Error enviando notificación:", notifErr);
          }
        }
      }
    }

    res.json({ message: "Asistencia marcada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al marcar asistencia" });
  }
};
