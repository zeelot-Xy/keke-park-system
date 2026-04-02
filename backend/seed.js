const pool = require("./db/connection");
const bcrypt = require("bcryptjs");

async function seed() {
  const hashed = await bcrypt.hash("admin123", 12);
  await pool.query(
    'INSERT IGNORE INTO users (full_name, phone, email, password, role, status) VALUES (?, ?, ?, ?, "admin", "approved")',
    ["Admin User", "08000000001", "admin@keke.park", hashed],
  );
  console.log("✅ Admin seeded: phone 08000000001 | password admin123");
  process.exit();
}

seed();
