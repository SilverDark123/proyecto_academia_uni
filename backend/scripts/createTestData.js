// scripts/createTestData.js
const { Client } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

async function createTestData() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "academia_final",
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();

    // Insertar profesores de prueba
    const teachers = [
      {
        dni: "12345678",
        name: "Juan Pérez",
        phone: "987654321",
        email: "juan.perez@example.com",
        bio: "Profesor de Matemáticas con 10 años de experiencia",
      },
      {
        dni: "87654321",
        name: "María García",
        phone: "987654322",
        email: "maria.garcia@example.com",
        bio: "Profesora de Física con doctorado en Física Cuántica",
      },
      {
        dni: "23456789",
        name: "Carlos López",
        phone: "987654323",
        email: "carlos.lopez@example.com",
        bio: "Profesor de Química con experiencia en investigación",
      },
    ];

    for (const teacher of teachers) {
      try {
        // Insertar profesor (asumiendo que name se divide en first_name y last_name para la tabla teachers)
        const nameParts = teacher.name.split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");

        const result = await client.query(
          "INSERT INTO teachers (first_name, last_name, dni, phone, email, specialization) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [
            firstName,
            lastName,
            teacher.dni,
            teacher.phone,
            teacher.email,
            teacher.bio,
          ]
        );

        // Crear cuenta de usuario para el profesor
        const hashedPassword = await bcrypt.hash("profesor123", 10);
        await client.query(
          "INSERT INTO users (username, password_hash, role, related_id) VALUES ($1, $2, $3, $4)",
          [teacher.dni, hashedPassword, "teacher", result.rows[0].id]
        );

        console.log(`Profesor creado: ${teacher.name}`);
        console.log(`DNI (usuario): ${teacher.dni}`);
        console.log(`Contraseña: profesor123`);
        console.log("-------------------");
      } catch (err) {
        if (err.code === "23505") {
          console.log(`El profesor ${teacher.name} ya existe.`);
        } else {
          console.error(`Error creando profesor ${teacher.name}:`, err);
        }
      }
    }

    // También actualizamos el usuario admin con un DNI (si fuera necesario, aunque en PG users.username es varchar)
    // En el script original se actualizaba username='99999999' donde username='admin'.
    // Mantendremos esa lógica si es requerida, pero 'admin' es más claro.
    // await client.query(
    //   'UPDATE users SET username = $1 WHERE username = $2',
    //   ['99999999', 'admin']
    // );

    // console.log('Usuario admin actualizado:');
    // console.log('DNI (usuario): 99999999');
    // console.log('Contraseña: admin123');

    console.log("Datos de prueba creados exitosamente");
  } catch (err) {
    console.error("Error al crear datos de prueba:", err);
  } finally {
    await client.end();
  }
}

createTestData();
