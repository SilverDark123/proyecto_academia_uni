// scripts/createAdmin.js
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "../.env" });

async function createAdmin() {
  try {
    // Crear hash de la contraseña
    const password = "admin123"; // Contraseña por defecto
    const hashedPassword = await bcrypt.hash(password, 10);

    // Conectar a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Insertar el administrador
    await connection.execute(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
      ["admin", hashedPassword, "admin"]
    );

    console.log("Usuario administrador creado exitosamente");
    console.log("Username: admin");
    console.log("Password: admin123");

    await connection.end();
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.log("El usuario administrador ya existe");
    } else {
      console.error("Error al crear el administrador:", err);
    }
  }
}

createAdmin();
