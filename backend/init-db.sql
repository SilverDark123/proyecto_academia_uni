-- ===========================================================
-- CREAR BASE DE DATOS
-- ===========================================================
-- PostgreSQL crea la base de datos automáticamente con POSTGRES_DB
-- Solo necesitamos asegurarnos de estar en la base de datos correcta

-- ===========================================================
-- CREAR TIPOS ENUM
-- ===========================================================
CREATE TYPE user_role AS ENUM ('admin', 'student', 'teacher');
CREATE TYPE cycle_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE enrollment_type AS ENUM ('course', 'package');
CREATE TYPE enrollment_status AS ENUM ('pendiente', 'aceptado', 'rechazado', 'cancelado');
CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE attendance_status AS ENUM ('presente', 'ausente');
CREATE TYPE notification_type AS ENUM ('absences_3', 'payment_due', 'other');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE day_of_week AS ENUM ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo');

-- ===========================================================
-- TABLAS DE USUARIOS Y DOCENTES
-- ===========================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  related_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  dni VARCHAR(15) UNIQUE NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(100),
  specialization VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================
-- TABLA DE ESTUDIANTES
-- ===========================================================
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  dni VARCHAR(15) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(15),
  parent_name VARCHAR(100),
  parent_phone VARCHAR(15),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================
-- TABLA DE CICLOS
-- ===========================================================
CREATE TABLE cycles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months SMALLINT,
  status cycle_status DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================
-- TABLAS DE CURSOS Y PAQUETES
-- ===========================================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE package_courses (
  id SERIAL PRIMARY KEY,
  package_id INT NOT NULL,
  course_id INT NOT NULL,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ===========================================================
-- CURSOS Y PAQUETES OFERTADOS POR CICLO
-- ===========================================================
CREATE TABLE course_offerings (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL,
  cycle_id INT NOT NULL,
  group_label VARCHAR(50),
  teacher_id INT,
  price_override DECIMAL(10,2) DEFAULT NULL,
  capacity INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE package_offerings (
  id SERIAL PRIMARY KEY,
  package_id INT NOT NULL,
  cycle_id INT NOT NULL,
  group_label VARCHAR(50),
  price_override DECIMAL(10,2) DEFAULT NULL,
  capacity INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE
);

-- ===========================================================
-- HORARIOS
-- ===========================================================
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  course_offering_id INT NOT NULL,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  classroom VARCHAR(50),
  FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE
);

-- ===========================================================
-- MATRÍCULAS
-- ===========================================================
CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  course_offering_id INT DEFAULT NULL,
  package_offering_id INT DEFAULT NULL,
  enrollment_type enrollment_type NOT NULL,
  status enrollment_status DEFAULT 'pendiente',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_by_admin_id INT DEFAULT NULL,
  accepted_at TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE,
  FOREIGN KEY (package_offering_id) REFERENCES package_offerings(id) ON DELETE CASCADE
);

-- ===========================================================
-- PLANES DE PAGO Y CUOTAS
-- ===========================================================
CREATE TABLE payment_plans (
  id SERIAL PRIMARY KEY,
  enrollment_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  installments INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);

CREATE TABLE installments (
  id SERIAL PRIMARY KEY,
  payment_plan_id INT NOT NULL,
  installment_number SMALLINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP NULL,
  status installment_status DEFAULT 'pending',
  voucher_url TEXT,
  rejection_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id) ON DELETE CASCADE
);

-- ===========================================================
-- ASISTENCIAS
-- ===========================================================
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  schedule_id INT NOT NULL,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

