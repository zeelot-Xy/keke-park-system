const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { authenticate, authorizeRole } = require("../middleware/auth");
const {
  getProfile,
  makePayment,
  joinQueue,
  getQueuePosition,
} = require("../controllers/driverController");

const joinQueueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many queue join attempts. Please try again later." },
});

router.get("/profile", authenticate, authorizeRole(["driver"]), getProfile);
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
