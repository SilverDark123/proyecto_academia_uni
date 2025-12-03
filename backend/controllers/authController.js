// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../db");
require("dotenv").config();

exports.register = async (req, res) => {
  try {
    const { username, password, role, related_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      "INSERT INTO users (username, password_hash, role, related_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [username, hashedPassword, role, related_id || null]
    );

    res
      .status(201)
      .json({ message: "Usuario creado correctamente", id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      res.status(400).json({ message: "El usuario ya existe" });
    } else {
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  }
};

exports.login = async (req, res) => {
  try {
    const { dni, password } = req.body;

    // Primero buscamos en la tabla de usuarios (admin/profesores)
    const usersResult = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [dni]
    );
    const users = usersResult.rows;

    if (users.length > 0) {
      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      // Si es profesor, obtener información adicional
      let userData = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      if (user.role === "teacher" && user.related_id) {
        const teachersResult = await db.query(
          "SELECT * FROM teachers WHERE id = $1",
          [user.related_id]
        );
        const teachers = teachersResult.rows;
        if (teachers.length > 0) {
          userData.name = `${teachers[0].first_name} ${teachers[0].last_name}`;
          userData.email = teachers[0].email;
          userData.related_id = user.related_id;
        }
      }

      const token = jwt.sign({ ...userData }, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      return res.json({
        token,
        user: userData,
      });
    }

    // Si no es usuario administrativo, buscamos estudiante
    const studentsResult = await db.query(
      "SELECT * FROM students WHERE dni = $1",
      [dni]
    );
    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const student = students[0];
    const isValid = await bcrypt.compare(password, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ message: "DNI o contraseña incorrectos" });
    }

    const token = jwt.sign(
      {
        id: student.id,
        dni: student.dni,
        role: "student",
        name: `${student.first_name} ${student.last_name}`,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      user: {
        id: student.id,
        dni: student.dni,
        role: "student",
        name: `${student.first_name} ${student.last_name}`,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
};
