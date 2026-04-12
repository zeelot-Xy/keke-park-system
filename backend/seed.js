const bcrypt = require("bcryptjs");
const pool = require("./db/connection");
const { normalizePhone } = require("./utils/normalizers");

const DEFAULT_ADMIN = {
  fullName: "Admin User",
  phone: normalizePhone("08000000001"),
  email: "admin@keke.park",
  password: "admin123",
};

const DEFAULT_DRIVER = {
  fullName: "Demo Driver",
  phone: normalizePhone("08011111111"),
  email: "driver@keke.park",
  password: "Driver123!",
  parkId: "KKP-0001",
  licenseNumber: "DRV1234567",
  plateNumber: "KKE-123AB",
};

async function upsertUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 12);

  await pool.query(
    `INSERT INTO users (
      role,
      full_name,
      phone,
      email,
      password,
      park_id,
      license_number,
      plate_number,
      passport_photo,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (phone)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      password = EXCLUDED.password,
      park_id = EXCLUDED.park_id,
      license_number = EXCLUDED.license_number,
      plate_number = EXCLUDED.plate_number,
      passport_photo = EXCLUDED.passport_photo,
      status = EXCLUDED.status`,
    [
      user.role,
      user.fullName,
      user.phone,
      user.email,
      hashedPassword,
      user.parkId,
      user.licenseNumber,
      user.plateNumber,
      user.passportPhoto || null,
      user.status,
    ],
  );
}

async function seed() {
  await upsertUser({
    role: "admin",
    fullName: DEFAULT_ADMIN.fullName,
    phone: DEFAULT_ADMIN.phone,
    email: DEFAULT_ADMIN.email,
    password: process.env.DEMO_ADMIN_PASSWORD || DEFAULT_ADMIN.password,
    status: "approved",
  });

  await upsertUser({
    role: "driver",
    fullName: DEFAULT_DRIVER.fullName,
    phone: DEFAULT_DRIVER.phone,
    email: DEFAULT_DRIVER.email,
    password: process.env.DEMO_DRIVER_PASSWORD || DEFAULT_DRIVER.password,
    parkId: DEFAULT_DRIVER.parkId,
    licenseNumber: DEFAULT_DRIVER.licenseNumber,
    plateNumber: DEFAULT_DRIVER.plateNumber,
    status: "approved",
  });

  console.log("Seeded demo accounts:");
  console.log(`- Admin: ${DEFAULT_ADMIN.phone} | password ${process.env.DEMO_ADMIN_PASSWORD || DEFAULT_ADMIN.password}`);
  console.log(`- Driver: ${DEFAULT_DRIVER.phone} | password ${process.env.DEMO_DRIVER_PASSWORD || DEFAULT_DRIVER.password}`);
  await pool.end();
}

seed().catch(async (error) => {
  console.error("Seeding failed:", error);
  await pool.end();
  process.exit(1);
});
