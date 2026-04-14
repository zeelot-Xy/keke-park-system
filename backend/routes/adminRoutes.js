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
  getAllDrivers,
  requestDriverDeletion,
  confirmDriverDeletion,
  cancelDriverDeletion,
  deleteRejectedDriver,
} = require("../controllers/adminController");

router.get(
  "/pending-drivers",
  authenticate,
  authorizeRole(["admin"]),
  getPendingDrivers,
);
router.get("/drivers", authenticate, authorizeRole(["admin"]), getAllDrivers);
router.post(
  "/drivers/:id/request-delete",
  authenticate,
  authorizeRole(["admin"]),
  requestDriverDeletion,
);
router.post(
  "/drivers/:id/confirm-delete",
  authenticate,
  authorizeRole(["admin"]),
  confirmDriverDeletion,
);
router.post(
  "/drivers/:id/cancel-delete",
  authenticate,
  authorizeRole(["admin"]),
  cancelDriverDeletion,
);
router.delete(
  "/drivers/:id/rejected",
  authenticate,
  authorizeRole(["admin"]),
  deleteRejectedDriver,
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
