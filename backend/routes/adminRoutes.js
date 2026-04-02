const express = require("express");
const router = express.Router();
const { authenticate, authorizeRole } = require("../middleware/auth");
const {
  getPendingDrivers,
  approveDriver,
  rejectDriver,
  getLiveQueue,
  loadFirstDriver,
  completeLoading,
} = require("../controllers/adminController");

router.get(
  "/pending-drivers",
  authenticate,
  authorizeRole(["admin"]),
  getPendingDrivers,
);
router.post(
  "/approve/:id",
  authenticate,
  authorizeRole(["admin"]),
  approveDriver,
);
router.post(
  "/reject/:id",
  authenticate,
  authorizeRole(["admin"]),
  rejectDriver,
);
router.get("/queue", authenticate, authorizeRole(["admin"]), getLiveQueue);
router.post(
  "/load-first",
  authenticate,
  authorizeRole(["admin"]),
  loadFirstDriver,
);
router.post(
  "/complete-loading",
  authenticate,
  authorizeRole(["admin"]),
  completeLoading,
);

module.exports = router;
