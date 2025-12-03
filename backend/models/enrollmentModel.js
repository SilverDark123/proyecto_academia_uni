// models/enrollmentModel.js
const db = require("../db");

const Enrollment = {
  // items: [{ type: 'course'|'package', id: <offering_id> }]
  async createForStudent(studentId, items) {
    const created = [];

    for (const item of items) {
      const { type, id: offering_id } = item;

      // Regla 1: evitar duplicados exactos
      if (type === "course") {
        const result = await db.query(
          "SELECT id FROM enrollments WHERE student_id = $1 AND course_offering_id = $2 AND enrollment_type = $3 AND status = $4 LIMIT 1",
          [studentId, offering_id, "course", "aceptado"]
        );
        if (result.rows.length) {
          throw new Error("El estudiante ya está matriculado en este curso");
        }
      } else if (type === "package") {
        const result = await db.query(
          "SELECT id FROM enrollments WHERE student_id = $1 AND package_offering_id = $2 AND enrollment_type = $3 AND status = $4 LIMIT 1",
          [studentId, offering_id, "package", "aceptado"]
        );
        if (result.rows.length) {
          throw new Error("El estudiante ya está matriculado en este paquete");
        }
      }

      // Obtener contexto necesario
      let cycle_id = null;
      if (type === "course") {
        const coCtxResult = await db.query(
          "SELECT course_id, cycle_id FROM course_offerings WHERE id = $1 LIMIT 1",
          [offering_id]
        );
        if (!coCtxResult.rows.length)
          throw new Error("Course offering no encontrado");
        cycle_id = coCtxResult.rows[0].cycle_id;

        // Regla 2: si ya tiene paquete que incluye este course_offering, bloquear
        // Intentar vía tabla de mapeo específica package_offering_courses
        const pkgCoverExactResult = await db.query(
          `SELECT e.id
           FROM enrollments e
           JOIN package_offering_courses poc ON poc.package_offering_id = e.package_offering_id
           WHERE e.student_id = $1
             AND e.enrollment_type = 'package'
             AND e.status = 'aceptado'
             AND poc.course_offering_id = $2
           LIMIT 1`,
          [studentId, offering_id]
        );
        if (pkgCoverExactResult.rows.length) {
          throw new Error(
            "Ya existe una matrícula de paquete que cubre este curso"
          );
        }
        // Fallback: si no existe la tabla o no hay mapeo, usar lógica por curso/ciclo
        try {
          const pkgCoverFallbackResult = await db.query(
            `SELECT e.id
             FROM enrollments e
             JOIN package_offerings po ON e.package_offering_id = po.id
             JOIN packages pk ON po.package_id = pk.id
             JOIN package_courses pc ON pc.package_id = pk.id
             JOIN course_offerings co ON co.id = $1
             WHERE e.student_id = $2
               AND e.enrollment_type = 'package'
               AND e.status = 'aceptado'
               AND po.cycle_id = co.cycle_id
               AND pc.course_id = co.course_id
             LIMIT 1`,
            [offering_id, studentId]
          );
          if (pkgCoverFallbackResult.rows.length) {
            throw new Error(
              "Ya existe una matrícula de paquete que cubre este curso"
            );
          }
        } catch (_) {
          // Ignorar si el fallback falla por esquema diferente
        }
      } else if (type === "package") {
        const poCtxResult = await db.query(
          "SELECT package_id, cycle_id FROM package_offerings WHERE id = $1 LIMIT 1",
          [offering_id]
        );
        if (!poCtxResult.rows.length)
          throw new Error("Package offering no encontrado");
        const { package_id } = poCtxResult.rows[0];
        cycle_id = poCtxResult.rows[0].cycle_id;

        // Regla 3: si ya tiene cursos individuales que están en este paquete (mapeo exacto), bloquear
        const conflictExactResult = await db.query(
          `SELECT e.id
           FROM enrollments e
           JOIN package_offering_courses poc ON poc.course_offering_id = e.course_offering_id
           WHERE e.student_id = $1
             AND e.enrollment_type = 'course'
             AND e.status = 'aceptado'
             AND poc.package_offering_id = $2
           LIMIT 1`,
          [studentId, offering_id]
        );
        if (conflictExactResult.rows.length) {
          throw new Error(
            "El estudiante ya está matriculado en cursos que pertenecen a este paquete"
          );
        }
        // Fallback por paquete/ciclo si no hay mapeo exacto
        try {
          const conflictCoursesResult = await db.query(
            `SELECT e.id
             FROM enrollments e
             JOIN course_offerings co ON e.course_offering_id = co.id
             JOIN package_courses pc ON pc.course_id = co.course_id
             WHERE e.student_id = $1
               AND e.enrollment_type = 'course'
               AND e.status = 'aceptado'
               AND co.cycle_id = $2
               AND pc.package_id = $3
             LIMIT 1`,
            [studentId, cycle_id, package_id]
          );
          if (conflictCoursesResult.rows.length) {
            throw new Error(
              "El estudiante ya está matriculado en cursos que pertenecen a este paquete"
            );
          }
        } catch (_) {
          // Ignorar si el fallback falla
        }
      }

      // insertar enrollment con referencia a course_offering o package_offering
      const course_offering_id = type === "course" ? offering_id : null;
      const package_offering_id = type === "package" ? offering_id : null;

      const res = await db.query(
        "INSERT INTO enrollments (student_id, course_offering_id, package_offering_id, enrollment_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [studentId, course_offering_id, package_offering_id, type, "pendiente"]
      );

      const enrollmentId = res.rows[0].id;

      // calcular monto según oferta (usar override si existe)
      let amount = 0;
      if (type === "course") {
        const rowsResult = await db.query(
          `SELECT COALESCE(co.price_override, c.base_price) as price
           FROM course_offerings co
           JOIN courses c ON co.course_id = c.id
           WHERE co.id = $1`,
          [offering_id]
        );
        amount = rowsResult.rows.length ? Number(rowsResult.rows[0].price) : 0;
      } else if (type === "package") {
        const rowsResult = await db.query(
          `SELECT COALESCE(po.price_override, p.base_price) as price
           FROM package_offerings po
           JOIN packages p ON po.package_id = p.id
           WHERE po.id = $1`,
          [offering_id]
        );
        amount = rowsResult.rows.length ? Number(rowsResult.rows[0].price) : 0;
      }

      // crear payment_plan y una cuota (installment) por ahora en una sola cuota
      const ppResult = await db.query(
        "INSERT INTO payment_plans (enrollment_id, total_amount, installments) VALUES ($1, $2, $3) RETURNING id",
        [enrollmentId, amount, 1]
      );

      const paymentPlanId = ppResult.rows[0].id;

      // crear una cuota única con due_date a 7 días
      const instResult = await db.query(
        "INSERT INTO installments (payment_plan_id, installment_number, amount, due_date, status) VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '7 days', $4) RETURNING id",
        [paymentPlanId, 1, amount, "pending"]
      );

      // Entrada base para esta matrícula
      const baseEntry = {
        enrollmentId,
        type,
        offering_id,
        amount,
        payment_plan_id: paymentPlanId,
        installment_id: instResult.rows[0].id,
      };
      created.push(baseEntry);

      // Si es paquete, crear también matrículas por course_offerings exactos del paquete para que los docentes vean a los alumnos
      // y guardar la lista de cursos en baseEntry.courses para mostrar al alumno el detalle del paquete.
      if (type === "package") {
        baseEntry.courses = [];
        try {
          // 1) Intentar obtener mapeo exacto: course_offerings vinculados al package_offering
          const pocRowsResult = await db.query(
            "SELECT course_offering_id FROM package_offering_courses WHERE package_offering_id = $1",
            [offering_id]
          );
          const pocRows = pocRowsResult.rows;

          if (pocRows.length) {
            for (const row of pocRows) {
              const coId = row.course_offering_id;
              const existsCourseForPkgResult = await db.query(
                "SELECT id FROM enrollments WHERE student_id = $1 AND course_offering_id = $2 AND enrollment_type = $3 AND status != $4 LIMIT 1",
                [studentId, coId, "course", "cancelado"]
              );
              if (existsCourseForPkgResult.rows.length) continue;
              const resCourse = await db.query(
                "INSERT INTO enrollments (student_id, course_offering_id, package_offering_id, enrollment_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [studentId, coId, offering_id, "course", "pendiente"]
              );
              created.push({
                enrollmentId: resCourse.rows[0].id,
                type: "course",
                offering_id: coId,
              });

              // Agregar info de curso + grupo a la descripción del paquete
              try {
                const courseInfoResult = await db.query(
                  `SELECT c.name, co.group_label
                   FROM course_offerings co
                   JOIN courses c ON co.course_id = c.id
                   WHERE co.id = $1
                   LIMIT 1`,
                  [coId]
                );
                if (courseInfoResult.rows.length) {
                  baseEntry.courses.push({
                    name: courseInfoResult.rows[0].name,
                    group: courseInfoResult.rows[0].group_label || null,
                  });
                }
              } catch (_) {
                // No bloquear por fallos de descripción
              }
            }
          } else {
            // 2) Fallback: comportamiento anterior basado en package_courses y ciclo
            const poRowsResult = await db.query(
              "SELECT package_id, cycle_id FROM package_offerings WHERE id = $1 LIMIT 1",
              [offering_id]
            );
            if (poRowsResult.rows.length) {
              const { package_id, cycle_id } = poRowsResult.rows[0];
              const pcRowsResult = await db.query(
                "SELECT course_id FROM package_courses WHERE package_id = $1",
                [package_id]
              );
              const pcRows = pcRowsResult.rows;
              for (const pc of pcRows) {
                const courseId = pc.course_id;
                const coRowsResult = await db.query(
                  "SELECT id FROM course_offerings WHERE course_id = $1 AND cycle_id = $2 ORDER BY id ASC LIMIT 1",
                  [courseId, cycle_id]
                );
                if (coRowsResult.rows.length) {
                  const coId = coRowsResult.rows[0].id;
                  const existsCourseForPkgResult = await db.query(
                    "SELECT id FROM enrollments WHERE student_id = $1 AND course_offering_id = $2 AND enrollment_type = $3 AND status != $4 LIMIT 1",
                    [studentId, coId, "course", "cancelado"]
                  );
                  if (existsCourseForPkgResult.rows.length) continue;
                  const resCourse = await db.query(
                    "INSERT INTO enrollments (student_id, course_offering_id, package_offering_id, enrollment_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                    [studentId, coId, offering_id, "course", "pendiente"]
                  );
                  created.push({
                    enrollmentId: resCourse.rows[0].id,
                    type: "course",
                    offering_id: coId,
                  });

                  // Agregar info de curso + grupo a la descripción del paquete
                  try {
                    const courseInfoResult = await db.query(
                      `SELECT c.name, co.group_label
                       FROM course_offerings co
                       JOIN courses c ON co.course_id = c.id
                       WHERE co.id = $1
                       LIMIT 1`,
                      [coId]
                    );
                    if (courseInfoResult.rows.length) {
                      baseEntry.courses.push({
                        name: courseInfoResult.rows[0].name,
                        group: courseInfoResult.rows[0].group_label || null,
                      });
                    }
                  } catch (_) {
                    // No bloquear por fallos de descripción
                  }
                }
              }
            }
          }
        } catch (expErr) {
          // No bloquear la creación por fallos en la expansión; registrar y continuar
          console.error("Error expandiendo paquete a cursos:", expErr);
        }
      }
    }

    return created;
  },

  async getByStudent(studentId) {
    // devolver información de la matrícula junto con info del item y estado del payment plan
    const result = await db.query(
      `SELECT e.*,
        COALESCE(c.name, p.name) as item_name,
        COALESCE(COALESCE(co.price_override, c.base_price), COALESCE(po.price_override, p.base_price)) as item_price,
        pp.id as payment_plan_id, pp.total_amount, pp.installments as total_installments,
        COALESCE(cyc.name, cyc2.name) as cycle_name,
        COALESCE(cyc.start_date, cyc2.start_date) as cycle_start_date,
        COALESCE(cyc.end_date, cyc2.end_date) as cycle_end_date,
        (
          SELECT STRING_AGG(
                   c2.name || 
                   CASE
                     WHEN co2.group_label IS NOT NULL AND co2.group_label <> ''
                       THEN ' (Grupo ' || co2.group_label || ')'
                     ELSE ''
                   END,
                   ', '
                 )
          FROM enrollments e2
          JOIN course_offerings co2 ON e2.course_offering_id = co2.id
          JOIN courses c2 ON co2.course_id = c2.id
          WHERE e2.student_id = e.student_id
            AND e2.enrollment_type = 'course'
            AND e2.status != 'cancelado'
            AND e2.package_offering_id = e.package_offering_id
        ) AS package_courses_summary
      FROM enrollments e
      LEFT JOIN course_offerings co ON e.course_offering_id = co.id
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN cycles cyc ON co.cycle_id = cyc.id
      LEFT JOIN package_offerings po ON e.package_offering_id = po.id
      LEFT JOIN packages p ON po.package_id = p.id
      LEFT JOIN cycles cyc2 ON po.cycle_id = cyc2.id
      LEFT JOIN payment_plans pp ON pp.enrollment_id = e.id
      WHERE e.student_id = $1
      ORDER BY e.registered_at DESC`,
      [studentId]
    );

    const rows = result.rows;

    // Para cada enrollment, obtener sus installments
    for (const enrollment of rows) {
      if (enrollment.payment_plan_id) {
        const installmentsResult = await db.query(
          "SELECT * FROM installments WHERE payment_plan_id = $1 ORDER BY installment_number",
          [enrollment.payment_plan_id]
        );
        enrollment.installments = installmentsResult.rows;
      } else {
        enrollment.installments = [];
      }
    }

    return rows;
  },

  async cancelForStudent(studentId, enrollmentId) {
    // Verificar que la matrícula pertenece al estudiante y está pendiente
    const result = await db.query(
      "SELECT id, status, enrollment_type, package_offering_id FROM enrollments WHERE id = $1 AND student_id = $2 LIMIT 1",
      [enrollmentId, studentId]
    );

    if (!result.rows.length) {
      throw new Error("Matrícula no encontrada");
    }

    const enrollment = result.rows[0];
    if (enrollment.status !== "pendiente") {
      throw new Error("Solo se pueden cancelar matrículas pendientes");
    }

    // Verificar que no existan cuotas pagadas ni vouchers subidos en la matrícula principal
    const ppResult = await db.query(
      "SELECT id FROM payment_plans WHERE enrollment_id = $1 LIMIT 1",
      [enrollmentId]
    );

    if (ppResult.rows.length) {
      const paymentPlanId = ppResult.rows[0].id;

      const paidResult = await db.query(
        "SELECT COUNT(*) AS cnt FROM installments WHERE payment_plan_id = $1 AND (status = $2 OR voucher_url IS NOT NULL)",
        [paymentPlanId, "paid"]
      );

      if (parseInt(paidResult.rows[0].cnt) > 0) {
        throw new Error(
          "No se puede cancelar una matrícula con pagos o vouchers registrados"
        );
      }
    }

    // Si es una matrícula de paquete, también eliminar las matrículas de cursos asociadas a ese paquete
    const idsToDelete = [enrollmentId];

    if (
      enrollment.enrollment_type === "package" &&
      enrollment.package_offering_id
    ) {
      const childEnrollmentsResult = await db.query(
        "SELECT id FROM enrollments WHERE student_id = $1 AND enrollment_type = $2 AND package_offering_id = $3 AND status = $4 ",
        [studentId, "course", enrollment.package_offering_id, "pendiente"]
      );

      for (const child of childEnrollmentsResult.rows) {
        idsToDelete.push(child.id);
      }
    }

    // Eliminar planes de pago y cuotas asociados a todas las matrículas a borrar
    for (const id of idsToDelete) {
      const ppDelResult = await db.query(
        "SELECT id FROM payment_plans WHERE enrollment_id = $1 LIMIT 1",
        [id]
      );

      if (ppDelResult.rows.length) {
        const planId = ppDelResult.rows[0].id;
        await db.query("DELETE FROM installments WHERE payment_plan_id = $1", [
          planId,
        ]);
        await db.query("DELETE FROM payment_plans WHERE id = $1", [planId]);
      }
    }

    // Eliminar las matrículas en sí
    await db.query("DELETE FROM enrollments WHERE id = ANY($1)", [idsToDelete]);

    return { message: "Matrícula cancelada correctamente" };
  },
};

module.exports = Enrollment;
