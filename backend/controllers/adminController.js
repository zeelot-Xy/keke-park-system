const pool = require("../db/connection");

const getPendingDrivers = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, phone, email, license_number, plate_number, passport_photo, status FROM users WHERE status = "pending" AND role = "driver"',
  );
  res.json(rows);
};

const approveDriver = async (req, res) => {
  const { id } = req.params;
  // Generate unique park_id like KKP-0001
  const [count] = await pool.query(
    "SELECT COUNT(*) as total FROM users WHERE park_id IS NOT NULL",
  );
  const parkId = `KKP-${String(count[0].total + 1).padStart(4, "0")}`;

  await pool.query(
    'UPDATE users SET status = "approved", park_id = ? WHERE id = ?',
    [parkId, id],
  );
  global.io.emit("queueUpdated");
  res.json({ message: "Driver approved", park_id: parkId });
};

const rejectDriver = async (req, res) => {
  const { id } = req.params;
  await pool.query('UPDATE users SET status = "rejected" WHERE id = ?', [id]);
  res.json({ message: "Driver rejected" });
};

const getLiveQueue = async (req, res) => {
  const [queue] = await pool.query(`
    SELECT q.id, q.join_timestamp, q.status, u.full_name, u.park_id, u.plate_number 
    FROM queue_entries q 
    JOIN users u ON q.driver_id = u.id 
    WHERE q.status IN ('waiting', 'loading') 
    ORDER BY q.join_timestamp ASC
  `);
  res.json(queue);
};
const getAllDrivers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status, created_at
       FROM users
       WHERE role = "driver"
       ORDER BY created_at DESC`,
    );

    res.json(rows);
  } catch (err) {
    console.error("Get all drivers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const loadFirstDriver = async (req, res) => {
  const [first] = await pool.query(
    'SELECT id FROM queue_entries WHERE status = "waiting" ORDER BY join_timestamp ASC LIMIT 1',
  );
  if (!first.length)
    return res.status(400).json({ message: "No waiting drivers" });

  await pool.query('UPDATE queue_entries SET status = "loading" WHERE id = ?', [
    first[0].id,
  ]);
  global.io.emit("queueUpdated");
  global.io.emit("driverLoaded");
  res.json({ message: "First driver moved to loading" });
};

const completeLoading = async (req, res) => {
  const [loading] = await pool.query(
    'SELECT id FROM queue_entries WHERE status = "loading" LIMIT 1',
  );
  if (!loading.length)
    return res.status(400).json({ message: "No driver currently loading" });

  await pool.query(
    'UPDATE queue_entries SET status = "completed" WHERE id = ?',
    [loading[0].id],
  );
  global.io.emit("queueUpdated");
  global.io.emit("loadingCompleted");
  res.json({ message: "Loading completed. Driver removed from active queue." });
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
