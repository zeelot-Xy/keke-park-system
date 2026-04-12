import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CarFront,
  IdCard,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import api from "../lib/api";
import BrandMark from "../components/BrandMark";

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

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const passwordChecks = useMemo(
    () => ({
      minLength: form.password.length >= 8,
      upper: /[A-Z]/.test(form.password),
      lower: /[a-z]/.test(form.password),
      number: /\d/.test(form.password),
      special: /[^A-Za-z\d]/.test(form.password),
    }),
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
          return "Enter a valid Nigerian phone number, e.g. 08031234567 or +2348031234567.";
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
        if (!photo) return "Passport photo is required.";
        if (!photo.type.startsWith("image/")) return "Only image files are allowed.";
        if (photo.size > 2 * 1024 * 1024) return "Image must be 2MB or less.";
        return "";
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
      photo: file ? validateField("photo", file.name) : "Passport photo is required.",
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
      photo: validateField("photo", photo?.name || ""),
    };

    setErrors(nextErrors);
    return Object.values(nextErrors).every((msg) => !msg);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setSubmitting(true);
    const data = new FormData();
    data.append("full_name", form.full_name.trim());
    data.append("phone", normalizePhone(form.phone));
    data.append("email", form.email.trim());
    data.append("password", form.password);
    data.append("license_number", normalizeLicense(form.license_number));
    data.append("plate_number", normalizePlate(form.plate_number));
    data.append("passport_photo", photo);

    try {
      await api.post("/api/auth/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Registration successful! Awaiting admin approval.");
      navigate("/login");
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

  const inputBase =
    "w-full rounded-[1.25rem] border border-[#d8d0bd] bg-white px-4 py-3.5 text-[0.98rem] shadow-sm outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/20";
  const fieldClass = (name) =>
    `${inputBase} ${errors[name] ? "border-[#d95d5d] bg-[#fff5f5] focus:ring-[#d95d5d]/15" : ""}`;

  const passwordItems = [
    { ok: passwordChecks.minLength, label: "At least 8 characters" },
    { ok: passwordChecks.upper, label: "One uppercase letter" },
    { ok: passwordChecks.lower, label: "One lowercase letter" },
    { ok: passwordChecks.number, label: "One number" },
    { ok: passwordChecks.special, label: "One special character" },
  ];

  return (
    <div className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="glass-panel animate-rise-in overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:sticky lg:top-6 lg:h-fit">
            <div className="space-y-6">
              <BrandMark />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6508]">
                  Driver Onboarding
                </p>
                <h1 className="mt-3 text-4xl font-black leading-tight text-[#1d1a14] sm:text-5xl">
                  Join the park with a sharper, faster registration flow.
                </h1>
                <p className="mt-4 text-base leading-8 text-[#6f6758]">
                  Submit your identity details, vehicle information, and passport
                  photo once. After admin approval, you can log in and use the
                  live queue immediately.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  {
                    icon: UserRound,
                    title: "Identity details",
                    copy: "Full name, phone number, and optional email.",
                  },
                  {
                    icon: IdCard,
                    title: "Driver credentials",
                    copy: "Licence and plate details are validated before submission.",
                  },
                  {
                    icon: Camera,
                    title: "Photo verification",
                    copy: "Passport photo upload is required and limited to 2MB.",
                  },
                ].map((item) => {
                  const IconComponent = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.4rem] border border-white/75 bg-white/70 p-4"
                    >
                      <div className="mb-3 inline-flex rounded-2xl bg-[#1b4d2f] p-2.5 text-[#f4c542]">
                        <IconComponent size={18} />
                      </div>
                      <p className="font-bold text-[#1d1a14]">{item.title}</p>
                      <p className="mt-1.5 text-sm leading-6 text-[#6f6758]">
                        {item.copy}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[1.5rem] bg-[#173c26] p-5 text-white">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#f7d36a]">
                  <BadgeCheck size={16} />
                  Approval Flow
                </p>
                <ol className="mt-4 space-y-3 text-sm leading-7 text-white/82">
                  <li>1. Submit the registration form.</li>
                  <li>2. Admin reviews your profile and vehicle details.</li>
                  <li>3. Your park ID is assigned after approval.</li>
                </ol>
              </div>
            </div>
          </section>

          <section className="glass-panel-strong animate-rise-in rounded-[2rem] p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6508]">
                  Registration Form
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#1d1a14] sm:text-4xl">
                  Create your driver profile
                </h2>
              </div>
              <Link
                to="/login"
                className="text-sm font-semibold text-[#1b4d2f] underline decoration-[#f4c542] decoration-2 underline-offset-4"
              >
                Already approved? Login
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <UserRound size={16} className="text-[#1b4d2f]" />
                    Full name
                  </span>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your full name"
                    className={fieldClass("full_name")}
                    maxLength={60}
                  />
                  {errors.full_name && (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.full_name}</p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <Phone size={16} className="text-[#1b4d2f]" />
                    Phone number
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="08031234567"
                    className={fieldClass("phone")}
                    maxLength={14}
                  />
                  {errors.phone && (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.phone}</p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <Mail size={16} className="text-[#1b4d2f]" />
                    Email address
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Optional email"
                    className={fieldClass("email")}
                    maxLength={100}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.email}</p>
                  )}
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <LockKeyhole size={16} className="text-[#1b4d2f]" />
                    Password
                  </span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Create a strong password"
                    className={fieldClass("password")}
                    maxLength={64}
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-[#c43f3f]">{errors.password}</p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {passwordItems.map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-2xl border px-3 py-2 text-sm ${
                          item.ok
                            ? "border-[#1e7a45]/20 bg-[#eff9f2] text-[#1e7a45]"
                            : "border-[#e8dfcf] bg-[#fbf8f1] text-[#7b725f]"
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <IdCard size={16} className="text-[#1b4d2f]" />
                    Licence number
                  </span>
                  <input
                    type="text"
                    name="license_number"
                    value={form.license_number}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Driver licence number"
                    className={fieldClass("license_number")}
                    maxLength={20}
                  />
                  {errors.license_number && (
                    <p className="mt-2 text-sm text-[#c43f3f]">
                      {errors.license_number}
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <CarFront size={16} className="text-[#1b4d2f]" />
                    Plate number
                  </span>
                  <input
                    type="text"
                    name="plate_number"
                    value={form.plate_number}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="ABC-123DE"
                    className={fieldClass("plate_number")}
                    maxLength={9}
                  />
                  {errors.plate_number && (
                    <p className="mt-2 text-sm text-[#c43f3f]">
                      {errors.plate_number}
                    </p>
                  )}
                </label>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-[#d2c6ab] bg-[#fffdfa] p-4 sm:p-5">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <Camera size={16} className="text-[#1b4d2f]" />
                    Passport photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className={`block w-full rounded-[1.2rem] border bg-white px-4 py-3 text-sm ${
                      errors.photo
                        ? "border-[#d95d5d] bg-[#fff5f5]"
                        : "border-[#d8d0bd]"
                    }`}
                  />
                </label>
                <p className="mt-3 text-sm leading-6 text-[#6f6758]">
                  Use a clear face photo in JPG, PNG, or WEBP format. Maximum
                  file size is 2MB.
                </p>
                {errors.photo && (
                  <p className="mt-2 text-sm text-[#c43f3f]">{errors.photo}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-3 rounded-[1.4rem] bg-[#1b4d2f] px-6 py-4 text-lg font-bold text-white shadow-[0_18px_36px_rgba(27,77,47,0.24)] transition hover:-translate-y-0.5 hover:bg-[#143a24] disabled:cursor-not-allowed disabled:bg-[#91a393]"
              >
                {submitting ? "Submitting..." : "Submit Registration"}
                {!submitting && (
                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
