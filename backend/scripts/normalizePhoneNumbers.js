const pool = require("../db/connection");
const { normalizePhone } = require("../utils/normalizers");

const normalizeExistingPhoneNumbers = async (db = pool) => {
  const [users] = await db.query("SELECT id, phone FROM users");
  let updatedCount = 0;

  for (const user of users) {
    const normalizedPhone = normalizePhone(user.phone);

    if (normalizedPhone !== user.phone) {
      await db.query("UPDATE users SET phone = $1 WHERE id = $2", [
        normalizedPhone,
        user.id,
      ]);
      updatedCount += 1;
    }
  }

  return updatedCount;
};

if (require.main === module) {
  normalizeExistingPhoneNumbers()
    .then(async (updatedCount) => {
      console.log(`Normalized ${updatedCount} user phone number(s).`);
      await pool.end();
    })
    .catch(async (error) => {
      console.error("Phone normalization failed:", error);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { normalizeExistingPhoneNumbers };
