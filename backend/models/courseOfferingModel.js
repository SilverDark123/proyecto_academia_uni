// models/courseOfferingModel.js
const db = require("../db");

const CourseOffering = {
  async create(data) {
    const {
      course_id,
      cycle_id,
      group_label,
      teacher_id,
      price_override,
      capacity,
    } = data;
    const result = await db.query(
      `INSERT INTO course_offerings (course_id, cycle_id, group_label, teacher_id, price_override, capacity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        course_id,
        cycle_id,
        group_label,
        teacher_id || null,
        price_override || null,
        capacity || null,
      ]
    );
    return { id: result.rows[0].id };
  },

  async getByCourse(courseId) {
    const result = await db.query(
      "SELECT co.*, t.first_name, t.last_name, c.name as course_name FROM course_offerings co LEFT JOIN teachers t ON co.teacher_id = t.id JOIN courses c ON co.course_id = c.id WHERE co.course_id = $1",
      [courseId]
    );
    return result.rows;
  },

  async getAll() {
    const result = await db.query(
      "SELECT co.*, c.name as course_name, t.first_name, t.last_name, cyc.name as cycle_name FROM course_offerings co LEFT JOIN teachers t ON co.teacher_id = t.id JOIN courses c ON co.course_id = c.id LEFT JOIN cycles cyc ON co.cycle_id = cyc.id ORDER BY co.id DESC"
    );
    return result.rows;
  },

  async update(id, data) {
    const { group_label, teacher_id, price_override, capacity, cycle_id } =
      data;
    await db.query(
      "UPDATE course_offerings SET group_label = $1, teacher_id = $2, price_override = $3, capacity = $4, cycle_id = $5 WHERE id = $6",
      [
        group_label,
        teacher_id || null,
        price_override || null,
        capacity || null,
        cycle_id || null,
        id,
      ]
    );
    return true;
  },

  async delete(id) {
    await db.query("DELETE FROM course_offerings WHERE id = $1", [id]);
    return true;
  },
};

module.exports = CourseOffering;
