const crypto = require("crypto");
const emailjs = require("@emailjs/nodejs");

const EMAILJS_ENABLED =
  !!process.env.EMAILJS_SERVICE_ID &&
  !!process.env.EMAILJS_TEMPLATE_ID &&
  !!process.env.EMAILJS_PUBLIC_KEY &&
  !!process.env.EMAILJS_PRIVATE_KEY &&
  !!process.env.EMAIL_FROM_NAME;

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashVerificationToken(rawToken),
  };
};

const resolveBackendBaseUrl = (req) => {
  if (process.env.PUBLIC_BACKEND_URL) {
    return process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
};

const resolveFrontendBaseUrl = () =>
  (process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, "");

const buildVerificationUrl = (req, token) =>
  `${resolveBackendBaseUrl(req)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

const buildRedirectUrl = (status) =>
  `${resolveFrontendBaseUrl()}/login?verified=${encodeURIComponent(status)}`;

const sendVerificationEmail = async ({ toEmail, toName, verificationUrl }) => {
  if (!EMAILJS_ENABLED) {
    return { sent: false, reason: "EMAILJS_NOT_CONFIGURED" };
  }

  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    process.env.EMAILJS_TEMPLATE_ID,
    {
      to_name: toName,
      to_email: toEmail,
      verification_url: verificationUrl,
      app_name: "Keke Park System",
      from_name: process.env.EMAIL_FROM_NAME,
    },
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY,
      privateKey: process.env.EMAILJS_PRIVATE_KEY,
    },
  );

  return { sent: true };
};

module.exports = {
  buildRedirectUrl,
  buildVerificationUrl,
  createVerificationToken,
  hashVerificationToken,
  sendVerificationEmail,
};
