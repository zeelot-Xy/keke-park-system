import { useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const initialForm = {
  full_name: "",
  phone: "",
  email: "",
  password: "",
  license_number: "",
  plate_number: "",
};

const patterns = {
  full_name: /^[A-Za-zÀ-ÿ' -]{3,60}$/,
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
    if (cleaned.length <= 6)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}${cleaned.slice(6, 8)}`;
  };

  const validateField = (name, value) => {
    switch (name) {
      case "full_name":
        if (!value.trim()) return "Full name is required.";
        if (!patterns.full_name.test(value.trim())) {
          return "Use 3–60 letters only. Spaces, apostrophes, and hyphens are allowed.";
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
        if (!patterns.email.test(value.trim())) {
          return "Enter a valid email address.";
        }
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
          return "Use 8–20 uppercase letters and numbers only.";
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
        if (!photo.type.startsWith("image/"))
          return "Only image files are allowed.";
        if (photo.size > 2 * 1024 * 1024) return "Image must be 2MB or less.";
        return "";

      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "license_number") nextValue = normalizeLicense(value);
    if (name === "plate_number") nextValue = normalizePlate(value);

    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, nextValue),
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhoto(file);
    setErrors((prev) => ({
      ...prev,
      photo: file
        ? validateField("photo", file.name)
        : "Passport photo is required.",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      await axios.post("/api/auth/register", data, {
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
    "w-full rounded-2xl border-2 p-4 text-lg outline-none transition";
  const okClass = "border-gray-300 focus:border-[#008000]";
  const errClass = "border-red-500 focus:border-red-500 bg-red-50";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFED00] to-white p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚕🇳🇬</div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">
            Driver Registration
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Use a valid Nigerian phone number and plate format like ABC-123DE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Full Name"
              className={`${inputBase} ${errors.full_name ? errClass : okClass}`}
              maxLength={60}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          <div>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Phone e.g. 08031234567"
              className={`${inputBase} ${errors.phone ? errClass : okClass}`}
              maxLength={14}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Email (optional)"
              className={`${inputBase} ${errors.email ? errClass : okClass}`}
              maxLength={100}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Strong Password"
              className={`${inputBase} ${errors.password ? errClass : okClass}`}
              maxLength={64}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <p
                className={
                  passwordChecks.minLength ? "text-green-600" : "text-gray-500"
                }>
                • At least 8 characters
              </p>
              <p
                className={
                  passwordChecks.upper ? "text-green-600" : "text-gray-500"
                }>
                • One uppercase letter
              </p>
              <p
                className={
                  passwordChecks.lower ? "text-green-600" : "text-gray-500"
                }>
                • One lowercase letter
              </p>
              <p
                className={
                  passwordChecks.number ? "text-green-600" : "text-gray-500"
                }>
                • One number
              </p>
              <p
                className={
                  passwordChecks.special ? "text-green-600" : "text-gray-500"
                }>
                • One special character
              </p>
            </div>
          </div>

          <div>
            <input
              type="text"
              name="license_number"
              value={form.license_number}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Driver's Licence Number"
              className={`${inputBase} ${errors.license_number ? errClass : okClass}`}
              maxLength={20}
            />
            {errors.license_number && (
              <p className="mt-1 text-sm text-red-600">
                {errors.license_number}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Letters and numbers only, 8–20 characters.
            </p>
          </div>

          <div>
            <input
              type="text"
              name="plate_number"
              value={form.plate_number}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Plate Number e.g. ABC-123DE"
              className={`${inputBase} ${errors.plate_number ? errClass : okClass}`}
              maxLength={9}
            />
            {errors.plate_number && (
              <p className="mt-1 text-sm text-red-600">{errors.plate_number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passport Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className={`block w-full text-lg rounded-2xl border-2 p-3 ${
                errors.photo ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.photo && (
              <p className="mt-1 text-sm text-red-600">{errors.photo}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG, or WEBP. Maximum 2MB.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#008000] hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl text-xl">
            {submitting ? "Submitting..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