-- ===========================================================
-- NOTIFICACIONES
-- ===========================================================
CREATE TABLE notifications_log (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  parent_phone VARCHAR(20),
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status notification_status DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ===========================================================
-- TABLA ANALÍTICA
-- ===========================================================
CREATE TABLE analytics_summary (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  cycle_id INT NOT NULL,
  attendance_pct DECIMAL(5,2) DEFAULT 0,
  total_paid DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (cycle_id) REFERENCES cycles(id)
);

CREATE TABLE package_offering_courses (
  id SERIAL PRIMARY KEY,
  package_offering_id INT NOT NULL,
  course_offering_id INT NOT NULL,
  CONSTRAINT uq_poc UNIQUE (package_offering_id, course_offering_id),
  FOREIGN KEY (package_offering_id) REFERENCES package_offerings(id) ON DELETE CASCADE,
  FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE
);

-- ===========================================================
-- ÍNDICES CLAVE
-- ===========================================================
CREATE INDEX idx_enroll_student ON enrollments(student_id);
CREATE INDEX idx_offering_cycle ON course_offerings(cycle_id);
CREATE INDEX idx_installment_due ON installments(due_date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_poc_package_offering ON package_offering_courses(package_offering_id);
CREATE INDEX idx_poc_course_offering ON package_offering_courses(course_offering_id);

-- ===========================================================
-- FUNCIÓN PARA ACTUALIZAR updated_at
-- ===========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en analytics_summary
CREATE TRIGGER trg_analytics_summary_updated_at
BEFORE UPDATE ON analytics_summary
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================
-- VISTA ADMINISTRATIVA EXTENDIDA
-- ===========================================================
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

  MIN(CASE WHEN i.status = 'pending' THEN i.due_date END) AS next_due_date,

  MAX(nl.sent_at) AS last_notification_date,

  MAX(
    CASE 
      WHEN nl.type = 'absences_3' THEN 'Aviso por faltas'
      WHEN nl.type = 'payment_due' THEN 'Aviso por deuda'
      ELSE 'Otro'
    END
  ) AS last_notification_type,

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
    WHEN MAX(a.attendance_pct) < 75 THEN 'Baja asistencia'
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

-- ===========================================================
-- FUNCIONES PARA TRIGGERS
-- ===========================================================

-- Función para actualizar resumen de asistencia
CREATE OR REPLACE FUNCTION update_attendance_summary()
RETURNS TRIGGER AS $$
DECLARE
  total_classes INT;
  attended_classes INT;
  attendance_rate DECIMAL(5,2);
  v_cycle INT;
BEGIN
  -- Obtener el ciclo
  SELECT co.cycle_id INTO v_cycle
  FROM schedules s
  JOIN course_offerings co ON co.id = s.course_offering_id
  WHERE s.id = NEW.schedule_id
  LIMIT 1;

  -- Contar total de clases
  SELECT COUNT(*) INTO total_classes
  FROM attendance a
  JOIN schedules s2 ON s2.id = a.schedule_id
  JOIN course_offerings co2 ON co2.id = s2.course_offering_id
  WHERE a.student_id = NEW.student_id AND co2.cycle_id = v_cycle;

  -- Contar clases asistidas
  SELECT COUNT(*) INTO attended_classes
  FROM attendance a
  JOIN schedules s3 ON s3.id = a.schedule_id
  JOIN course_offerings co3 ON co3.id = s3.course_offering_id
  WHERE a.student_id = NEW.student_id AND co3.cycle_id = v_cycle AND a.status = 'presente';

  -- Calcular porcentaje
  attendance_rate := (attended_classes::DECIMAL / total_classes::DECIMAL) * 100;

  -- Insertar o actualizar
  INSERT INTO analytics_summary (student_id, cycle_id, attendance_pct, total_paid)
  VALUES (NEW.student_id, v_cycle, attendance_rate, 0)
  ON CONFLICT (student_id, cycle_id) 
  DO UPDATE SET 
    attendance_pct = attendance_rate, 
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar resumen de pagos
CREATE OR REPLACE FUNCTION update_payment_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_student INT;
  v_cycle INT;
  v_total DECIMAL(10,2);
BEGIN
  -- Obtener estudiante y ciclo
  SELECT e.student_id, 
         COALESCE(co.cycle_id, po.cycle_id)
  INTO v_student, v_cycle
  FROM payment_plans pp
  JOIN enrollments e ON e.id = pp.enrollment_id
  LEFT JOIN course_offerings co ON e.course_offering_id = co.id
  LEFT JOIN package_offerings po ON e.package_offering_id = po.id
  WHERE pp.id = NEW.payment_plan_id;

  -- Calcular total pagado
  SELECT SUM(amount)
  INTO v_total
  FROM installments i
  WHERE i.payment_plan_id = NEW.payment_plan_id AND i.status = 'paid';

  -- Insertar o actualizar
  INSERT INTO analytics_summary (student_id, cycle_id, attendance_pct, total_paid)
  VALUES (v_student, v_cycle, 0, v_total)
  ON CONFLICT (student_id, cycle_id)
  DO UPDATE SET 
    total_paid = v_total, 
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================
-- TRIGGERS
-- ===========================================================

-- Trigger para actualizar asistencia
CREATE TRIGGER trg_update_attendance_summary
AFTER INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_attendance_summary();

-- Trigger para actualizar pagos
CREATE TRIGGER trg_update_payment_summary
AFTER UPDATE ON installments
FOR EACH ROW
EXECUTE FUNCTION update_payment_summary();

-- ===========================================================
-- NOTA SOBRE EVENTOS PROGRAMADOS
-- ===========================================================
-- PostgreSQL NO tiene eventos programados como MySQL.
-- Para implementar notificaciones automáticas, tienes 3 opciones:
--
-- 1. Usar pg_cron (extensión de PostgreSQL):
--    CREATE EXTENSION pg_cron;
--    SELECT cron.schedule('notify-absences', '0 8 * * *', $$[SQL QUERY]$$);
--
-- 2. Usar un cron job del sistema operativo que ejecute scripts SQL
--
-- 3. Implementar la lógica en tu aplicación backend (RECOMENDADO)
--    - Crear endpoints o scheduled jobs en Node.js
--    - Usar librerías como node-cron o node-schedule
--
-- Por ahora, las funciones de notificación se implementarán en el backend.

-- ===========================================================
-- AGREGAR CONSTRAINT ÚNICO PARA analytics_summary
-- ===========================================================
-- Necesario para ON CONFLICT en los triggers
ALTER TABLE analytics_summary 
ADD CONSTRAINT uq_analytics_student_cycle UNIQUE (student_id, cycle_id);
