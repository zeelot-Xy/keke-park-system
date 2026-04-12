const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { getCurrentDateInLagos } = require("../utils/date");
const {
  normalizePhone,
  normalizeLicenseNumber,
  normalizePlateNumber,
} = require("../utils/normalizers");
const { uploadPassportPhoto } = require("../services/passportStorage");

const isUniqueViolation = (error) => error?.code === "23505";
const isStorageFailure = (error) => error?.code === "PASSPORT_UPLOAD_FAILED";

const getProfile = async (req, res) => {
  try {
    const driverId = req.user.id;
    const today = getCurrentDateInLagos();

    const [userRows] = await pool.query(
      `SELECT id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status
       FROM users
       WHERE id = $1`,
      [driverId],
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const [paymentRows] = await pool.query(
      `SELECT status
       FROM daily_payments
       WHERE driver_id = $1 AND payment_date = $2`,
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

const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const driverId = req.user.id;
    const [existingRows] = await pool.query(
      `SELECT id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status
       FROM users
       WHERE id = $1 AND role = 'driver'`,
      [driverId],
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const currentProfile = existingRows[0];
    const fullName = req.body.full_name.trim();
    const phone = normalizePhone(req.body.phone);
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;
    const licenseNumber = normalizeLicenseNumber(req.body.license_number);
    const plateNumber = normalizePlateNumber(req.body.plate_number);

    let passportPhoto = currentProfile.passport_photo;
    if (req.file) {
      const uploadedPhoto = await uploadPassportPhoto(req.file);
      passportPhoto = uploadedPhoto.publicUrl;
    }

    let hashedPassword = null;
    if (req.body.password) {
      hashedPassword = await bcrypt.hash(req.body.password, 12);
    }

    const values = [
      fullName,
      phone,
      email,
      licenseNumber,
      plateNumber,
      passportPhoto,
      driverId,
    ];

    let query = `UPDATE users
      SET full_name = $1,
          phone = $2,
          email = $3,
          license_number = $4,
          plate_number = $5,
          passport_photo = $6`;

    if (hashedPassword) {
      values.splice(6, 0, hashedPassword);
      query += `,
          password = $7
        WHERE id = $8 AND role = 'driver'
        RETURNING id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status`;
    } else {
      query += `
        WHERE id = $7 AND role = 'driver'
        RETURNING id, full_name, phone, email, park_id, license_number, plate_number, passport_photo, status`;
    }

    const [rows] = await pool.query(query, values);
    res.json({ ...rows[0], message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update profile error:", err);
    if (isUniqueViolation(err)) {
      return res.status(400).json({
        message:
          "Phone, license number or plate number already exists. Try different values.",
      });
    }
    if (isStorageFailure(err)) {
      return res.status(500).json({
        message:
          "Passport upload failed on the server. Please try again, and if it continues, check the storage bucket configuration.",
      });
    }
    return res.status(500).json({ message: "Unable to update profile right now" });
  }
};

const makePayment = async (req, res) => {
  try {
    const driverId = req.user.id;
    const today = getCurrentDateInLagos();

    await pool.query(
      `INSERT INTO daily_payments (driver_id, payment_date, status, paid_at)
       VALUES ($1, $2, 'paid', NOW())
       ON CONFLICT (driver_id, payment_date)
       DO UPDATE SET status = 'paid', paid_at = NOW()`,
      [driverId, today],
    );
    global.io.emit("queueUpdated");
    res.json({ message: "Daily payment successful for today" });
  } catch (err) {
    console.error("Make payment error:", err);
    res.status(500).json({ message: "Unable to record payment" });
  }
};

const joinQueue = async (req, res) => {
  try {
    const driverId = req.user.id;
    const today = getCurrentDateInLagos();

    const [paymentRows] = await pool.query(
      `SELECT 1
       FROM daily_payments
       WHERE driver_id = $1 AND payment_date = $2 AND status = 'paid'`,
      [driverId, today],
    );
    if (!paymentRows.length) {
      return res
        .status(400)
        .json({ message: "Please make daily payment first" });
    }

    const [queueRows] = await pool.query(
      `SELECT 1
       FROM queue_entries
       WHERE driver_id = $1 AND status IN ('waiting', 'loading')`,
      [driverId],
    );
    if (queueRows.length) {
      return res.status(400).json({ message: "You are already in the queue" });
    }

    const [cooldownRows] = await pool.query(
      "SELECT last_join FROM cooldown_log WHERE driver_id = $1",
      [driverId],
    );
    if (cooldownRows.length) {
      const lastJoin = new Date(cooldownRows[0].last_join);
      const minutesSince = (Date.now() - lastJoin.getTime()) / (1000 * 60);
      if (minutesSince < 220) {
        const waitMin = Math.ceil(220 - minutesSince);
        return res.status(400).json({
          message: `Cooldown active. Please wait ${waitMin} minutes before re-joining.`,
          cooldownMinutes: waitMin,
        });
      }
    }

    await pool.query(
      "INSERT INTO queue_entries (driver_id, status) VALUES ($1, 'waiting')",
      [driverId],
    );
    await pool.query(
      `INSERT INTO cooldown_log (driver_id, last_join)
       VALUES ($1, NOW())
       ON CONFLICT (driver_id)
       DO UPDATE SET last_join = NOW()`,
      [driverId],
    );

    global.io.emit("queueUpdated");
    res.json({ message: "Successfully joined the queue" });
  } catch (err) {
    console.error("Join queue error:", err);
    res.status(500).json({ message: "Unable to join queue right now" });
  }
};

const getQueuePosition = async (req, res) => {
  try {
    const driverId = req.user.id;
    const [queue] = await pool.query(
      `SELECT id, driver_id, join_timestamp, status
       FROM queue_entries
       WHERE status IN ('waiting', 'loading')
       ORDER BY join_timestamp ASC`,
    );

    const myEntry = queue.findIndex((entry) => entry.driver_id === driverId);
    if (myEntry === -1) {
      return res.json({ position: null, status: "not_in_queue" });
    }

    const position = myEntry + 1;
    res.json({ position, status: queue[myEntry].status });
  } catch (err) {
    console.error("Get queue position error:", err);
    res.status(500).json({ message: "Unable to fetch queue position" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  makePayment,
  joinQueue,
  getQueuePosition,
};
