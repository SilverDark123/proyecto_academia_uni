// controllers/teacherController.js
const db = require('../db');
const { sendNotificationToParent } = require('../utils/notifications');
const User = require('../models/userModel');
const bcrypt = require('bcrypt');

exports.create = async (req, res) => {
  try {
    const { first_name, last_name, dni, phone, email, specialization } = req.body;
    const [result] = await db.query(
      'INSERT INTO teachers (first_name, last_name, dni, phone, email, specialization) VALUES (?, ?, ?, ?, ?, ?)',
      [first_name, last_name, dni, phone, email, specialization]
    );
    const teacherId = result.insertId;

    // Crear usuario para el docente: username=dni, password=dni (por defecto)
    try {
      await User.create({ username: dni, password: dni, role: 'teacher', related_id: teacherId });
    } catch (e) {
      // Si ya existe el usuario, ignorar duplicado
      if (e && e.code !== 'ER_DUP_ENTRY') {
        console.error('Error creando usuario de docente:', e);
      }
    }

    res.status(201).json({ id: teacherId, message: 'Profesor creado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear profesor' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const [teachers] = await db.query('SELECT id, first_name, last_name, dni, phone, email, specialization FROM teachers');
    // devolver name para compatibilidad frontend
    const mapped = teachers.map(t => ({ ...t, name: `${t.first_name} ${t.last_name}` }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener profesores' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [teacher] = await db.query('SELECT id, first_name, last_name, dni, phone, email, specialization FROM teachers WHERE id = ?', [req.params.id]);
    if (!teacher.length) return res.status(404).json({ message: 'Profesor no encontrado' });
    const t = teacher[0];
    res.json({ ...t, name: `${t.first_name} ${t.last_name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener profesor' });
  }
};

exports.update = async (req, res) => {
  try {
    const { first_name, last_name, dni, phone, email, specialization } = req.body;
    await db.query(
      'UPDATE teachers SET first_name = ?, last_name = ?, dni = ?, phone = ?, email = ?, specialization = ? WHERE id = ?',
      [first_name, last_name, dni, phone, email, specialization, req.params.id]
    );
    res.json({ message: 'Profesor actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar profesor' });
  }
};

exports.delete = async (req, res) => {
  try {
    await db.query('DELETE FROM teachers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Profesor eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar profesor' });
  }
};

// Resetear contraseña del usuario docente a su DNI
exports.resetPassword = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const [rows] = await db.query('SELECT dni FROM teachers WHERE id = ? LIMIT 1', [teacherId]);
    if (!rows.length) return res.status(404).json({ message: 'Profesor no encontrado' });
    const dni = rows[0].dni;
    const password_hash = await bcrypt.hash(dni, 10);
    const [upd] = await db.query('UPDATE users SET password_hash = ? WHERE role = ? AND related_id = ?', [password_hash, 'teacher', teacherId]);
    if (upd.affectedRows === 0) {
      // Si no existía usuario, crearlo
      try { await User.create({ username: dni, password: dni, role: 'teacher', related_id: teacherId }); }
      catch (e) { /* ignorar duplicados */ }
    }
    res.json({ message: 'Contraseña restablecida al DNI' });
  } catch (err) {
    console.error('Error al resetear contraseña de docente:', err);
    res.status(500).json({ message: 'Error al resetear contraseña' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const [students] = await db.query(`
      SELECT DISTINCT s.*
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      JOIN course_offerings co ON e.course_offering_id = co.id
      WHERE co.teacher_id = ?
        AND e.enrollment_type = 'course'
        AND e.status = 'aceptado'
    `, [teacherId]);
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estudiantes' });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { schedule_id, student_id, status } = req.body;
    const date = new Date().toISOString().split('T')[0];

    const teacherParamId = Number(req.params.id);
    // Si el usuario es teacher, validar que su related_id coincida
    if (req.user.role === 'teacher' && req.user.related_id && Number(req.user.related_id) !== teacherParamId) {
      return res.status(403).json({ message: 'No autorizado para marcar asistencia como este profesor' });
    }

    // Verificar que el profesor está asignado al course_offering del schedule
    const [courseCheck] = await db.query(`
      SELECT co.* FROM course_offerings co
      JOIN schedules s ON co.id = s.course_offering_id
      WHERE s.id = ? AND co.teacher_id = ?
    `, [schedule_id, teacherParamId]);

    if (!courseCheck.length) {
      return res.status(403).json({ message: 'No tienes permiso para marcar asistencia en este curso' });
    }

    // Verificar que el estudiante tenga una matrícula aceptada en el course_offering de este schedule
    const [enrollmentCheck] = await db.query(`
      SELECT e.id
      FROM enrollments e
      JOIN schedules s ON s.course_offering_id = e.course_offering_id
      WHERE s.id = ?
        AND e.student_id = ?
        AND e.enrollment_type = 'course'
        AND e.status = 'aceptado'
      LIMIT 1
    `, [schedule_id, student_id]);

    if (!enrollmentCheck.length) {
      return res.status(400).json({ message: 'El estudiante no tiene una matrícula aceptada en este curso' });
    }

    // Verificar si ya existe asistencia para esta fecha
    const [existing] = await db.query(
      'SELECT id FROM attendance WHERE schedule_id = ? AND student_id = ? AND date = ?',
      [schedule_id, student_id, date]
    );

    if (existing.length > 0) {
      // Actualizar asistencia existente
      await db.query(
        'UPDATE attendance SET status = ? WHERE id = ?',
        [status, existing[0].id]
      );
    } else {
      // Insertar nueva asistencia
      await db.query(
        'INSERT INTO attendance (schedule_id, student_id, date, status) VALUES (?, ?, ?, ?)',
        [schedule_id, student_id, date, status]
      );
    }

    // Si ausente, verificar faltas totales en ese schedule
    if (status === 'ausente') {
      const [absences] = await db.query(`
        SELECT COUNT(*) as count FROM attendance 
        WHERE student_id = ? AND status = 'ausente' AND schedule_id = ?
      `, [student_id, schedule_id]);

      if (absences[0].count >= 3) {
        const [student] = await db.query('SELECT * FROM students WHERE id = ?', [student_id]);
        if (student.length && student[0].parent_phone) {
          try {
            await sendNotificationToParent(
              student_id,
              student[0].parent_phone, 
              `Su hijo/a ${student[0].first_name} ${student[0].last_name} ha acumulado ${absences[0].count} faltas en este horario`,
              'absences_3'
            );
          } catch (notifErr) { 
            console.error('Error enviando notificación:', notifErr); 
          }
        }
      }
    }

    res.json({ message: 'Asistencia marcada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al marcar asistencia' });
  }
};