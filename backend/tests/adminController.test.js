jest.mock("../db/connection", () => ({
  query: jest.fn(),
}));

const pool = require("../db/connection");
const { createResponse } = require("./helpers/httpMocks");
const { approveDriver } = require("../controllers/adminController");

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
});
