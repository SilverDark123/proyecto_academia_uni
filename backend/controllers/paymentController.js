// controllers/paymentController.js
const db = require("../db");
const path = require("path");

// Aprobar un installment: marcar como paid y si es la cuota final, actualizar enrollments
exports.approveInstallment = async (req, res) => {
  try {
    const { installment_id } = req.body;

    // marcar installment como paid
    await db.query(
      "UPDATE installments SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2",
      ["paid", installment_id]
    );

    // obtener payment_plan y enrollment
    const result1 = await db.query(
      `SELECT pp.id as payment_plan_id, pp.enrollment_id FROM payment_plans pp JOIN installments i ON i.payment_plan_id = pp.id WHERE i.id = $1`,
      [installment_id]
    );
    const rows = result1.rows;
    if (!rows.length)
      return res.status(404).json({ message: "Installment no encontrado" });

    const payment_plan_id = rows[0].payment_plan_id;
    const enrollment_id = rows[0].enrollment_id;

    // Si todas las cuotas están pagadas, actualizar enrollment a 'aceptado'
    const pendingResult = await db.query(
      "SELECT COUNT(*) as cnt FROM installments WHERE payment_plan_id = $1 AND status != $2",
      [payment_plan_id, "paid"]
    );
    const pending = pendingResult.rows;
    let cycle_start_date = null;
    let cycle_end_date = null;
    if (pending[0].cnt === 0) {
      // Aceptar la matrícula principal
      await db.query(
        "UPDATE enrollments SET status = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2",
        ["aceptado", enrollment_id]
      );

      // Obtener datos de la matrícula para cascada
      const enrResult = await db.query(
        "SELECT enrollment_type, student_id, course_offering_id, package_offering_id FROM enrollments WHERE id = $1 LIMIT 1",
        [enrollment_id]
      );
      const enrRows = enrResult.rows;
      if (enrRows.length) {
        const enr = enrRows[0];
        // Fechas del ciclo según tipo de matrícula
        if (enr.enrollment_type === "course" && enr.course_offering_id) {
          const cyResult = await db.query(
            `SELECT cyc.start_date, cyc.end_date
             FROM course_offerings co
             JOIN cycles cyc ON cyc.id = co.cycle_id
             WHERE co.id = $1 LIMIT 1`,
            [enr.course_offering_id]
          );
          const cy = cyResult.rows;
          if (cy.length) {
            cycle_start_date = cy[0].start_date;
            cycle_end_date = cy[0].end_date;
          }
        } else if (
          enr.enrollment_type === "package" &&
          enr.package_offering_id
        ) {
          const cyResult = await db.query(
            `SELECT cyc.start_date, cyc.end_date
             FROM package_offerings po
             JOIN cycles cyc ON cyc.id = po.cycle_id
             WHERE po.id = $1 LIMIT 1`,
            [enr.package_offering_id]
          );
          const cy = cyResult.rows;
          if (cy.length) {
            cycle_start_date = cy[0].start_date;
            cycle_end_date = cy[0].end_date;
          }
        }
        // Si es paquete, aceptar también las matrículas de cursos asociadas al mismo package_offering
        if (enr.enrollment_type === "package" && enr.package_offering_id) {
          await db.query(
            `UPDATE enrollments 
             SET status = 'aceptado', accepted_at = CURRENT_TIMESTAMP
             WHERE student_id = $1 AND enrollment_type = 'course' AND package_offering_id = $2`,
            [enr.student_id, enr.package_offering_id]
          );
        }
      }
    }

    // notificar padre (intentar)
    const sResult = await db.query(
      `SELECT s.* FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1`,
      [enrollment_id]
    );
    const srows = sResult.rows;
    if (srows.length) {
      const student = srows[0];
      const { sendNotificationToParent } = require("../utils/notifications");
      try {
        await sendNotificationToParent(
          student.id,
          student.parent_phone,
          `Pago recibido para la matrícula ${enrollment_id}`,
          "other"
        );
      } catch (err) {
        console.error("Notif err", err);
      }
    }

    res.json({
      message: "Installment aprobado",
      cycle_start_date,
      cycle_end_date,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al aprobar installment" });
  }
};

// Subir voucher a un installment
exports.uploadVoucher = async (req, res) => {
  try {
    const file = req.file;
    const { installment_id } = req.body;

    if (!file)
      return res.status(400).json({ message: "No se subió ningún archivo" });

    // Verificar existencia del installment y permiso
    const instResult = await db.query(
      "SELECT i.*, pp.enrollment_id, e.student_id FROM installments i JOIN payment_plans pp ON i.payment_plan_id = pp.id JOIN enrollments e ON pp.enrollment_id = e.id WHERE i.id = $1",
      [installment_id]
    );
    const instRows = instResult.rows;
    if (!instRows.length)
      return res.status(404).json({ message: "Installment no encontrado" });
    const installment = instRows[0];
    if (req.user.role !== "admin" && req.user.id !== installment.student_id)
      return res.status(403).json({ message: "No tienes permiso" });

    const voucherUrl = `/uploads/${file.filename}`;

    // Al subir un nuevo voucher, limpiar cualquier motivo de rechazo previo
    await db.query(
      "UPDATE installments SET voucher_url = $1, status = $2, rejection_reason = NULL WHERE id = $3",
      [voucherUrl, "pending", installment_id]
    );

    res.json({ message: "Voucher subido con éxito", voucherUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al subir voucher" });
  }
};

// Obtener installments (filtro opcional por status)
exports.getAll = async (req, res) => {
  try {
    const status = req.query.status; // pending, paid, overdue
    // Auto-marcar como vencidas las cuotas pendientes con due_date pasado
    try {
      await db.query(
        "UPDATE installments SET status = 'overdue' WHERE status = 'pending' AND due_date < CURRENT_DATE"
      );
    } catch (e) {
      console.error("Auto-overdue update failed", e);
    }
    let sql = `SELECT i.*, pp.enrollment_id, e.student_id, s.first_name, s.last_name, s.dni,
      COALESCE(c.name, p.name) as item_name, e.enrollment_type, e.status AS enrollment_status
      FROM installments i
      JOIN payment_plans pp ON i.payment_plan_id = pp.id
      JOIN enrollments e ON pp.enrollment_id = e.id
      LEFT JOIN students s ON e.student_id = s.id
      LEFT JOIN course_offerings co ON e.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN package_offerings po ON e.package_offering_id = po.id
      LEFT JOIN packages p ON po.package_id = p.id`;

    const params = [];
    let paramIndex = 1;
    if (status) {
      if (status === "rejected") {
        sql += " WHERE e.status = 'rechazado'";
      } else {
        sql += ` WHERE i.status = $${paramIndex++}`;
        params.push(status);
      }
    }
    sql += " ORDER BY i.id DESC";

    const result = await db.query(sql, params);
    const rows = result.rows;
    // Derivar status_ui
    const mapped = rows.map((r) => ({
      ...r,
      status_ui: r.enrollment_status === "rechazado" ? "rejected" : r.status,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("Error al obtener installments:", err);
    res.status(500).json({ message: "Error al obtener pagos" });
  }
};

// Rechazar un installment: marcar enrollment como rechazado y la cuota como vencida si corresponde
exports.rejectInstallment = async (req, res) => {
  try {
    const { installment_id, reason } = req.body;
    const result = await db.query(
      `SELECT i.*, pp.id as payment_plan_id, pp.enrollment_id, i.due_date 
       FROM installments i JOIN payment_plans pp ON i.payment_plan_id = pp.id 
       WHERE i.id = $1`,
      [installment_id]
    );
    const rows = result.rows;
    if (!rows.length)
      return res.status(404).json({ message: "Installment no encontrado" });
    const inst = rows[0];
    // marcar cuota como overdue si ya pasó la fecha, o dejar pending sin voucher
    const mark =
      inst.due_date && new Date(inst.due_date) < new Date()
        ? "overdue"
        : "pending";
    await db.query(
      "UPDATE installments SET status = $1, voucher_url = NULL, rejection_reason = $2 WHERE id = $3",
      [mark, reason || null, installment_id]
    );
    // marcar matrícula como rechazada
    await db.query("UPDATE enrollments SET status = $1 WHERE id = $2", [
      "rechazado",
      inst.enrollment_id,
    ]);
    return res.json({ message: "Pago rechazado y matrícula actualizada" });
  } catch (err) {
    console.error("Error al rechazar pago:", err);
    res.status(500).json({ message: "Error al rechazar pago" });
  }
};
