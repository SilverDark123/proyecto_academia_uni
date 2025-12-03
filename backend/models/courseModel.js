// models/courseModel.js
const db = require("../db");

const Course = {
  async create(data) {
    const { name, description, base_price } = data;
    const sql = `INSERT INTO courses (name, description, base_price) VALUES ($1, $2, $3) RETURNING id`;
    const result = await db.query(sql, [name, description, base_price || 0]);
    return { id: result.rows[0].id };
  },

  async getAll() {
    const result = await db.query("SELECT * FROM courses ORDER BY id DESC");
    return result.rows;
  },

  async getOne(id) {
    const result = await db.query("SELECT * FROM courses WHERE id = $1", [id]);
    return result.rows[0];
  },

  async update(id, data) {
    const { name, description, base_price } = data;
    await db.query(
      "UPDATE courses SET name = $1, description = $2, base_price = $3 WHERE id = $4",
      [name, description, base_price || 0, id]
    );
    return true;
  },

  async delete(id) {
    await db.query("DELETE FROM courses WHERE id = $1", [id]);
    return true;
  },

  // helper para obtener cursos con sus offerings y schedules
  async getCoursesWithOfferings() {
    const result = await db.query("SELECT * FROM courses");
    const courses = result.rows;
    for (const course of courses) {
      const offeringsResult = await db.query(
        "SELECT co.*, cyc.name as cycle_name, t.first_name, t.last_name FROM course_offerings co LEFT JOIN cycles cyc ON co.cycle_id = cyc.id LEFT JOIN teachers t ON co.teacher_id = t.id WHERE co.course_id = $1",
        [course.id]
      );
      course.offerings = offeringsResult.rows;
      for (const off of course.offerings) {
        const schedulesResult = await db.query(
          "SELECT * FROM schedules WHERE course_offering_id = $1",
          [off.id]
        );
        off.schedules = schedulesResult.rows;
      }
    }
    return courses;
  },
};

module.exports = Course;
