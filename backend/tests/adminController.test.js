jest.mock("../db/connection", () => ({
  query: jest.fn(),
}));
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const { createResponse } = require("./helpers/httpMocks");
const {
  approveDriver,
  completeLoading,
  requestDriverDeletion,
  confirmDriverDeletion,
  cancelDriverDeletion,
  deleteRejectedDriver,
} = require("../controllers/adminController");

describe("adminController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.io = { emit: jest.fn() };
  });

  test("approveDriver assigns the next park id to pending drivers", async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id: 14, status: "pending", role: "driver", park_id: null }],
      ])
      .mockResolvedValueOnce([[{ lastParkNumber: 17 }]])
      .mockResolvedValueOnce([[], { rowCount: 1 }]);

    const req = { params: { id: "14" } };
    const res = createResponse();

    await approveDriver(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('AS "lastParkNumber"'),
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET status = 'approved', park_id = $1"),
      ["KKP-0018", "14"],
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload.park_id).toBe("KKP-0018");
    expect(global.io.emit).toHaveBeenCalledWith("queueUpdated");
  });

  test("approveDriver blocks non-pending drivers", async () => {
    pool.query.mockResolvedValueOnce([
      [{ id: 11, status: "approved", role: "driver", park_id: "KKP-0003" }],
    ]);

    const req = { params: { id: "11" } };
    const res = createResponse();

    await approveDriver(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe("Only pending drivers can be approved");
  });

  test("completeLoading blocks completion before 2 minutes have passed", async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 7,
          loading_started_at: new Date(Date.now() - 30 * 1000).toISOString(),
        },
      ],
    ]);

    const req = {};
    const res = createResponse();

    await completeLoading(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.remainingMinutes).toBeGreaterThan(0);
    expect(res.payload.message).toMatch(/at least 2 minutes/i);
  });

  test("requestDriverDeletion verifies admin password and schedules deletion", async () => {
    bcrypt.compare.mockResolvedValueOnce(true);
    pool.query
      .mockResolvedValueOnce([[{ password: "hashed-admin" }]])
      .mockResolvedValueOnce([
        [{ id: 5, role: "driver", full_name: "Test Driver", deletion_requested_at: null, deletion_eligible_at: null }],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 5,
            full_name: "Test Driver",
            deletion_requested_at: "2026-04-12T08:00:00.000Z",
            deletion_eligible_at: "2026-04-15T08:00:00.000Z",
          },
        ],
      ]);

    const req = {
      params: { id: "5" },
      body: { password: "admin123" },
      user: { id: 1, role: "admin" },
    };
    const res = createResponse();

    await requestDriverDeletion(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith("admin123", "hashed-admin");
    expect(res.statusCode).toBe(200);
    expect(res.payload.graceDays).toBe(3);
    expect(res.payload.driver.deletion_state).toBe("scheduled");
  });

  test("confirmDriverDeletion blocks deletion before grace period ends", async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    bcrypt.compare.mockResolvedValueOnce(true);
    pool.query
      .mockResolvedValueOnce([[{ password: "hashed-admin" }]])
      .mockResolvedValueOnce([
        [
          {
            id: 5,
            role: "driver",
            full_name: "Test Driver",
            deletion_requested_at: new Date().toISOString(),
            deletion_eligible_at: futureDate,
          },
        ],
      ]);

    const req = {
      params: { id: "5" },
      body: { password: "admin123" },
      user: { id: 1, role: "admin" },
    };
    const res = createResponse();

    await confirmDriverDeletion(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/grace period/i);
    expect(res.payload.remainingDays).toBeGreaterThan(0);
  });

  test("cancelDriverDeletion clears scheduled deletion metadata", async () => {
    pool.query.mockResolvedValueOnce([
      [{ id: 5, full_name: "Test Driver" }],
      { rowCount: 1 },
    ]);

    const req = { params: { id: "5" } };
    const res = createResponse();

    await cancelDriverDeletion(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toMatch(/cancelled/i);
  });

  test("deleteRejectedDriver permanently removes a rejected driver", async () => {
    pool.query.mockResolvedValueOnce([
      [{ id: 7, full_name: "Rejected Driver" }],
      { rowCount: 1 },
    ]);

    const req = { params: { id: "7" } };
    const res = createResponse();

    await deleteRejectedDriver(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("AND status = 'rejected'"),
      ["7"],
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toMatch(/removed/i);
  });
});
