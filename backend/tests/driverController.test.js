jest.mock("../db/connection", () => ({
  query: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
}));

jest.mock("../services/passportStorage", () => ({
  uploadPassportPhoto: jest.fn(),
}));

const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { uploadPassportPhoto } = require("../services/passportStorage");
const { createResponse } = require("./helpers/httpMocks");
const {
  makePayment,
  joinQueue,
  updateProfile,
} = require("../controllers/driverController");

describe("driverController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.io = { emit: jest.fn() };
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
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

  test("updateProfile updates driver details and optional password", async () => {
    pool.query
      .mockResolvedValueOnce([[
        {
          id: 8,
          full_name: "Old Driver",
          phone: "+2348012345678",
          email: "old@driver.com",
          license_number: "DRV1234567",
          plate_number: "ABC-123DE",
          passport_photo: "https://example.com/old.jpg",
          status: "approved",
        },
      ]])
      .mockResolvedValueOnce([[
        {
          id: 8,
          full_name: "New Driver",
          phone: "+2348098765432",
          email: "new@driver.com",
          park_id: "KKP-0008",
          license_number: "DRV7654321",
          plate_number: "KKE-456FG",
          passport_photo: "https://example.com/new.jpg",
          status: "approved",
        },
      ]]);

    uploadPassportPhoto.mockResolvedValueOnce({
      publicUrl: "https://example.com/new.jpg",
    });
    bcrypt.hash.mockResolvedValueOnce("hashed-password");

    const req = {
      user: { id: 8 },
      body: {
        full_name: "New Driver",
        phone: "08098765432",
        email: "new@driver.com",
        password: "StrongPass1!",
        license_number: "drv7654321",
        plate_number: "kke456fg",
      },
      file: { originalname: "photo.jpg" },
    };
    const res = createResponse();

    await updateProfile(req, res);

    expect(uploadPassportPhoto).toHaveBeenCalledWith(req.file);
    expect(bcrypt.hash).toHaveBeenCalledWith("StrongPass1!", 12);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("password = $7"),
      [
        "New Driver",
        "+2348098765432",
        "new@driver.com",
        "DRV7654321",
        "KKE-456FG",
        "https://example.com/new.jpg",
        "hashed-password",
        8,
      ],
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toBe("Profile updated successfully");
  });
});
