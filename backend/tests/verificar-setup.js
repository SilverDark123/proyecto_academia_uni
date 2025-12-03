// tests/verificar-setup.js
// Script para verificar que todo esté configurado correctamente antes de ejecutar las pruebas

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, type = "info") {
  const prefix =
    type === "success"
      ? `${colors.green}✓`
      : type === "error"
      ? `${colors.red}✗`
      : type === "warning"
      ? `${colors.yellow}⚠`
      : `${colors.cyan}ℹ`;
  console.log(`${prefix} ${message}${colors.reset}`);
}

async function verificarSetup() {
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.blue}  VERIFICACIÓN DE CONFIGURACIÓN - ACADEMIA V2${colors.reset}`
  );
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`
  );

  let errores = 0;
  let advertencias = 0;

  // Verificar archivo .env
  log("Verificando archivo .env...", "info");
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    log("Archivo .env encontrado", "success");

    // Verificar JWT_SECRET
    if (process.env.JWT_SECRET) {
      log("JWT_SECRET configurado", "success");
    } else {
      log("JWT_SECRET no está configurado en .env", "error");
      errores++;
    }
  } else {
    log("Archivo .env no encontrado", "warning");
    advertencias++;
    log("Crea un archivo .env con JWT_SECRET=tu_secreto_aqui", "warning");
  }

  // Verificar conexión a la base de datos
  log("\nVerificando conexión a la base de datos...", "info");
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "academia_final",
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    log("Conexión a la base de datos exitosa", "success");

    log("Base de datos academia_final existe", "success");

    // Verificar tablas principales
    log("\nVerificando tablas principales...", "info");
    const tablas = [
      "users",
      "students",
      "teachers",
      "cycles",
      "courses",
      "packages",
      "course_offerings",
      "package_offerings",
      "schedules",
      "enrollments",
      "payment_plans",
      "installments",
      "attendance",
      "notifications_log",
      "analytics_summary",
    ];

    // Obtener lista de tablas existentes
    const resultTables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const tablasExistentes = resultTables.rows.map((t) => t.table_name);

    for (const tabla of tablas) {
      if (tablasExistentes.includes(tabla)) {
        log(`Tabla ${tabla} existe`, "success");
      } else {
        log(`Tabla ${tabla} no existe`, "error");
        errores++;
      }
    }

    // Verificar vista admin
    log("\nVerificando vista admin...", "info");
    try {
      const resultViews = await client.query(
        "SELECT table_name FROM information_schema.views WHERE table_schema = 'public'"
      );
      const vistasExistentes = resultViews.rows.map((v) => v.table_name);

      if (vistasExistentes.includes("view_dashboard_admin_extended")) {
        log("Vista view_dashboard_admin_extended existe", "success");
      } else {
        log("Vista view_dashboard_admin_extended no existe", "warning");
        advertencias++;
        log("Ejecuta el script de creación de vista para crearla", "warning");
      }
    } catch (err) {
      log("Error al verificar vista: " + err.message, "warning");
      advertencias++;
    }

    // Verificar usuario admin
    log("\nVerificando usuario admin...", "info");
    const resultAdmins = await client.query(
      "SELECT * FROM users WHERE role = $1 AND username = $2",
      ["admin", "admin"]
    );

    if (resultAdmins.rows.length > 0) {
      log("Usuario admin existe", "success");
    } else {
      log("Usuario admin no existe", "warning");
      advertencias++;
      log(
        "Ejecuta: node scripts/createAdmin.js para crear el admin",
        "warning"
      );
    }
  } catch (error) {
    log(`Error conectando a la base de datos: ${error.message}`, "error");
    errores++;
  } finally {
    await client.end();
  }

  // Verificar que axios esté instalado
  log("\nVerificando dependencias...", "info");
  try {
    require("axios");
    log("axios está instalado", "success");
  } catch (error) {
    log("axios no está instalado", "error");
    log("Ejecuta: npm install axios", "warning");
    errores++;
  }

  // Verificar que el servidor pueda iniciarse
  log("\nVerificando servidor...", "info");
  try {
    const axios = require("axios");
    const response = await axios.get("http://localhost:4000/api/cycles", {
      timeout: 2000,
      validateStatus: () => true,
    });

    if (
      response.status === 200 ||
      response.status === 401 ||
      response.status === 403
    ) {
      log("Servidor está corriendo en http://localhost:4000", "success");
    } else {
      log("Servidor responde pero con un error inesperado", "warning");
      advertencias++;
    }
  } catch (error) {
    log("Servidor no está corriendo en http://localhost:4000", "warning");
    log("Ejecuta: npm start para iniciar el servidor", "warning");
    advertencias++;
  }

  // Resumen
  console.log(
    `\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.blue}  RESUMEN${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`
  );

  if (errores === 0 && advertencias === 0) {
    console.log(
      `${colors.green}✓ Todo está configurado correctamente${colors.reset}`
    );
    console.log(
      `${colors.green}Puedes ejecutar las pruebas con: npm test${colors.reset}\n`
    );
    process.exit(0);
  } else {
    if (errores > 0) {
      console.log(
        `${colors.red}✗ Se encontraron ${errores} error(es)${colors.reset}`
      );
    }
    if (advertencias > 0) {
      console.log(
        `${colors.yellow}⚠ Se encontraron ${advertencias} advertencia(s)${colors.reset}`
      );
    }
    console.log(
      `${colors.yellow}Corrige los problemas antes de ejecutar las pruebas${colors.reset}\n`
    );
    process.exit(errores > 0 ? 1 : 0);
  }
}

verificarSetup().catch((error) => {
  console.error(`${colors.red}Error fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});
