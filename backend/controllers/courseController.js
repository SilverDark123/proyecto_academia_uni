// controllers/courseController.js
const Course = require("../models/courseModel");
const CourseOffering = require("../models/courseOfferingModel");
const db = require("../db");

exports.getAll = async (req, res) => {
  try {
    const courses = await Course.getCoursesWithOfferings();
    res.json(courses);
  } catch (err) {
    console.error("Error al obtener cursos:", err);
    res.status(500).json({ message: "Error al obtener los cursos" });
  }
};

exports.create = async (req, res) => {
  try {
    const courseData = req.body;
    const result = await Course.create(courseData);
    res
      .status(201)
      .json({ message: "Curso creado correctamente", id: result.id });
  } catch (err) {
    console.error("Error al crear curso:", err);
    res.status(500).json({ message: "Error al crear el curso" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const course = await Course.getOne(req.params.id);
    if (!course)
      return res.status(404).json({ message: "Curso no encontrado" });
    // obtener offerings y sus schedules
    const offerings = await CourseOffering.getByCourse(course.id);
    for (const off of offerings) {
      const schedulesResult = await db.query(
        "SELECT * FROM schedules WHERE course_offering_id = $1",
        [off.id]
      );
      off.schedules = schedulesResult.rows;
    }
    course.offerings = offerings;
    res.json(course);
  } catch (err) {
    console.error("Error al obtener curso:", err);
    res.status(500).json({ message: "Error al obtener el curso" });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    await Course.update(id, data);
    res.json({ message: "Curso actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar curso:", err);
    res.status(500).json({ message: "Error al actualizar el curso" });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    await Course.delete(id);
    res.json({ message: "Curso eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar curso:", err);
    res.status(500).json({ message: "Error al eliminar el curso" });
  }
};

// Offerings endpoints
exports.createOffering = async (req, res) => {
  try {
    const data = req.body;
    const result = await CourseOffering.create(data);
    res.status(201).json({ message: "Offering creado", id: result.id });
  } catch (err) {
    console.error("Error creando offering:", err);
    res.status(500).json({ message: "Error creando offering" });
  }
};

exports.updateOffering = async (req, res) => {
  try {
    await CourseOffering.update(req.params.id, req.body);
    res.json({ message: "Offering actualizado" });
  } catch (err) {
    console.error("Error actualizando offering:", err);
    res.status(500).json({ message: "Error actualizando offering" });
  }
};

exports.deleteOffering = async (req, res) => {
  try {
    await CourseOffering.delete(req.params.id);
    res.json({ message: "Offering eliminado" });
  } catch (err) {
    console.error("Error eliminando offering:", err);
    res.status(500).json({ message: "Error eliminando offering" });
  }
};
