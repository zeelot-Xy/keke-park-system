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
const { approveDriverWithParkId } = require("../services/driverApprovalService");
const {
  buildRedirectUrl,
  buildVerificationUrl,
  createVerificationToken,
  hashVerificationToken,
  isEmailVerificationConfigured,
  sendVerificationEmail,
} = require("../services/emailVerificationService");

const isUniqueViolation = (error) => error?.code === "23505";
const isStorageFailure = (error) => error?.code === "PASSPORT_UPLOAD_FAILED";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getVerificationMessage = (reason) => {
  switch (reason) {
    case "sent":
      return "Registration successful. Check your email to verify your account. If verification is delayed, admin approval may still happen within 24 hours.";
    case "send_failed":
    case "email_not_configured":
      return "Registration successful. We could not send the verification email right now. Your account is now waiting for admin approval within 24 hours.";
    case "no_email":
    default:
      return "Registration successful. Your account is now waiting for admin approval within 24 hours.";
  }
};

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
    let verificationToken = null;

    if (email) {
      verificationToken = createVerificationToken();
    }

    await pool.query(
      `INSERT INTO users
       (full_name, phone, email, password, license_number, plate_number, passport_photo, role, status, email_verification_token, email_verification_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'driver', 'pending', $8, $9)`,
      [
        full_name,
        phone,
        email,
        hashed,
        license_number,
        plate_number,
        uploadedPhoto.publicUrl,
        verificationToken?.hashedToken || null,
        verificationToken ? new Date().toISOString() : null,
      ],
    );

    let verification = {
      attempted: false,
      sent: false,
      fallback: "manual_approval",
      reason: email ? "send_failed" : "no_email",
    };

    if (email && verificationToken) {
      console.info("Verification email dispatch starting", {
        email,
        configured: isEmailVerificationConfigured(),
      });
      try {
        const verificationUrl = buildVerificationUrl(req, verificationToken.rawToken);
        const emailResult = await sendVerificationEmail({
          toEmail: email,
          toName: full_name,
          verificationUrl,
        });
        verification = {
          attempted: !!emailResult.attempted,
          sent: !!emailResult.sent,
          fallback: "manual_approval",
          reason: emailResult.reason || (emailResult.sent ? "sent" : "send_failed"),
        };
        console.info("Verification email dispatch completed", {
          email,
          attempted: verification.attempted,
          sent: verification.sent,
          reason: verification.reason,
        });
      } catch (emailError) {
        console.error("Verification email error:", emailError);
        verification = {
          attempted: true,
          sent: false,
          fallback: "manual_approval",
          reason: "send_failed",
        };
      }
    }

    res.status(201).json({
      message: getVerificationMessage(verification.reason),
      verification,
      verificationEmailSent: verification.sent,
    });
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
    const { identifier, password } = req.body;
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const isEmailLogin = emailPattern.test(normalizedIdentifier);
    const query = isEmailLogin
      ? "SELECT * FROM users WHERE LOWER(email) = $1"
      : "SELECT * FROM users WHERE phone = $1";
    const lookupValue = isEmailLogin
      ? normalizedIdentifier
      : normalizePhone(identifier);
    const [rows] = await pool.query(query, [lookupValue]);
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

const verifyEmail = async (req, res) => {
  const token = req.query?.token;

  if (!token) {
    return res.redirect(buildRedirectUrl("missing-token"));
  }

  try {
    const hashedToken = hashVerificationToken(token);
    const [rows] = await pool.query(
      `SELECT id, status, email_verification_token, email_verified_at
       FROM users
       WHERE email_verification_token = $1
       LIMIT 1`,
      [hashedToken],
    );

    if (!rows.length) {
      return res.redirect(buildRedirectUrl("invalid-token"));
    }

    const user = rows[0];

    if (user.email_verified_at) {
      return res.redirect(buildRedirectUrl("already-verified"));
    }

    if (user.status === "rejected") {
      return res.redirect(buildRedirectUrl("manual-review-required"));
    }

    await pool.query(
      `UPDATE users
       SET email_verified_at = NOW(),
           email_verification_token = NULL
       WHERE id = $1`,
      [user.id],
    );

    if (user.status === "pending") {
      const approvalResult = await approveDriverWithParkId(user.id);
      if (approvalResult.outcome !== "approved") {
        console.error("Email verification approval error:", approvalResult);
        return res.redirect(buildRedirectUrl("server-error"));
      }
    }

    global.io.emit("queueUpdated");
    return res.redirect(buildRedirectUrl("success"));
  } catch (err) {
    console.error("Verify email error:", err);
    return res.redirect(buildRedirectUrl("server-error"));
  }
};

module.exports = { register, login, refresh, logout, verifyEmail };
