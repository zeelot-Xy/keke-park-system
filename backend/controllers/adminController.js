const pool = require("../db/connection");
const MINIMUM_LOADING_MINUTES = 2;

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

const getPendingDrivers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, phone, email, license_number, plate_number, passport_photo, status
       FROM users
       WHERE status = 'pending' AND role = 'driver'
       ORDER BY created_at ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Get pending drivers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const approveDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const [driverRows] = await pool.query(
      "SELECT id, status, role, park_id FROM users WHERE id = $1 LIMIT 1",
      [id],
    );

    if (!driverRows.length || driverRows[0].role !== "driver") {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (driverRows[0].status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending drivers can be approved" });
    }

    const parkId = driverRows[0].park_id || (await generateNextParkId());
    const [, result] = await pool.query(
      `UPDATE users
       SET status = 'approved', park_id = $1
       WHERE id = $2 AND status = 'pending'`,
      [parkId, id],
    );

    if (!result.rowCount) {
      return res
        .status(409)
        .json({ message: "Driver approval could not be completed" });
    }

    global.io.emit("queueUpdated");
    res.json({ message: "Driver approved", park_id: parkId });
  } catch (err) {
    console.error("Approve driver error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const rejectDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const [, result] = await pool.query(
      `UPDATE users
       SET status = 'rejected'
       WHERE id = $1 AND role = 'driver' AND status = 'pending'`,
      [id],
    );

    if (!result.rowCount) {
      return res
        .status(404)
        .json({ message: "Pending driver not found or already processed" });
    }

    res.json({ message: "Driver rejected" });
  } catch (err) {
    console.error("Reject driver error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getLiveQueue = async (req, res) => {
  try {
    const [queue] = await pool.query(`
      SELECT q.id, q.join_timestamp, q.status, u.full_name, u.park_id, u.plate_number
      FROM queue_entries q
      JOIN users u ON q.driver_id = u.id
      WHERE q.status IN ('waiting', 'loading')
      ORDER BY q.join_timestamp ASC
    `);
    res.json(queue);
  } catch (err) {
    console.error("Get live queue error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllDrivers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status, created_at
       FROM users
       WHERE role = 'driver'
       ORDER BY created_at DESC`,
    );

    res.json(rows);
  } catch (err) {
    console.error("Get all drivers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const loadFirstDriver = async (req, res) => {
  try {
    const [loadingRows] = await pool.query(
      "SELECT id FROM queue_entries WHERE status = 'loading' LIMIT 1",
    );
    if (loadingRows.length) {
      return res
        .status(400)
        .json({ message: "Complete the current loading driver first" });
    }

    const [first] = await pool.query(
      `SELECT id
       FROM queue_entries
       WHERE status = 'waiting'
       ORDER BY join_timestamp ASC
       LIMIT 1`,
    );
    if (!first.length) {
      return res.status(400).json({ message: "No waiting drivers" });
    }

    await pool.query(
      `UPDATE queue_entries
       SET status = 'loading', loading_started_at = NOW()
       WHERE id = $1 AND status = 'waiting'`,
      [first[0].id],
    );
    global.io.emit("queueUpdated");
    global.io.emit("driverLoaded");
    res.json({ message: "First driver moved to loading" });
  } catch (err) {
    console.error("Load first driver error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const completeLoading = async (req, res) => {
  try {
    const [loading] = await pool.query(
      `SELECT id, loading_started_at
       FROM queue_entries
       WHERE status = 'loading'
       ORDER BY join_timestamp ASC
       LIMIT 1`,
    );
    if (!loading.length) {
      return res.status(400).json({ message: "No driver currently loading" });
    }

    const loadingStart = loading[0].loading_started_at
      ? new Date(loading[0].loading_started_at)
      : null;

    if (loadingStart) {
      const minutesSinceLoadingStarted =
        (Date.now() - loadingStart.getTime()) / (1000 * 60);

      if (minutesSinceLoadingStarted < MINIMUM_LOADING_MINUTES) {
        const waitMin = Math.ceil(
          MINIMUM_LOADING_MINUTES - minutesSinceLoadingStarted,
        );

        return res.status(400).json({
          message: `Loading must stay active for at least ${MINIMUM_LOADING_MINUTES} minutes. Please wait ${waitMin} more minute${waitMin === 1 ? "" : "s"}.`,
          remainingMinutes: waitMin,
        });
      }
    }

    await pool.query(
      `UPDATE queue_entries
       SET status = 'completed', loading_started_at = NULL
       WHERE id = $1 AND status = 'loading'`,
      [loading[0].id],
    );
    global.io.emit("queueUpdated");
    global.io.emit("loadingCompleted");
    res.json({ message: "Loading completed. Driver removed from active queue." });
  } catch (err) {
    console.error("Complete loading error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getPendingDrivers,
  approveDriver,
  rejectDriver,
  getLiveQueue,
  loadFirstDriver,
  completeLoading,
  getAllDrivers,
};
