import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  Camera,
  CarFront,
  CheckCircle2,
  Circle,
  FileText,
  Mail,
  Phone,
  User,
  Zap,
} from "lucide-react";
import api from "../lib/api";
import PasswordField from "../components/PasswordField";
import InlineNotice from "../components/InlineNotice";

const initialForm = {
  full_name: "",
  phone: "",
  email: "",
  password: "",
  license_number: "",
  plate_number: "",
};

const patterns = {
  full_name: /^[A-Za-z' -]{3,60}$/,
  phone: /^(?:\+234|0)[789][01]\d{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/,
  license_number: /^[A-Z0-9]{8,20}$/,
  plate_number: /^[A-Z]{3}-\d{3}[A-Z]{2}$/,
};

const onboardingSteps = [
  {
    number: 1,
    title: "Submit Your Details",
    copy: "Provide your information and valid documents",
    active: true,
  },
  {
    number: 2,
    title: "Admin Review",
    copy: "Park admin verifies your credentials",
    active: false,
  },
  {
    number: 3,
    title: "Get Approved",
    copy: "Receive notification and start working",
    active: false,
  },
];

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const verificationMessages = {
    sent:
      "Registration successful. Check your email to verify your account. If verification is delayed, admin approval may still happen within 24 hours.",
    send_failed:
      "Registration successful. We could not send the verification email right now. Your account is now waiting for admin approval within 24 hours.",
    email_not_configured:
      "Registration successful. We could not send the verification email right now. Your account is now waiting for admin approval within 24 hours.",
    no_email:
      "Registration successful. Your account is now waiting for admin approval within 24 hours.",
  };

  const verificationToasts = {
    sent: "Registration successful! Check your email to verify.",
    send_failed: "Registration successful! Awaiting admin approval within 24 hours.",
    email_not_configured:
      "Registration successful! Awaiting admin approval within 24 hours.",
    no_email: "Registration successful! Awaiting admin approval within 24 hours.",
  };

  const passwordChecks = useMemo(
    () => [
      { text: "At least 8 characters", met: form.password.length >= 8 },
      { text: "Contains uppercase letter", met: /[A-Z]/.test(form.password) },
      { text: "Contains lowercase letter", met: /[a-z]/.test(form.password) },
      { text: "Contains number", met: /\d/.test(form.password) },
    ],
    [form.password],
  );

  const normalizePhone = (value) => {
    const trimmed = value.replace(/\s+/g, "");
    if (trimmed.startsWith("+234")) return trimmed;
    if (trimmed.startsWith("234")) return `+${trimmed}`;
    return trimmed;
  };

  const normalizeLicense = (value) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const normalizePlate = (value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}${cleaned.slice(6, 8)}`;
  };

  const validatePhoto = (file) => {
    if (!file) return "Passport photo is required.";
    if (!file.type?.startsWith("image/")) return "Only image files are allowed.";
    if (file.size > 2 * 1024 * 1024) return "Image must be 2MB or less.";
    return "";
  };

  const validateField = (name, value) => {
    switch (name) {
      case "full_name":
        if (!value.trim()) return "Full name is required.";
        if (!patterns.full_name.test(value.trim())) {
          return "Use 3-60 letters only. Spaces, apostrophes, and hyphens are allowed.";
        }
        return "";
      case "phone":
        if (!value.trim()) return "Phone number is required.";
        if (!patterns.phone.test(normalizePhone(value))) {
          return "Enter a valid Nigerian phone number.";
        }
        return "";
      case "email":
        if (!value.trim()) return "";
        if (!patterns.email.test(value.trim())) return "Enter a valid email address.";
        return "";
      case "password":
        if (!value) return "Password is required.";
        if (!patterns.password.test(value)) {
          return "Use 8+ characters with uppercase, lowercase, number, and special character.";
        }
        return "";
      case "license_number":
        if (!value.trim()) return "Driver's licence number is required.";
        if (!patterns.license_number.test(normalizeLicense(value))) {
          return "Use 8-20 uppercase letters and numbers only.";
        }
        return "";
      case "plate_number":
        if (!value.trim()) return "Plate number is required.";
        if (!patterns.plate_number.test(normalizePlate(value))) {
          return "Use the format ABC-123DE.";
        }
        return "";
      case "photo":
        return validatePhoto(value);
      default:
        return "";
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "license_number") nextValue = normalizeLicense(value);
    if (name === "plate_number") nextValue = normalizePlate(value);

    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, nextValue) }));
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    setErrors((prev) => ({
      ...prev,
      photo: validatePhoto(file),
    }));
  };

  const validateForm = () => {
    const nextErrors = {
      full_name: validateField("full_name", form.full_name),
      phone: validateField("phone", form.phone),
      email: validateField("email", form.email),
      password: validateField("password", form.password),
      license_number: validateField("license_number", form.license_number),
      plate_number: validateField("plate_number", form.plate_number),
      photo: validatePhoto(photo),
    };

    setErrors(nextErrors);
    return Object.values(nextErrors).every((message) => !message);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append("full_name", form.full_name.trim());
      data.append("phone", normalizePhone(form.phone));
      data.append("email", form.email.trim());
      data.append("password", form.password);
      data.append("license_number", normalizeLicense(form.license_number));
      data.append("plate_number", normalizePlate(form.plate_number));
      data.append("passport_photo", photo);

      const response = await api.post("/api/auth/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const verificationReason =
        response.data?.verification?.reason || "no_email";
      const nextMessage =
        verificationMessages[verificationReason] || verificationMessages.no_email;
      setSuccessMessage(nextMessage);
      toast.success(
        verificationToasts[verificationReason] || verificationToasts.no_email,
      );
      setTimeout(() => {
        navigate("/login", { state: { notice: nextMessage } });
      }, 700);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        "Registration failed.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative hidden overflow-hidden bg-linear-to-br from-[#1B4D2F] via-[#14532D] to-[#1B4D2F] lg:flex lg:w-2/5 lg:flex-col lg:justify-between lg:p-12"
        >
          <div className="absolute top-10 right-10 h-72 w-72 rounded-full bg-[#F4C542]/10 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-[#F4C542]/5 blur-3xl" />

          <div className="relative z-10">
            <Link
              to="/login"
              className="mb-16 flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4C542] shadow-lg">
                <Zap className="h-8 w-8 text-[#14532D]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Keke Park</h1>
                <p className="text-sm font-medium text-white/70">
                  Driver Registration
                </p>
              </div>
            </Link>

            <h2 className="mb-8 text-4xl leading-tight font-extrabold text-white">
              Join the
              <br />
              digital queue
            </h2>

            <div className="mb-12 space-y-6">
              {onboardingSteps.map((step) => (
                <div key={step.number} className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold ${
                      step.active
                        ? "bg-[#F4C542] text-[#14532D]"
                        : "bg-[#F4C542]/30 text-white"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold text-white">{step.title}</h3>
                    <p className="text-sm text-white/70">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm text-white/90">
                <span className="font-semibold">Note:</span> Add a valid email
                to get a verification link for automatic approval. Without
                email verification, admin review still applies.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-sm text-white/50">
              Secure registration • Data protected
            </p>
          </div>
        </Motion.section>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full max-w-xl"
          >
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B4D2F]">
                <Zap className="h-7 w-7 text-[#F4C542]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#14532D]">
                  Keke Park
                </h1>
                <p className="text-xs text-[#6F6758]">Driver Registration</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-xl shadow-black/5 lg:p-10">
              <h2 className="mb-2 text-3xl font-extrabold text-[#1D1A14]">
                Create Account
              </h2>
              <p className="mb-8 text-[#6F6758]">
                Fill in your details to register as a driver
              </p>

              {successMessage ? (
                <InlineNotice
                  type="success"
                  message={successMessage}
                  className="mb-6"
                />
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Full Name
                  </span>
                  <div className="relative">
                    <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="text"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Chukwudi Okafor"
                      className="w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20"
                    />
                  </div>
                  {errors.full_name ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.full_name}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Phone Number
                  </span>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="080 1234 5678"
                      className="w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20"
                    />
                  </div>
                  {errors.phone ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.phone}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Email Address
                  </span>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="chukwudi@example.com"
                      className="w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20"
                    />
                  </div>
                  {errors.email ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.email}</p>
                  ) : null}
                </label>

                <div>
                  <PasswordField
                    label="Password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Create a strong password"
                    inputClassName="rounded-xl border-2 border-[#D8D0BD] py-3.5 focus-within:border-[#F4C542] focus-within:ring-[#F4C542]/20"
                    error={errors.password}
                    required
                  />

                  {form.password ? (
                    <div className="mt-3 space-y-2">
                      {passwordChecks.map((rule) => (
                        <div key={rule.text} className="flex items-center gap-2">
                          {rule.met ? (
                            <CheckCircle2 className="h-4 w-4 text-[#1E7A45]" />
                          ) : (
                            <Circle className="h-4 w-4 text-[#D8D0BD]" />
                          )}
                          <span
                            className={`text-xs ${
                              rule.met ? "text-[#1E7A45]" : "text-[#6F6758]"
                            }`}
                          >
                            {rule.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Driver&apos;s License Number
                  </span>
                  <div className="relative">
                    <FileText className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="text"
                      name="license_number"
                      value={form.license_number}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="LAG123456789"
                      className="w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20"
                    />
                  </div>
                  {errors.license_number ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">
                      {errors.license_number}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Keke Plate Number
                  </span>
                  <div className="relative">
                    <CarFront className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="text"
                      name="plate_number"
                      value={form.plate_number}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="ABC-123DE"
                      className="w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20"
                    />
                  </div>
                  {errors.plate_number ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">
                      {errors.plate_number}
                    </p>
                  ) : null}
                </label>

                <div>
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Passport Photograph
                  </span>
                  <div className="relative">
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="group flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D8D0BD] bg-white transition-all hover:border-[#F4C542] hover:bg-[#FFFBEA]"
                    >
                      <Camera className="mb-2 h-10 w-10 text-[#6F6758] transition-colors group-hover:text-[#F4C542]" />
                      <p className="text-sm font-semibold text-[#6F6758] transition-colors group-hover:text-[#1D1A14]">
                        {photo ? photo.name : "Click to upload photo"}
                      </p>
                      <p className="mt-1 text-xs text-[#6F6758]">
                        JPG, PNG up to 2MB
                      </p>
                    </label>
                  </div>
                  {errors.photo ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.photo}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full rounded-xl bg-[#F4C542] py-4 font-bold text-[#1D1A14] shadow-lg shadow-[#F4C542]/30 transition-all hover:-translate-y-0.5 hover:bg-[#DCA117] hover:shadow-xl hover:shadow-[#F4C542]/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Submitting..." : "Submit Registration"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#6F6758]">
                  Already registered?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[#1B4D2F] underline underline-offset-2 transition-colors hover:text-[#14532D]"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}
