const pool = require("../db/connection");
const { body, validationResult } = require("express-validator");

const getProfile = async (req, res) => {
  try {
    const driverId = req.user.id;
    const today = new Date().toISOString().split("T")[0];

    const [userRows] = await pool.query(
      `SELECT id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status
       FROM users
       WHERE id = ?`,
      [driverId],
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const [paymentRows] = await pool.query(
      `SELECT status
       FROM daily_payments
       WHERE driver_id = ? AND payment_date = ?`,
      [driverId, today],
    );

    res.json({
      ...userRows[0],
      payment_status: paymentRows.length ? paymentRows[0].status : "pending",
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const makePayment = async (req, res) => {
  const driverId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  await pool.query(
    'INSERT INTO daily_payments (driver_id, payment_date, status, paid_at) VALUES (?, ?, "paid", NOW()) ON DUPLICATE KEY UPDATE status = "paid", paid_at = NOW()',
    [driverId, today],
  );
  global.io.emit("queueUpdated");
  res.json({ message: "Daily payment successful for today" });
};

const joinQueue = async (req, res) => {
  const driverId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  // 1. Check payment today
  const [paymentRows] = await pool.query(
    'SELECT 1 FROM daily_payments WHERE driver_id = ? AND payment_date = ? AND status = "paid"',
    [driverId, today],
  );
  if (!paymentRows.length)
    return res.status(400).json({ message: "Please make daily payment first" });

  // 2. Not already in queue
  const [queueRows] = await pool.query(
    'SELECT 1 FROM queue_entries WHERE driver_id = ? AND status IN ("waiting", "loading")',
    [driverId],
  );
  if (queueRows.length)
    return res.status(400).json({ message: "You are already in the queue" });

  // 3. Cooldown check (220 minutes)
  const [cooldownRows] = await pool.query(
    "SELECT last_join FROM cooldown_log WHERE driver_id = ?",
    [driverId],
  );
  if (cooldownRows.length) {
    const lastJoin = new Date(cooldownRows[0].last_join);
    const minutesSince = (Date.now() - lastJoin.getTime()) / (1000 * 60);
    if (minutesSince < 220) {
      const waitMin = Math.ceil(220 - minutesSince);
      return res.status(400).json({
        message: `Cooldown active. Please wait ${waitMin} minutes before re-joining.`,
      });
    }
  }

  // Join queue (FIFO by join_timestamp)
  await pool.query(
    'INSERT INTO queue_entries (driver_id, status) VALUES (?, "waiting")',
    [driverId],
  );
  await pool.query(
    "INSERT INTO cooldown_log (driver_id, last_join) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_join = NOW()",
    [driverId],
  );

  global.io.emit("queueUpdated"); // Real-time broadcast
  res.json({ message: "Successfully joined the queue" });
};

const getQueuePosition = async (req, res) => {
  const driverId = req.user.id;
  const [queue] = await pool.query(
    `SELECT id, driver_id, join_timestamp, status 
     FROM queue_entries 
     WHERE status IN ('waiting', 'loading') 
     ORDER BY join_timestamp ASC`,
  );

  const myEntry = queue.findIndex((entry) => entry.driver_id === driverId);
  if (myEntry === -1)
    return res.json({ position: null, status: "not_in_queue" });

  const position = myEntry + 1;
  res.json({ position, status: queue[myEntry].status });
};

module.exports = { getProfile, makePayment, joinQueue, getQueuePosition };
