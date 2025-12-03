// scripts/fix-dashboard-view.js
// Script para corregir la vista del dashboard admin

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function fixDashboardView() {
  try {
    const client = new Client({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "academia_final",
    });

    await client.connect();

    console.log("Corrigiendo vista del dashboard admin...\n");

    // Leer el script SQL
    const sqlPath = path.join(__dirname, "../tests/crear-vista-corregida.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Ejecutar el script
    await client.query(sql);

    console.log("✓ Vista corregida exitosamente\n");

    // Verificar que la vista funciona
    console.log("Verificando que la vista funciona...\n");
    try {
      const res = await client.query(
        "SELECT * FROM view_dashboard_admin_extended LIMIT 5"
      );
      console.log(
        `✓ Vista funciona correctamente. Se encontraron ${res.rows.length} registros.\n`
      );

      if (res.rows.length > 0) {
        console.log("Ejemplo de datos:");
        console.log(JSON.stringify(res.rows[0], null, 2));
      }
    } catch (err) {
      console.error("✗ Error al probar la vista:", err.message);
      await client.end();
      process.exit(1);
    }

    await client.end();
    console.log("\n✓ Proceso completado exitosamente");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

fixDashboardView();
