const express = require("express");
const router = express.Router();
const { authenticate, authorizeRole } = require("../middleware/auth");
const {
  getProfile,
  makePayment,
  joinQueue,
  getQueuePosition,
} = require("../controllers/driverController");

router.get("/profile", authenticate, authorizeRole(["driver"]), getProfile);
router.post("/payment", authenticate, authorizeRole(["driver"]), makePayment);
router.post("/join-queue", authenticate, authorizeRole(["driver"]), joinQueue);
router.get(
  "/queue-position",
  authenticate,
  authorizeRole(["driver"]),
  getQueuePosition,
);

module.exports = router;
