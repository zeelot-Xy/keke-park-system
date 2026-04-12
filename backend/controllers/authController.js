const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const {
  normalizePhone,
  normalizeLicenseNumber,
  normalizePlateNumber,
} = require("../utils/normalizers");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { uploadPassportPhoto } = require("../services/passportStorage");

const isUniqueViolation = (error) => error?.code === "23505";
const isStorageFailure = (error) => error?.code === "PASSPORT_UPLOAD_FAILED";

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  let { full_name, phone, email, password, license_number, plate_number } =
    req.body;

  full_name = full_name.trim();
  phone = normalizePhone(phone);
  email = email ? email.trim().toLowerCase() : null;
  license_number = normalizeLicenseNumber(license_number);
  plate_number = normalizePlateNumber(plate_number);

  if (!req.file) {
    return res.status(400).json({ message: "Passport photo is required" });
  }

  const hashed = await bcrypt.hash(password, 12);

  try {
    const uploadedPhoto = await uploadPassportPhoto(req.file);

    await pool.query(
      `INSERT INTO users
       (full_name, phone, email, password, license_number, plate_number, passport_photo, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'driver', 'pending')`,
      [
        full_name,
        phone,
        email,
        hashed,
        license_number,
        plate_number,
        uploadedPhoto.publicUrl,
      ],
    );

    res
      .status(201)
      .json({ message: "Registration successful. Awaiting admin approval." });
  } catch (err) {
    console.error("Registration error:", err);
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
    res
      .status(500)
      .json({ message: "Server error during registration. Please try again." });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { phone, password } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const [rows] = await pool.query("SELECT * FROM users WHERE phone = $1", [
      normalizedPhone,
    ]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role === "driver" && user.status !== "approved") {
      return res.status(403).json({ message: "Account not approved yet" });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Logged in",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        full_name: user.full_name,
        park_id: user.park_id,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const newRefreshToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      message: "Token refreshed",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

const logout = (req, res) => {
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
};

module.exports = { register, login, refresh, logout };
