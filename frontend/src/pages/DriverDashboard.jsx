import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  BusFront,
  Camera,
  CarFront,
  Clock3,
  CreditCard,
  IdCard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPinned,
  PencilLine,
  Phone,
  RadioTower,
  Save,
  TimerReset,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import api from "../lib/api";
import { clearAuthTokens } from "../lib/auth";
import { resolveAssetUrl } from "../lib/config";
import { socket } from "../lib/socket";
import BrandMark from "../components/BrandMark";
import PasswordField from "../components/PasswordField";

const initialEditForm = {
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

export default function DriverDashboard({ user, setUser }) {
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [position, setPosition] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editErrors, setEditErrors] = useState({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);

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
    if (!file) return "";
    if (!file.type?.startsWith("image/")) return "Only image files are allowed.";
    if (file.size > 2 * 1024 * 1024) return "Image must be 2MB or less.";
    return "";
  };

  const validateEditField = (name, value) => {
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
        if (!value) return "";
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

  const syncEditForm = (nextProfile) => {
    setEditForm({
      full_name: nextProfile.full_name || "",
      phone: nextProfile.phone || "",
      email: nextProfile.email || "",
      password: "",
      license_number: nextProfile.license_number || "",
      plate_number: nextProfile.plate_number || "",
    });
    setEditErrors({});
    setNewPhoto(null);
  };

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const [profileRes, queueRes] = await Promise.all([
          api.get("/api/driver/profile"),
          api.get("/api/driver/queue-position"),
        ]);
        setProfile(profileRes.data);
        syncEditForm(profileRes.data);
        setPaymentStatus(profileRes.data.payment_status || "pending");
        setPosition(queueRes.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load driver data");
      }
    };

    const handleQueueUpdate = async () => {
      try {
        const res = await api.get("/api/driver/queue-position");
        setPosition(res.data);
      } catch (err) {
        console.error("Queue update error:", err);
      }
    };

    fetchDriverData();
    socket.on("queueUpdated", handleQueueUpdate);

    return () => {
      socket.off("queueUpdated", handleQueueUpdate);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePayment = async () => {
    try {
      await api.post("/api/driver/payment");
      setPaymentStatus("paid");
      toast.success("Payment recorded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    }
  };

  const handleJoinQueue = async () => {
    setLoading(true);

    try {
      await api.post("/api/driver/join-queue");
      toast.success("Joined queue! Position updating live...");
      const res = await api.get("/api/driver/queue-position");
      setPosition(res.data);
      setCooldown(0);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to join";
      const cooldownMinutes = err.response?.data?.cooldownMinutes;

      if (cooldownMinutes) {
        setCooldown(cooldownMinutes);
      } else {
        const match = message.match(/(\d+)\s*minutes/i);
        if (match) {
          setCooldown(Number(match[1]));
        }
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "license_number") nextValue = normalizeLicense(value);
    if (name === "plate_number") nextValue = normalizePlate(value);

    setEditForm((current) => ({ ...current, [name]: nextValue }));
    setEditErrors((current) => ({
      ...current,
      [name]: validateEditField(name, nextValue),
    }));
  };

  const handleEditBlur = (event) => {
    const { name, value } = event.target;
    setEditErrors((current) => ({
      ...current,
      [name]: validateEditField(name, value),
    }));
  };

  const handleNewPhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    setNewPhoto(file);
    setEditErrors((current) => ({
      ...current,
      photo: validatePhoto(file),
    }));
  };

  const validateEditForm = () => {
    const nextErrors = {
      full_name: validateEditField("full_name", editForm.full_name),
      phone: validateEditField("phone", editForm.phone),
      email: validateEditField("email", editForm.email),
      password: validateEditField("password", editForm.password),
      license_number: validateEditField("license_number", editForm.license_number),
      plate_number: validateEditField("plate_number", editForm.plate_number),
      photo: validatePhoto(newPhoto),
    };

    setEditErrors(nextErrors);
    return Object.values(nextErrors).every((message) => !message);
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    if (!validateEditForm()) {
      toast.error("Please correct the highlighted profile fields.");
      return;
    }

    setSavingProfile(true);

    try {
      const data = new FormData();
      data.append("full_name", editForm.full_name.trim());
      data.append("phone", normalizePhone(editForm.phone));
      data.append("email", editForm.email.trim());
      data.append("password", editForm.password);
      data.append("license_number", normalizeLicense(editForm.license_number));
      data.append("plate_number", normalizePlate(editForm.plate_number));

      if (newPhoto) {
        data.append("passport_photo", newPhoto);
      }

      const response = await api.put("/api/driver/profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile((current) => ({
        ...current,
        ...response.data,
        payment_status: current?.payment_status || paymentStatus,
      }));
      syncEditForm(response.data);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        "Could not update profile";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearAuthTokens();
      setUser(null);
      window.location.href = "/login";
    }
  };

  const isInQueue =
    position?.status === "waiting" || position?.status === "loading";
  const isPaid = paymentStatus === "paid";

  const quickStats = [
    {
      icon: WalletCards,
      label: "Payment",
      value: isPaid ? "Confirmed" : "Pending",
      accent: isPaid ? "text-[#1e7a45]" : "text-[#c43f3f]",
      bg: isPaid ? "bg-[#edf8f1]" : "bg-[#fff0f0]",
    },
    {
      icon: Clock3,
      label: "Queue status",
      value:
        position?.status === "loading"
          ? "Loading"
          : position?.position
            ? `Position ${position.position}`
            : "Not in queue",
      accent: "text-[#1d1a14]",
      bg: "bg-white/80",
    },
    {
      icon: TimerReset,
      label: "Cooldown",
      value: cooldown > 0 ? `${cooldown} min` : "Ready",
      accent: cooldown > 0 ? "text-[#c43f3f]" : "text-[#1e7a45]",
      bg: cooldown > 0 ? "bg-[#fff3f0]" : "bg-[#edf8f1]",
    },
  ];

  const inputClassName =
    "w-full rounded-[1.25rem] border border-[#d8d0bd] bg-white px-4 py-3.5 text-[0.98rem] shadow-sm outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/20";

  return (
    <div className="page-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="glass-panel-strong animate-rise-in rounded-[2rem] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <BrandMark compact />
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6508]">
                  Driver Portal
                </p>
                <div>
                  <h1 className="text-3xl font-black text-[#1d1a14] sm:text-4xl">
                    Welcome back, {profile?.full_name || user?.full_name}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6f6758] sm:text-base">
                    <MapPinned size={16} className="text-[#1b4d2f]" />
                    Benue Makurdi Park
                    <span className="hidden sm:inline text-[#b4aa95]">•</span>
                    Park ID {profile?.park_id || user?.park_id || "Pending"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-[#eadfca] bg-white px-4 py-3 text-sm font-semibold text-[#473f34] transition hover:bg-[#fff9eb]"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-[1.8rem] bg-[#f4c542]/25 blur-lg" />
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.8rem] border border-white/70 bg-[#f5efe0] shadow-lg">
                  {profile?.passport_photo ? (
                    <img
                      src={resolveAssetUrl(profile.passport_photo)}
                      alt="Passport"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <BusFront size={36} className="text-[#1b4d2f]" />
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="status-chip bg-[#eef7f1] text-[#1e7a45]">
                    <BadgeCheck size={14} />
                    {profile?.status || user?.status || "approved"}
                  </span>
                  <span className="status-chip bg-[#fff6da] text-[#946a0d]">
                    <RadioTower size={14} />
                    Live queue enabled
                  </span>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-[#8d6508]">
                    Vehicle Identity
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#1d1a14]">
                    {profile?.plate_number || "Plate pending"}
                  </h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[#6f6758] sm:text-base">
                  Complete payment, join the queue, and follow your loading
                  position without refreshing the page.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {quickStats.map((item) => {
                const IconComponent = item.icon;

                return (
                  <div
                    key={item.label}
                    className={`rounded-[1.5rem] border border-white/70 ${item.bg} p-4`}
                  >
                    <div className="mb-3 inline-flex rounded-2xl bg-[#1d1a14] p-2.5 text-[#f4c542]">
                      <IconComponent size={18} />
                    </div>
                    <p className="text-sm text-[#6f6758]">{item.label}</p>
                    <p className={`mt-2 text-lg font-black ${item.accent}`}>
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                    Profile
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#1d1a14]">
                    Keep your details current
                  </h3>
                </div>
                <button
                  onClick={() => {
                    if (!isEditingProfile && profile) {
                      syncEditForm(profile);
                    }
                    setIsEditingProfile((current) => !current);
                  }}
                  className="inline-flex items-center gap-2 rounded-[1.1rem] border border-[#eadfca] bg-white px-4 py-3 text-sm font-semibold text-[#473f34] transition hover:bg-[#fff9eb]"
                >
                  {isEditingProfile ? <X size={16} /> : <PencilLine size={16} />}
                  {isEditingProfile ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-[#5f584a]">
                <div className="rounded-[1.3rem] border border-white/70 bg-white/70 px-4 py-3">
                  Phone: {profile?.phone}
                </div>
                <div className="rounded-[1.3rem] border border-white/70 bg-white/70 px-4 py-3">
                  Email: {profile?.email || "Not added"}
                </div>
                <div className="rounded-[1.3rem] border border-white/70 bg-white/70 px-4 py-3">
                  Licence: {profile?.license_number}
                </div>
              </div>
            </div>

            <div className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                    Daily Fee
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#1d1a14]">
                    N500 Park Fee
                  </h3>
                </div>
                <div
                  className={`rounded-[1.2rem] px-4 py-3 text-sm font-black ${
                    isPaid
                      ? "bg-[#edf8f1] text-[#1e7a45]"
                      : "bg-[#fff0f0] text-[#c43f3f]"
                  }`}
                >
                  {isPaid ? "PAID" : "PENDING"}
                </div>
              </div>
              {!isPaid && (
                <button
                  onClick={handlePayment}
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-[#1b4d2f] px-5 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#143a24]"
                >
                  <CreditCard size={18} />
                  Pay Now
                </button>
              )}
            </div>

            <div className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                Queue Action
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#1d1a14]">
                {isInQueue ? "You are already queued" : "Ready to enter queue"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#6f6758]">
                Join only after payment is confirmed. Queue position updates in
                real time as admins move drivers forward.
              </p>
              <button
                onClick={handleJoinQueue}
                disabled={loading || !isPaid || isInQueue}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.45rem] bg-[#f4c542] px-5 py-5 text-lg font-black text-[#1d1a14] shadow-[0_18px_36px_rgba(244,197,66,0.24)] transition hover:-translate-y-0.5 hover:bg-[#efbb2e] disabled:cursor-not-allowed disabled:bg-[#d8d2c4] disabled:text-[#7f7565]"
              >
                <BusFront size={20} className={loading ? "animate-pulse" : ""} />
                {loading ? "Joining..." : "Join Queue"}
              </button>
            </div>
          </div>
        </section>

        {isEditingProfile && (
          <section className="glass-panel-strong animate-rise-in rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                  Edit Profile
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#1d1a14]">
                  Update your driver details
                </h2>
              </div>
              <p className="text-sm leading-6 text-[#6f6758]">
                Phone, vehicle identity, password, and passport photo can be updated here.
              </p>
            </div>

            <form onSubmit={handleProfileUpdate} className="mt-6 space-y-6" noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <UserRound size={16} className="text-[#1b4d2f]" />
                    Full name
                  </span>
                  <input
                    type="text"
                    name="full_name"
                    value={editForm.full_name}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    placeholder="Enter your full name"
                    className={`${inputClassName} ${
                      editErrors.full_name ? "border-[#d95d5d] bg-[#fff5f5] focus:ring-[#d95d5d]/15" : ""
                    }`}
                    maxLength={60}
                  />
                  {editErrors.full_name ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.full_name}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <Phone size={16} className="text-[#1b4d2f]" />
                    Phone number
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    placeholder="08031234567"
                    className={`${inputClassName} ${
                      editErrors.phone ? "border-[#d95d5d] bg-[#fff5f5] focus:ring-[#d95d5d]/15" : ""
                    }`}
                    maxLength={14}
                  />
                  {editErrors.phone ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.phone}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <Mail size={16} className="text-[#1b4d2f]" />
                    Email address
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    placeholder="Optional email"
                    className={`${inputClassName} ${
                      editErrors.email ? "border-[#d95d5d] bg-[#fff5f5] focus:ring-[#d95d5d]/15" : ""
                    }`}
                    maxLength={100}
                  />
                  {editErrors.email ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.email}</p>
                  ) : null}
                </label>

                <PasswordField
                  className="md:col-span-2"
                  label="New password"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditChange}
                  onBlur={handleEditBlur}
                  placeholder="Leave blank to keep current password"
                  icon={LockKeyhole}
                  error={editErrors.password}
                  maxLength={64}
                  hint="Leave this empty if you do not want to change your password."
                />

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <IdCard size={16} className="text-[#1b4d2f]" />
                    Licence number
                  </span>
                  <input
                    type="text"
                    name="license_number"
                    value={editForm.license_number}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    placeholder="Driver licence number"
                    className={`${inputClassName} ${
                      editErrors.license_number ? "border-[#d95d5d] bg-[#fff5f5] focus:ring-[#d95d5d]/15" : ""
                    }`}
                    maxLength={20}
                  />
                  {editErrors.license_number ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.license_number}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <CarFront size={16} className="text-[#1b4d2f]" />
                    Plate number
                  </span>
                  <input
                    type="text"
                    name="plate_number"
                    value={editForm.plate_number}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    placeholder="ABC-123DE"
                    className={`${inputClassName} ${
                      editErrors.plate_number ? "border-[#d95d5d] bg-[#fff5f5] focus:ring-[#d95d5d]/15" : ""
                    }`}
                    maxLength={9}
                  />
                  {editErrors.plate_number ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.plate_number}</p>
                  ) : null}
                </label>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-[#d2c6ab] bg-[#fffdfa] p-4 sm:p-5">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
                    <Camera size={16} className="text-[#1b4d2f]" />
                    Replace passport photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNewPhotoChange}
                    className={`block w-full rounded-[1.2rem] border bg-white px-4 py-3 text-sm ${
                      editErrors.photo ? "border-[#d95d5d] bg-[#fff5f5]" : "border-[#d8d0bd]"
                    }`}
                  />
                </label>
                <p className="mt-3 text-sm leading-6 text-[#6f6758]">
                  Upload a new passport photo only if you want to replace the current one.
                </p>
                {editErrors.photo ? (
                  <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.photo}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[1.4rem] bg-[#1b4d2f] px-6 py-4 text-lg font-bold text-white shadow-[0_18px_36px_rgba(27,77,47,0.24)] transition hover:-translate-y-0.5 hover:bg-[#143a24] disabled:cursor-not-allowed disabled:bg-[#91a393]"
              >
                <Save size={18} />
                {savingProfile ? "Saving profile..." : "Save profile changes"}
              </button>
            </form>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
              Your Queue State
            </p>

            {position?.position ? (
              <div className="mt-4">
                <div className="animate-pulse-soft mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-[#173c26] text-white shadow-[0_20px_60px_rgba(23,60,38,0.28)]">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                      Position
                    </p>
                    <div className="mt-2 text-6xl font-black">
                      {position.position}
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-center text-lg font-bold text-[#1d1a14]">
                  {position.status === "loading"
                    ? "You are being loaded now"
                    : position.position === 1
                      ? "You are next to load"
                      : "Stay ready for your turn"}
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] bg-[#fbf8f1] p-6 text-center text-[#6f6758]">
                You are not currently in the active queue.
              </div>
            )}
          </div>

          <div className="dashboard-grid">
            {cooldown > 0 && (
              <div className="glass-panel animate-rise-in rounded-[2rem] border border-[#f6c9c9] bg-[#fff7f7] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#c43f3f] p-2.5 text-white">
                    <TimerReset size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#7b2424]">
                      Cooldown active
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#8a5959]">
                      Wait {cooldown} more minute{cooldown === 1 ? "" : "s"} before
                      you can rejoin the queue.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                Queue Tips
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  "Make sure your daily fee is marked paid before joining.",
                  "Keep your phone nearby while waiting for queue movement.",
                  "If you leave the queue, cooldown rules apply before re-entry.",
                ].map((tip) => (
                  <div
                    key={tip}
                    className="rounded-[1.3rem] border border-white/70 bg-white/70 px-4 py-3 text-sm leading-7 text-[#5f584a]"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
