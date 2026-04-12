jest.mock("../db/connection", () => ({
  query: jest.fn(),
}));

const pool = require("../db/connection");
const { createResponse } = require("./helpers/httpMocks");
const { makePayment, joinQueue } = require("../controllers/driverController");

describe("driverController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.io = { emit: jest.fn() };
  });

  test("joinQueue returns structured cooldown info when driver is still cooling down", async () => {
    pool.query
      .mockResolvedValueOnce([[{ 1: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([
        [{ last_join: new Date(Date.now() - 10 * 60 * 1000).toISOString() }],
      ]);

    const req = { user: { id: 10 } };
    const res = createResponse();

    await joinQueue(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.cooldownMinutes).toBeGreaterThan(0);
    expect(res.payload.message).toMatch(/Cooldown active/i);
  });

  test("joinQueue inserts queue and cooldown records when eligible", async () => {
    pool.query
      .mockResolvedValueOnce([[{ 1: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const req = { user: { id: 15 } };
    const res = createResponse();

    await joinQueue(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toBe("Successfully joined the queue");
    expect(global.io.emit).toHaveBeenCalledWith("queueUpdated");
  });

  test("makePayment upserts today's daily payment and emits queue refresh", async () => {
    pool.query.mockResolvedValueOnce([[], { rowCount: 1 }]);

    const req = { user: { id: 22 } };
    const res = createResponse();

    await makePayment(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (driver_id, payment_date)"),
      [22, expect.any(String)],
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toBe("Daily payment successful for today");
    expect(global.io.emit).toHaveBeenCalledWith("queueUpdated");
  });
});
