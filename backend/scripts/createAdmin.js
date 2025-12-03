// scripts/createAdmin.js
const bcrypt = require("bcrypt");
const { Client } = require("pg");
require("dotenv").config({ path: "../.env" });

async function createAdmin() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "academia_final",
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();

    // Crear hash de la contraseña
    const password = "admin123"; // Contraseña por defecto
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar el administrador
    await client.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
      ["admin", hashedPassword, "admin"]
    );

    console.log("Usuario administrador creado exitosamente");
    console.log("Username: admin");
    console.log("Password: admin123");
  } catch (err) {
    if (err.code === "23505") {
      // PostgreSQL unique violation code
      console.log("El usuario administrador ya existe");
    } else {
      console.error("Error al crear el administrador:", err);
    }
  } finally {
    await client.end();
  }
}

createAdmin();
