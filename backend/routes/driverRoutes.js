const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const { authenticate, authorizeRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  getProfile,
  updateProfile,
  makePayment,
  joinQueue,
  getQueuePosition,
} = require("../controllers/driverController");
const {
  normalizePhone,
  normalizeLicenseNumber,
  normalizePlateNumber,
} = require("../utils/normalizers");

const joinQueueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many queue join attempts. Please try again later." },
});

router.get("/profile", authenticate, authorizeRole(["driver"]), getProfile);
router.put(
  "/profile",
  authenticate,
  authorizeRole(["driver"]),
  upload.single("passport_photo"),
  [
    body("full_name")
      .trim()
      .isLength({ min: 3, max: 60 })
      .matches(/^[A-Za-z' -]+$/)
      .withMessage("Full name must be 3-60 letters only."),
    body("phone")
      .customSanitizer((value) => normalizePhone(value))
      .matches(/^\+234[789][01]\d{8}$/)
      .withMessage("Enter a valid Nigerian phone number."),
    body("email")
      .optional({ values: "falsy" })
      .isEmail()
      .withMessage("Enter a valid email address."),
    body("password")
      .optional({ values: "falsy" })
      .isLength({ min: 8, max: 64 })
      .matches(/(?=.*[a-z])/)
      .matches(/(?=.*[A-Z])/)
      .matches(/(?=.*\d)/)
      .matches(/(?=.*[^A-Za-z\d])/)
      .withMessage(
        "Password must contain uppercase, lowercase, number, and special character.",
      ),
    body("license_number")
      .customSanitizer((value) => normalizeLicenseNumber(value))
      .matches(/^[A-Z0-9]{8,20}$/)
      .withMessage("Licence number must be 8-20 uppercase letters/numbers."),
    body("plate_number")
      .customSanitizer((value) => normalizePlateNumber(value))
      .matches(/^[A-Z]{3}-\d{3}[A-Z]{2}$/)
      .withMessage("Plate number must follow the format ABC-123DE."),
  ],
  updateProfile,
);
router.post("/payment", authenticate, authorizeRole(["driver"]), makePayment);
router.post(
  "/join-queue",
  authenticate,
  authorizeRole(["driver"]),
  joinQueueLimiter,
  joinQueue,
);
router.get(
  "/queue-position",
  authenticate,
  authorizeRole(["driver"]),
  getQueuePosition,
);

module.exports = router;
