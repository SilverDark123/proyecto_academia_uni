import asyncpg

async def get_dashboard_data(db: asyncpg.Connection):
    """Get dashboard using the extended view (like Node.js)"""
    dashboard = await db.fetch(
        "SELECT * FROM view_dashboard_admin_extended ORDER BY student_id DESC"
    )
    return [dict(d) for d in dashboard]

async def get_analytics(cycle_id: int, student_id: int, db: asyncpg.Connection):
    """Get analytics summary - matches Node.js logic"""
    sql = "SELECT * FROM analytics_summary WHERE 1=1"
    params = []
    param_index = 1
    
    if cycle_id:
        sql += f" AND cycle_id = ${param_index}"
        params.append(cycle_id)
        param_index += 1
    
    if student_id:
        sql += f" AND student_id = ${param_index}"
        params.append(student_id)
        param_index += 1
    
    sql += " ORDER BY updated_at DESC"
    
    analytics = await db.fetch(sql, *params)
    return [dict(a) for a in analytics]

async def get_notifications(student_id: int, notification_type: str, limit: int, db: asyncpg.Connection):
    """Get notifications - matches Node.js logic"""
    sql = """
        SELECT nl.*, s.first_name, s.last_name, s.dni
        FROM notifications_log nl
        JOIN students s ON nl.student_id = s.id
        WHERE 1=1
    """
    params = []
    param_index = 1
    
    if student_id:
        sql += f" AND nl.student_id = ${param_index}"
        params.append(student_id)
        param_index += 1
    
    if notification_type:
        sql += f" AND nl.type = ${param_index}"
        params.append(notification_type)
        param_index += 1
    
    sql += f" ORDER BY nl.sent_at DESC LIMIT ${param_index}"
    params.append(limit if limit else 50)
    
    notifications = await db.fetch(sql, *params)
    return [dict(n) for n in notifications]

async def get_analytics_old(cycle_id: int, db: asyncpg.Connection):
    analytics = await db.fetch(
        """SELECT 
            cyc.id as cycle_id,
            cyc.name as cycle_name,
            COUNT(DISTINCT e.id) as total_enrollments,
            COUNT(DISTINCT CASE WHEN e.status = 'aceptado' THEN e.id END) as accepted_enrollments,
            COALESCE(SUM(pp.total_amount), 0) as total_debt,
            COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(pp.total_amount) - SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as pending_amount,
            COUNT(DISTINCT CASE WHEN a.status = 'presente' THEN a.id END) as total_attendance,
            COUNT(DISTINCT CASE WHEN a.status = 'ausente' THEN a.id END) as total_absences,
            CASE 
                WHEN COUNT(DISTINCT CASE WHEN a.status = 'ausente' THEN a.id END) >= 3 THEN 'high'
                WHEN COUNT(DISTINCT CASE WHEN a.status = 'ausente' THEN a.id END) > 0 THEN 'medium'
                ELSE 'low'
            END as absence_alert_level
        FROM cycles cyc
        LEFT JOIN course_offerings co ON co.cycle_id = cyc.id
        LEFT JOIN package_offerings po ON po.cycle_id = cyc.id
        LEFT JOIN enrollments e ON e.course_offering_id = co.id OR e.package_offering_id = po.id
        LEFT JOIN payment_plans pp ON pp.enrollment_id = e.id
        LEFT JOIN installments i ON i.payment_plan_id = pp.id
        LEFT JOIN schedules sch ON sch.course_offering_id = co.id
        LEFT JOIN attendance a ON a.schedule_id = sch.id AND a.student_id = e.student_id
        WHERE cyc.id = $1
        GROUP BY cyc.id, cyc.name""",
        cycle_id
    )
    return [dict(a) for a in analytics]

async def get_general_stats(db: asyncpg.Connection):
    stats = {}
    
    # Total students
    result = await db.fetchrow("SELECT COUNT(*) as count FROM students")
    stats['total_students'] = result['count']
    
    # Total teachers
    result = await db.fetchrow("SELECT COUNT(*) as count FROM teachers")
    stats['total_teachers'] = result['count']
    
    # Total courses
    result = await db.fetchrow("SELECT COUNT(*) as count FROM courses")
    stats['total_courses'] = result['count']
    
    # Active enrollments
    result = await db.fetchrow("SELECT COUNT(*) as count FROM enrollments WHERE status = 'aceptado'")
    stats['active_enrollments'] = result['count']
    
    # Pending enrollments
    result = await db.fetchrow("SELECT COUNT(*) as count FROM enrollments WHERE status = 'pendiente'")
    stats['pending_enrollments'] = result['count']
    
    # Total revenue
    result = await db.fetchrow("SELECT COALESCE(SUM(amount), 0) as total FROM installments WHERE status = 'paid'")
    stats['total_revenue'] = float(result['total'])
    
    # Pending payments
    result = await db.fetchrow(
        "SELECT COALESCE(SUM(amount), 0) as total FROM installments WHERE status = 'pending'"
    )
    stats['pending_payments'] = float(result['total'])
    
    return stats
