-- ===========================================================
-- SCRIPT PARA CORREGIR LA VISTA DEL DASHBOARD ADMIN (POSTGRESQL)
-- ===========================================================

-- Eliminar la vista existente
DROP VIEW IF EXISTS view_dashboard_admin_extended;

-- Crear la vista corregida
CREATE OR REPLACE VIEW view_dashboard_admin_extended AS
SELECT
  s.id AS student_id,
  CONCAT(s.first_name, ' ', s.last_name) AS student_name,
  s.dni,
  s.phone,
  s.parent_name,
  s.parent_phone,

  c.id AS cycle_id,
  c.name AS cycle_name,
  c.start_date,
  c.end_date,

  e.id AS enrollment_id,
  e.enrollment_type,
  e.status AS enrollment_status,

  COALESCE(co.group_label, po.group_label) AS grupo,
  COALESCE(courses.name, packages.name) AS enrolled_item,

  MAX(a.attendance_pct) AS attendance_pct,
  MAX(a.total_paid) AS total_paid,

  ROUND(
    COALESCE(
      CASE 
        WHEN MAX(pp.total_amount) IS NOT NULL THEN 
          MAX(pp.total_amount) - COALESCE(MAX(a.total_paid), 0)
        ELSE 0
      END, 0
    ), 2
  ) AS total_pending,

  COUNT(DISTINCT i.id) AS total_installments,
  SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) AS paid_installments,
  SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) AS pending_installments,

  -- Próxima cuota por vencer
  MIN(CASE WHEN i.status = 'pending' THEN i.due_date END) AS next_due_date,

  -- Última notificación enviada (cualquiera)
  MAX(nl.sent_at) AS last_notification_date,

  -- Tipo de última notificación
  MAX(
    CASE 
      WHEN nl.type = 'absences_3' THEN 'Aviso por faltas'
      WHEN nl.type = 'payment_due' THEN 'Aviso por deuda'
      ELSE 'Otro'
    END
  ) AS last_notification_type,

  -- Estado de alerta resumido
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM notifications_log nl2
      WHERE nl2.student_id = s.id
      AND nl2.type = 'payment_due'
      AND DATE(nl2.sent_at) >= CURRENT_DATE - INTERVAL '7 days'
    ) THEN 'Deuda reciente notificada'
    WHEN EXISTS (
      SELECT 1
      FROM notifications_log nl3
      WHERE nl3.student_id = s.id
      AND nl3.type = 'absences_3'
      AND DATE(nl3.sent_at) >= CURRENT_DATE - INTERVAL '7 days'
    ) THEN 'Faltas recientes notificadas'
    WHEN ROUND(
      COALESCE(
        CASE 
          WHEN MAX(pp.total_amount) IS NOT NULL THEN 
            MAX(pp.total_amount) - COALESCE(MAX(a.total_paid), 0)
          ELSE 0
        END, 0
      ), 2
    ) > 0 THEN 'Con deuda pendiente'
    WHEN MAX(a.attendance_pct) < 75 AND c.start_date <= CURRENT_DATE THEN 'Baja asistencia'
    ELSE 'En regla'
  END AS alert_status

FROM enrollments e
JOIN students s ON s.id = e.student_id
LEFT JOIN course_offerings co ON e.course_offering_id = co.id
LEFT JOIN package_offerings po ON e.package_offering_id = po.id
LEFT JOIN courses ON courses.id = co.course_id
LEFT JOIN packages ON packages.id = po.package_id
LEFT JOIN cycles c ON c.id = COALESCE(co.cycle_id, po.cycle_id)
LEFT JOIN analytics_summary a ON a.student_id = s.id AND a.cycle_id = c.id
LEFT JOIN payment_plans pp ON pp.enrollment_id = e.id
LEFT JOIN installments i ON i.payment_plan_id = pp.id
LEFT JOIN notifications_log nl ON nl.student_id = s.id
GROUP BY 
  s.id, s.first_name, s.last_name, s.dni, s.phone, s.parent_name, s.parent_phone,
  c.id, c.name, c.start_date, c.end_date,
  e.id, e.enrollment_type, e.status,
  co.group_label, po.group_label,
  courses.name, packages.name;
