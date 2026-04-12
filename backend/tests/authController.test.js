jest.mock("../db/connection", () => ({
  query: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
}));

const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { createResponse } = require("./helpers/httpMocks");
const { login } = require("../controllers/authController");

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    process.env.NODE_ENV = "test";
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
  });

  test("login accepts local Nigerian number format and looks up normalized phone", async () => {
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 7,
          role: "admin",
          full_name: "Admin User",
          park_id: null,
          phone: "+2348000000001",
          status: "approved",
          password: "hashed-password",
        },
      ],
    ]);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign
      .mockReturnValueOnce("access-token")
      .mockReturnValueOnce("refresh-token");

    const req = {
      body: { phone: "08000000001", password: "admin123" },
    };
    const res = createResponse();

    await login(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE phone = $1",
      ["+2348000000001"],
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload.user.phone).toBe("+2348000000001");
    expect(res.cookies).toHaveLength(2);
  });

  test("login returns validation errors for malformed phone input", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => false,
      array: () => [
        { path: "phone", msg: "Enter a valid Nigerian phone number." },
      ],
    });

    const req = {
      body: { phone: "12345", password: "admin123" },
    };
    const res = createResponse();

    await login(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe("Validation failed");
  });
});
