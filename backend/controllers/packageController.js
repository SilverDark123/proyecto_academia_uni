// controllers/packageController.js
const db = require("../db");
const PackageOffering = require("../models/packageOfferingModel");

exports.create = async (req, res) => {
  try {
    const { name, description, base_price } = req.body;
    const result = await db.query(
      "INSERT INTO packages (name, description, base_price) VALUES ($1, $2, $3) RETURNING id",
      [name, description, base_price || 0]
    );
    res
      .status(201)
      .json({ id: result.rows[0].id, message: "Paquete creado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear paquete" });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, STRING_AGG(c.name, ',') as courses
      FROM packages p
      LEFT JOIN package_courses pc ON p.id = pc.package_id
      LEFT JOIN courses c ON pc.course_id = c.id
      GROUP BY p.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener paquetes" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT p.*, STRING_AGG(c.name, ',') as courses
      FROM packages p
      LEFT JOIN package_courses pc ON p.id = pc.package_id
      LEFT JOIN courses c ON pc.course_id = c.id
      WHERE p.id = $1
      GROUP BY p.id
    `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Paquete no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener paquete" });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, base_price } = req.body;
    await db.query(
      "UPDATE packages SET name = $1, description = $2, base_price = $3 WHERE id = $4",
      [name, description, base_price || 0, req.params.id]
    );
    res.json({ message: "Paquete actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar paquete" });
  }
};

exports.delete = async (req, res) => {
  try {
    await db.query("DELETE FROM packages WHERE id = $1", [req.params.id]);
    res.json({ message: "Paquete eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar paquete" });
  }
};

exports.addCourse = async (req, res) => {
  try {
    const { course_id } = req.body;
    await db.query(
      "INSERT INTO package_courses (package_id, course_id) VALUES ($1, $2)",
      [req.params.id, course_id]
    );
    res.json({ message: "Curso añadido al paquete correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al añadir curso al paquete" });
  }
};

exports.removeCourse = async (req, res) => {
  try {
    await db.query(
      "DELETE FROM package_courses WHERE package_id = $1 AND course_id = $2",
      [req.params.id, req.params.courseId]
    );
    res.json({ message: "Curso removido del paquete correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al remover curso del paquete" });
  }
};

// Package offerings
exports.createOffering = async (req, res) => {
  try {
    const data = req.body;
    const result = await PackageOffering.create(data);
    res.status(201).json({ message: "Package offering creado", id: result.id });
  } catch (err) {
    console.error("Error creando package offering:", err);
    res.status(500).json({ message: "Error creando package offering" });
  }
};

exports.getOfferings = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        po.*, 
        pkg.name AS package_name, 
        pkg.base_price AS base_price,
        cyc.name AS cycle_name
      FROM package_offerings po 
      JOIN packages pkg ON po.package_id = pkg.id 
      LEFT JOIN cycles cyc ON po.cycle_id = cyc.id 
      ORDER BY po.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener package offerings" });
  }
};

exports.updateOffering = async (req, res) => {
  try {
    await PackageOffering.update(req.params.id, req.body);
    res.json({ message: "Package offering actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error actualizando package offering" });
  }
};

exports.deleteOffering = async (req, res) => {
  try {
    await PackageOffering.delete(req.params.id);
    res.json({ message: "Package offering eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error eliminando package offering" });
  }
};

// Mapear course_offerings a una package_offering
exports.getOfferingCourses = async (req, res) => {
  try {
    const packageOfferingId = req.params.id;
    const result = await db.query(
      `SELECT poc.course_offering_id
       FROM package_offering_courses poc
       WHERE poc.package_offering_id = $1`,
      [packageOfferingId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error listando cursos de la package_offering:", err);
    res
      .status(500)
      .json({ message: "Error al obtener cursos ofrecidos del paquete" });
  }
};

exports.addOfferingCourse = async (req, res) => {
  try {
    const packageOfferingId = req.params.id;
    const { course_offering_id } = req.body;
    if (!course_offering_id)
      return res.status(400).json({ message: "Falta course_offering_id" });

    await db.query(
      `INSERT INTO package_offering_courses (package_offering_id, course_offering_id)
       VALUES ($1, $2)`,
      [packageOfferingId, course_offering_id]
    );
    res.status(201).json({ message: "Curso ofrecido vinculado al paquete" });
  } catch (err) {
    console.error("Error agregando curso ofrecido al paquete:", err);
    if (err && err.code === "23505") {
      return res
        .status(400)
        .json({ message: "Este curso ofrecido ya está vinculado" });
    }
    res
      .status(500)
      .json({ message: "Error al vincular curso ofrecido al paquete" });
  }
};

exports.removeOfferingCourse = async (req, res) => {
  try {
    const packageOfferingId = req.params.id;
    const courseOfferingId = req.params.courseOfferingId;
    await db.query(
      `DELETE FROM package_offering_courses
       WHERE package_offering_id = $1 AND course_offering_id = $2`,
      [packageOfferingId, courseOfferingId]
    );
    res.json({ message: "Curso ofrecido desvinculado del paquete" });
  } catch (err) {
    console.error("Error removiendo curso ofrecido del paquete:", err);
    res
      .status(500)
      .json({ message: "Error al desvincular curso ofrecido del paquete" });
  }
};
