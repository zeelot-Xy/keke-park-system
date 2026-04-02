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
    body("full_name").trim().notEmpty().withMessage("Full name is required"),
    body("phone").trim().notEmpty().withMessage("Phone number is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("license_number")
      .trim()
      .notEmpty()
      .withMessage("License number is required"),
    body("plate_number")
      .trim()
      .notEmpty()
      .withMessage("Plate number is required"),
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
