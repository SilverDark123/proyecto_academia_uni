// controllers/enrollmentController.js
const Enrollment = require("../models/enrollmentModel");
const db = require("../db");

// Obtener las matrículas del estudiante autenticado
exports.getAll = async (req, res) => {
  try {
    let studentId;

    // Si es estudiante, usar su ID del token
    if (req.user.role === "student") {
      studentId = req.user.id;
    }
    // Si es admin, puede especificar student_id en query
    else if (req.user.role === "admin" && req.query.student_id) {
      studentId = req.query.student_id;
    } else {
      return res
        .status(400)
        .json({ message: "Falta student_id o no tienes permisos" });
    }

    const enrollments = await Enrollment.getByStudent(studentId);
    res.json(enrollments);
  } catch (err) {
    console.error("Error al obtener las matrículas:", err);
    res.status(500).json({ message: "Error al obtener las matrículas" });
  }
};

// Listar alumnos matriculados por oferta (course_offering o package_offering)
// Query: type=course|package, id=<offering_id>, status=aceptado|pendiente|...
exports.getByOffering = async (req, res) => {
  try {
    const { type, id, status = "aceptado" } = req.query;
    if (!type || !id) {
      return res.status(400).json({ message: "Faltan parámetros: type e id" });
    }

    let where = "e.enrollment_type = $1 AND e.status = $2";
    const params = [type === "course" ? "course" : "package", status];

    if (type === "course") {
      where += " AND e.course_offering_id = $3";
    } else {
      where += " AND e.package_offering_id = $3";
    }
    params.push(id);

    const result = await db.query(
      `SELECT 
          MIN(e.id) as enrollment_id,
          e.enrollment_type,
          MIN(e.status) as status,
          s.id as student_id, s.first_name, s.last_name, s.dni,
          COALESCE(c.name, p.name) as item_name
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN course_offerings co ON e.course_offering_id = co.id
       LEFT JOIN courses c ON co.course_id = c.id
       LEFT JOIN package_offerings po ON e.package_offering_id = po.id
       LEFT JOIN packages p ON po.package_id = p.id
       WHERE ${where}
       GROUP BY e.enrollment_type, s.id, s.first_name, s.last_name, s.dni, item_name
       ORDER BY s.last_name, s.first_name`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener matriculados por oferta:", err);
    res
      .status(500)
      .json({ message: "Error al obtener matriculados por oferta" });
  }
};

// Crear matrículas para el estudiante autenticado a partir de una lista de items
// body: { items: [{ type: 'course'|'package', id: <offering_id> }] }
exports.create = async (req, res) => {
  try {
    const studentId = req.user && req.user.id;
    if (!studentId) return res.status(401).json({ message: "No autenticado" });

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "No se enviaron items para matricular" });
    }

    const created = await Enrollment.createForStudent(studentId, items);
    res
      .status(201)
      .json({ message: "Matrículas creadas correctamente", created });
  } catch (err) {
    console.error("Error al crear matrículas:", err);
    // Conflictos de reglas de negocio -> 400
    const knownMsgs = [
      "El estudiante ya está matriculado en este curso",
      "El estudiante ya está matriculado en este paquete",
      "Ya existe una matrícula de paquete que cubre este curso",
      "El estudiante ya está matriculado en cursos que pertenecen a este paquete",
      "Course offering no encontrado",
      "Package offering no encontrado",
    ];
    if (err && err.message && knownMsgs.includes(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Error al crear la matrícula" });
  }
};

// Cancelar una matrícula propia (solo estudiante)
// body: { enrollment_id }
exports.cancelOwn = async (req, res) => {
  try {
    const studentId = req.user && req.user.id;
    if (!studentId) return res.status(401).json({ message: "No autenticado" });

    const { enrollment_id } = req.body;
    if (!enrollment_id) {
      return res.status(400).json({ message: "Falta enrollment_id" });
    }

    try {
      const result = await Enrollment.cancelForStudent(
        studentId,
        enrollment_id
      );
      return res.json(result);
    } catch (err) {
      const msg = err && err.message ? err.message : "";
      if (
        msg === "Matrícula no encontrada" ||
        msg === "Solo se pueden cancelar matrículas pendientes" ||
        msg ===
          "No se puede cancelar una matrícula con pagos o vouchers registrados"
      ) {
        return res.status(400).json({ message: msg });
      }
      throw err;
    }
  } catch (err) {
    console.error("Error al cancelar matrícula:", err);
    res.status(500).json({ message: "Error al cancelar matrícula" });
  }
};

// Obtener todas las matrículas (solo admin) con info de estudiante y pago
exports.getAllAdmin = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*, s.first_name, s.last_name, s.dni,
        COALESCE(c.name, p.name) as item_name,
        pp.id as payment_plan_id, ip.id as installment_id, ip.amount as installment_amount, ip.status as installment_status, ip.voucher_url
      FROM enrollments e
      LEFT JOIN students s ON e.student_id = s.id
      LEFT JOIN course_offerings co ON e.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN package_offerings po ON e.package_offering_id = po.id
      LEFT JOIN packages p ON po.package_id = p.id
      LEFT JOIN payment_plans pp ON pp.enrollment_id = e.id
      LEFT JOIN installments ip ON ip.payment_plan_id = pp.id AND ip.installment_number = 1
      ORDER BY e.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo matrículas admin:", err);
    res.status(500).json({ message: "Error al obtener matrículas" });
  }
};

// Aceptar o rechazar matrícula (solo admin)
exports.updateStatus = async (req, res) => {
  try {
    const { enrollment_id, status } = req.body;

    if (!["aceptado", "rechazado", "cancelado"].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    const adminId = req.user.id;
    const accepted_at = status === "aceptado" ? new Date() : null;

    // Regla: Solo aceptar si el pago está 100% aprobado (todas las cuotas pagadas)
    if (status === "aceptado") {
      const ppResult = await db.query(
        "SELECT pp.id FROM payment_plans pp WHERE pp.enrollment_id = $1 LIMIT 1",
        [enrollment_id]
      );
      const ppRows = ppResult.rows;
      if (ppRows.length) {
        const paymentPlanId = ppRows[0].id;
        const pendingResult = await db.query(
          "SELECT COUNT(*) as cnt FROM installments WHERE payment_plan_id = $1 AND status != $2",
          [paymentPlanId, "paid"]
        );
        const pending = pendingResult.rows;
        if (pending[0].cnt > 0) {
          return res
            .status(400)
            .json({
              message: "No se puede aceptar: pago no aprobado completamente",
            });
        }
      } else {
        // Si no hay plan de pagos, no permitir aceptación automática
        return res
          .status(400)
          .json({ message: "No se puede aceptar: matrícula sin plan de pago" });
      }
    }

    await db.query(
      "UPDATE enrollments SET status = $1, accepted_by_admin_id = $2, accepted_at = $3 WHERE id = $4",
      [status, adminId, accepted_at, enrollment_id]
    );

    res.json({ message: `Matrícula ${status} correctamente` });
  } catch (err) {
    console.error("Error actualizando estado de matrícula:", err);
    res
      .status(500)
      .json({ message: "Error al actualizar estado de matrícula" });
  }
};
