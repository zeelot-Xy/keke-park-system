const fs = require("fs");
const path = require("path");
const pool = require("../db/connection");

async function setupDatabase() {
  const schemaPath = path.resolve(__dirname, "..", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  await pool.raw.query(schemaSql);
}

if (require.main === module) {
  setupDatabase()
    .then(async () => {
      console.log("Database schema is ready.");
      await pool.end();
    })
    .catch(async (error) => {
      console.error("Database setup failed:", error);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { setupDatabase };
