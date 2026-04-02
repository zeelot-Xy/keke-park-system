const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  register,
  login,
  refresh,
  logout,
} = require("../controllers/authController");
const { body } = require("express-validator");
const pool = require("../db/connection"); // ← Import pool
const { authenticate } = require("../middleware/auth"); // ← Import authenticate

// Register route - Multer must come BEFORE validation
router.post(
  "/register",
  upload.single("passport_photo"),
  [
    body("full_name")
      .trim()
      .isLength({ min: 3, max: 60 })
      .matches(/^[A-Za-zÀ-ÿ' -]+$/)
      .withMessage("Full name must be 3–60 letters only."),

    body("phone")
      .trim()
      .matches(/^(?:\+234|0)[789][01]\d{8}$/)
      .withMessage("Enter a valid Nigerian phone number."),

    body("email")
      .optional({ values: "falsy" })
      .isEmail()
      .withMessage("Enter a valid email address."),

    body("password")
      .isLength({ min: 8, max: 64 })
      .matches(/(?=.*[a-z])/)
      .matches(/(?=.*[A-Z])/)
      .matches(/(?=.*\d)/)
      .matches(/(?=.*[^A-Za-z\d])/)
      .withMessage(
        "Password must contain uppercase, lowercase, number, and special character.",
      ),

    body("license_number")
      .trim()
      .matches(/^[A-Z0-9]{8,20}$/)
      .withMessage("Licence number must be 8–20 uppercase letters/numbers."),

    body("plate_number")
      .trim()
      .matches(/^[A-Z]{3}-\d{3}[A-Z]{2}$/)
      .withMessage("Plate number must follow the format ABC-123DE."),
  ],
  register,
);

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/me", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, role, full_name, phone, email, park_id, status FROM users WHERE id = ?",
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error in /me route:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
