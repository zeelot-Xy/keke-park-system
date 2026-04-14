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

jest.mock("../services/passportStorage", () => ({
  uploadPassportPhoto: jest.fn(),
}));

jest.mock("../services/emailVerificationService", () => ({
  buildRedirectUrl: jest.fn(
    (status) => `http://localhost:5173/login?verified=${status}`,
  ),
  buildVerificationUrl: jest.fn(
    () => "https://backend.example.com/api/auth/verify-email?token=test-token",
  ),
  createVerificationToken: jest.fn(() => ({
    rawToken: "raw-token",
    hashedToken: "hashed-token",
  })),
  hashVerificationToken: jest.fn((token) => `hashed:${token}`),
  isEmailVerificationConfigured: jest.fn(() => true),
  sendVerificationEmail: jest.fn(),
}));

const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { uploadPassportPhoto } = require("../services/passportStorage");
const {
  createVerificationToken,
  hashVerificationToken,
  sendVerificationEmail,
} = require("../services/emailVerificationService");
const { createResponse } = require("./helpers/httpMocks");
const { login, register, verifyEmail } = require("../controllers/authController");

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

  test("register sends verification email when valid email is provided", async () => {
    bcrypt.hash.mockResolvedValueOnce("hashed-password");
    uploadPassportPhoto.mockResolvedValueOnce({
      publicUrl: "https://images.example.com/passport.jpg",
    });
    pool.query.mockResolvedValueOnce([[], { rowCount: 1 }]);
    sendVerificationEmail.mockResolvedValueOnce({
      sent: true,
      attempted: true,
      reason: "sent",
    });

    const req = {
      body: {
        full_name: "Test Driver",
        phone: "08012345678",
        email: "driver@example.com",
        password: "StrongPass1!",
        license_number: "DRV1234567",
        plate_number: "ABC-123DE",
      },
      file: { originalname: "passport.jpg" },
      get: jest.fn((header) => {
        if (header === "x-forwarded-proto") return "https";
        if (header === "host") return "backend.example.com";
        return "";
      }),
      protocol: "https",
    };
    const res = createResponse();

    await register(req, res);

    expect(createVerificationToken).toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("email_verification_token"),
      [
        "Test Driver",
        "+2348012345678",
        "driver@example.com",
        "hashed-password",
        "DRV1234567",
        "ABC-123DE",
        "https://images.example.com/passport.jpg",
        "hashed-token",
        expect.any(String),
      ],
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      toEmail: "driver@example.com",
      toName: "Test Driver",
      verificationUrl:
        "https://backend.example.com/api/auth/verify-email?token=test-token",
    });
    expect(res.statusCode).toBe(201);
    expect(res.payload.verificationEmailSent).toBe(true);
    expect(res.payload.verification).toEqual({
      attempted: true,
      sent: true,
      fallback: "manual_approval",
      reason: "sent",
    });
  });

  test("register returns send_failed verification state when email dispatch fails", async () => {
    bcrypt.hash.mockResolvedValueOnce("hashed-password");
    uploadPassportPhoto.mockResolvedValueOnce({
      publicUrl: "https://images.example.com/passport.jpg",
    });
    pool.query.mockResolvedValueOnce([[], { rowCount: 1 }]);
    sendVerificationEmail.mockRejectedValueOnce(new Error("provider failed"));

    const req = {
      body: {
        full_name: "Test Driver",
        phone: "08012345678",
        email: "driver@example.com",
        password: "StrongPass1!",
        license_number: "DRV1234567",
        plate_number: "ABC-123DE",
      },
      file: { originalname: "passport.jpg" },
      get: jest.fn((header) => {
        if (header === "x-forwarded-proto") return "https";
        if (header === "host") return "backend.example.com";
        return "";
      }),
      protocol: "https",
    };
    const res = createResponse();

    await register(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.payload.verification).toEqual({
      attempted: true,
      sent: false,
      fallback: "manual_approval",
      reason: "send_failed",
    });
    expect(res.payload.message).toMatch(/waiting for admin approval within 24 hours/i);
  });

  test("register returns no_email verification state when email is omitted", async () => {
    bcrypt.hash.mockResolvedValueOnce("hashed-password");
    uploadPassportPhoto.mockResolvedValueOnce({
      publicUrl: "https://images.example.com/passport.jpg",
    });
    pool.query.mockResolvedValueOnce([[], { rowCount: 1 }]);

    const req = {
      body: {
        full_name: "Test Driver",
        phone: "08012345678",
        email: "",
        password: "StrongPass1!",
        license_number: "DRV1234567",
        plate_number: "ABC-123DE",
      },
      file: { originalname: "passport.jpg" },
      get: jest.fn(),
      protocol: "https",
    };
    const res = createResponse();

    await register(req, res);

    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.payload.verification).toEqual({
      attempted: false,
      sent: false,
      fallback: "manual_approval",
      reason: "no_email",
    });
  });

  test("verifyEmail auto-approves a pending driver and redirects to success", async () => {
    global.io = { emit: jest.fn() };
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 9,
            status: "pending",
            email_verification_token: "hashed:raw-token",
            email_verified_at: null,
          },
        ],
      ])
      .mockResolvedValueOnce([[], { rowCount: 1 }]);

    const req = {
      query: { token: "raw-token" },
    };
    const res = createResponse();

    await verifyEmail(req, res);

    expect(hashVerificationToken).toHaveBeenCalledWith("raw-token");
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("email_verified_at = NOW()"),
      [9],
    );
    expect(global.io.emit).toHaveBeenCalledWith("queueUpdated");
    expect(res.redirectUrl).toBe(
      "http://localhost:5173/login?verified=success",
    );
  });
});
