const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

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

  // Normalize inputs
  full_name = full_name.trim();
  if (phone.startsWith("0")) {
    phone = "+234" + phone.slice(1);
  }
  // EMAIL
  if (email) {
    email = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
  } else {
    email = null;
  }

  // Licence
  license_number = license_number.toUpperCase().replace(/[^A-Z0-9]/g, "");

  plate_number = plate_number.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Reformat plate to ABC-123DE
  if (plate_number.length >= 8) {
    plate_number = `${plate_number.slice(0, 3)}-${plate_number.slice(
      3,
      6,
    )}${plate_number.slice(6, 8)}`;
  }
  const passport_photo = req.file ? `/uploads/${req.file.filename}` : null;

  if (!passport_photo) {
    return res.status(400).json({ message: "Passport photo is required" });
  }

  const hashed = await bcrypt.hash(password, 12);

  try {
    await pool.query(
      `INSERT INTO users 
       (full_name, phone, email, password, license_number, plate_number, passport_photo, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'driver', 'pending')`,
      [
        full_name,
        phone,
        email || null,
        hashed,
        license_number,
        plate_number,
        passport_photo,
      ],
    );

    res
      .status(201)
      .json({ message: "Registration successful. Awaiting admin approval." });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message:
          "Phone, license number or plate number already exists. Try different values.",
      });
    }
    res
      .status(500)
      .json({ message: "Server error during registration. Please try again." });
  }
};
const login = async (req, res) => {
  const { phone, password } = req.body;
  const [rows] = await pool.query("SELECT * FROM users WHERE phone = ?", [
    phone,
  ]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  if (user.role === "driver" && user.status !== "approved")
    return res.status(403).json({ message: "Account not approved yet" });

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

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({
    message: "Logged in",
    user: {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      park_id: user.park_id,
    },
  });
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
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

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ message: "Token refreshed" });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

const logout = (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
};

module.exports = { register, login, refresh, logout };
