// scripts/createTestUsers.js
// Script para crear usuarios de prueba (admin, estudiantes, docentes)

const bcrypt = require("bcrypt");
const { Client } = require("pg");
require("dotenv").config();

async function createTestUsers() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "academia_final",
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();

    console.log("🔐 Creando usuarios de prueba...\n");

    // ============================================
    // 1. CREAR ADMINISTRADOR
    // ============================================
    console.log("📌 Creando Administrador...");
    try {
      const adminPassword = "admin123";
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

      await client.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
        ["admin", hashedAdminPassword, "admin"]
      );
      console.log("✅ Administrador creado:");
      console.log("   Usuario: admin");
      console.log("   Contraseña: admin123\n");
    } catch (err) {
      if (err.code === "23505") {
        console.log("⚠️  El administrador ya existe\n");
      } else {
        throw err;
      }
    }

    // ============================================
    // 2. CREAR DOCENTES
    // ============================================
    console.log("👨‍🏫 Creando Docentes...");
    const teachers = [
      {
        dni: "12345678",
        first_name: "Juan",
        last_name: "Pérez",
        phone: "987654321",
        email: "juan.perez@academia.edu",
        specialization: "Matemáticas",
        password: "docente123",
      },
      {
        dni: "87654321",
        first_name: "María",
        last_name: "García",
        phone: "987654322",
        email: "maria.garcia@academia.edu",
        specialization: "Física",
        password: "docente123",
      },
      {
        dni: "11223344",
        first_name: "Carlos",
        last_name: "López",
        phone: "987654323",
        email: "carlos.lopez@academia.edu",
        specialization: "Química",
        password: "docente123",
      },
    ];

    for (const teacher of teachers) {
      try {
        // Insertar docente en la tabla teachers
        const result = await client.query(
          "INSERT INTO teachers (first_name, last_name, dni, phone, email, specialization) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [
            teacher.first_name,
            teacher.last_name,
            teacher.dni,
            teacher.phone,
            teacher.email,
            teacher.specialization,
          ]
        );

        // Crear usuario asociado
        const hashedPassword = await bcrypt.hash(teacher.password, 10);
        await client.query(
          "INSERT INTO users (username, password_hash, role, related_id) VALUES ($1, $2, $3, $4)",
          [teacher.dni, hashedPassword, "teacher", result.rows[0].id]
        );

        console.log(
          `✅ Docente creado: ${teacher.first_name} ${teacher.last_name}`
        );
        console.log(`   DNI (usuario): ${teacher.dni}`);
        console.log(`   Contraseña: ${teacher.password}`);
        console.log(`   Especialización: ${teacher.specialization}\n`);
      } catch (err) {
        if (err.code === "23505") {
          console.log(`⚠️  El docente con DNI ${teacher.dni} ya existe\n`);
        } else {
          console.error(
            `❌ Error creando docente ${teacher.first_name}:`,
            err.message
          );
        }
      }
    }

    // ============================================
    // 3. CREAR ESTUDIANTES
    // ============================================
    console.log("👨‍🎓 Creando Estudiantes...");
    const students = [
      {
        dni: "76543210",
        first_name: "Ana",
        last_name: "Martínez",
        phone: "987654324",
        parent_name: "Pedro Martínez",
        parent_phone: "987654325",
        password: "estudiante123",
      },
      {
        dni: "65432109",
        first_name: "Luis",
        last_name: "Rodríguez",
        phone: "987654326",
        parent_name: "Carmen Rodríguez",
        parent_phone: "987654327",
        password: "estudiante123",
      },
      {
        dni: "54321098",
        first_name: "Sofía",
        last_name: "Fernández",
        phone: "987654328",
        parent_name: "Miguel Fernández",
        parent_phone: "987654329",
        password: "estudiante123",
      },
      {
        dni: "43210987",
        first_name: "Diego",
        last_name: "González",
        phone: "987654330",
        parent_name: "Laura González",
        parent_phone: "987654331",
        password: "estudiante123",
      },
      {
        dni: "32109876",
        first_name: "Valentina",
        last_name: "Sánchez",
        phone: "987654332",
        parent_name: "Roberto Sánchez",
        parent_phone: "987654333",
        password: "estudiante123",
      },
    ];

    for (const student of students) {
      try {
        const hashedPassword = await bcrypt.hash(student.password, 10);
        await client.query(
          "INSERT INTO students (dni, first_name, last_name, phone, parent_name, parent_phone, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            student.dni,
            student.first_name,
            student.last_name,
            student.phone,
            student.parent_name,
            student.parent_phone,
            hashedPassword,
          ]
        );

        console.log(
          `✅ Estudiante creado: ${student.first_name} ${student.last_name}`
        );
        console.log(`   DNI (usuario): ${student.dni}`);
        console.log(`   Contraseña: ${student.password}`);
        console.log(`   Apoderado: ${student.parent_name}\n`);
      } catch (err) {
        if (err.code === "23505") {
          console.log(`⚠️  El estudiante con DNI ${student.dni} ya existe\n`);
        } else {
          console.error(
            `❌ Error creando estudiante ${student.first_name}:`,
            err.message
          );
        }
      }
    }

    // ============================================
    // RESUMEN
    // ============================================
    console.log("═══════════════════════════════════════════════════════════");
    console.log("📋 RESUMEN DE USUARIOS DE PRUEBA");
    console.log(
      "═══════════════════════════════════════════════════════════\n"
    );

    console.log("🔑 ADMINISTRADOR:");
    console.log("   Usuario: admin");
    console.log("   Contraseña: admin123\n");

    console.log("👨‍🏫 DOCENTES:");
    teachers.forEach((teacher) => {
      console.log(
        `   ${teacher.first_name} ${teacher.last_name} - DNI: ${teacher.dni} - Contraseña: ${teacher.password}`
      );
    });
    console.log("");

    console.log("👨‍🎓 ESTUDIANTES:");
    students.forEach((student) => {
      console.log(
        `   ${student.first_name} ${student.last_name} - DNI: ${student.dni} - Contraseña: ${student.password}`
      );
    });
    console.log("");

    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ Usuarios de prueba creados correctamente!");
    console.log(
      "═══════════════════════════════════════════════════════════\n"
    );
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Ejecutar el script
createTestUsers();
