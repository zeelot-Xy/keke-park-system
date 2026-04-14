const pool = require("../db/connection");

const generateNextParkId = async () => {
  const [rows] = await pool.query(`
    SELECT COALESCE(
      MAX(CAST(NULLIF(SPLIT_PART(park_id, '-', 2), '') AS INTEGER)),
      0
    ) AS "lastParkNumber"
    FROM users
    WHERE park_id IS NOT NULL
  `);

  return `KKP-${String(rows[0].lastParkNumber + 1).padStart(4, "0")}`;
};

const approveDriverWithParkId = async (driverId) => {
  const [driverRows] = await pool.query(
    `SELECT id, status, role, park_id
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [driverId],
  );

  if (!driverRows.length || driverRows[0].role !== "driver") {
    return { outcome: "not_found" };
  }

  const driver = driverRows[0];
  if (driver.status !== "pending") {
    return {
      outcome: "not_pending",
      driver,
    };
  }

  const parkId = driver.park_id || (await generateNextParkId());
  const [updatedRows, result] = await pool.query(
    `UPDATE users
     SET status = 'approved', park_id = $1
     WHERE id = $2 AND status = 'pending'
     RETURNING id, status, role, park_id`,
    [parkId, driverId],
  );

  if (!result.rowCount) {
    return { outcome: "conflict" };
  }

  return {
    outcome: "approved",
    driver: updatedRows[0],
    parkId,
  };
};

module.exports = {
  approveDriverWithParkId,
  generateNextParkId,
};
