import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion as Motion } from "framer-motion";
import {
  BusFront,
  Camera,
  CarFront,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  IdCard,
  Info,
  LogOut,
  Mail,
  Phone,
  Save,
  TimerReset,
  User,
  Users,
  Zap,
} from "lucide-react";
import api from "../lib/api";
import { clearAuthTokens } from "../lib/auth";
import { resolveAssetUrl } from "../lib/config";
import { socket } from "../lib/socket";
import PasswordField from "../components/PasswordField";
import EmptyState from "../components/EmptyState";
import InlineNotice from "../components/InlineNotice";
import DashboardSkeleton from "../components/DashboardSkeleton";

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

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function DriverDashboard({ user, setUser }) {
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [position, setPosition] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editErrors, setEditErrors] = useState({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [notice, setNotice] = useState(null);
  const editSectionRef = useRef(null);

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
      } finally {
        setBootstrapping(false);
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

  useEffect(() => {
    if (isEditingProfile && editSectionRef.current) {
      editSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isEditingProfile]);

  const handlePayment = async () => {
    try {
      await api.post("/api/driver/payment");
      setPaymentStatus("paid");
      setNotice({
        type: "success",
        message: "Daily payment confirmed. You can join the queue immediately.",
      });
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
      setNotice({
        type: "success",
        message: "You joined the queue successfully. Your live position is now being tracked below.",
      });
    } catch (err) {
      const message = err.response?.data?.message || "Failed to join";
      const cooldownMinutes = err.response?.data?.cooldownMinutes;

      if (cooldownMinutes) {
        setCooldown(cooldownMinutes);
      } else {
        const match = message.match(/(\d+)\s*minutes/i);
        if (match) setCooldown(Number(match[1]));
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
      setNotice({
        type: "success",
        message: "Your profile changes were saved and your dashboard has been refreshed.",
      });
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
  const queuePosition = position?.position || null;
  const queueCount = position?.totalInQueue || position?.total_in_queue || null;
  const queueAhead = queuePosition && queuePosition > 1 ? queuePosition - 1 : 0;

  const initials = useMemo(() => {
    const source = profile?.full_name || user?.full_name || "";
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [profile?.full_name, user?.full_name]);

  const quickStats = [
    {
      icon: DollarSign,
      label: "Daily Payment",
      value: "N500",
      meta: isPaid ? "Confirmed" : "Pending",
      iconClass: "bg-[#FFE28A] text-[#DCA117]",
    },
    {
      icon: Users,
      label: "Queue Position",
      value: queuePosition ? `${queuePosition}${queueCount ? ` of ${queueCount}` : ""}` : "Not joined",
      meta: position?.status === "loading" ? "Currently loading" : "Live updates enabled",
      iconClass: "bg-[#FFE28A] text-[#1B4D2F]",
    },
    {
      icon: Clock,
      label: "Cooldown Status",
      value: cooldown > 0 ? `${cooldown} min` : "Ready",
      meta: cooldown > 0 ? "Please wait before rejoining" : "Eligible to join queue",
      iconClass: "bg-[#FFE28A] text-[#1B4D2F]",
    },
  ];

  const inputClassName =
    "w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20";

  if (bootstrapping) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1] pb-8">
      <div className="bg-linear-to-r from-[#F4C542] to-[#DCA117] px-4 py-6 shadow-lg lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B4D2F]">
              <Zap className="h-7 w-7 text-[#F4C542]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#14532D] lg:text-2xl">
                Keke Park
              </h1>
              <p className="text-xs text-[#14532D]/70">Driver Dashboard</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg bg-[#14532D] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1B4D2F]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
        <InlineNotice
          type={notice?.type}
          message={notice?.message}
          className="mb-6"
        />

        <Motion.div
          {...motionProps(0)}
          className="interactive-card mb-6 rounded-2xl border-2 border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-lg lg:p-8"
        >
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-[#F4C542] to-[#DCA117] text-3xl font-bold text-[#14532D] shadow-lg">
              {profile?.passport_photo ? (
                <img
                  src={resolveAssetUrl(profile.passport_photo)}
                  alt="Driver passport"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                initials || "KP"
              )}
            </div>

            <div className="flex-1">
              <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-center">
                <h2 className="text-2xl font-extrabold text-[#1D1A14] lg:text-3xl">
                  {profile?.full_name || user?.full_name || "Driver"}
                </h2>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#1E7A45] px-3 py-1 text-xs font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  {(profile?.status || user?.status || "Active").toString()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#6F6758]">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-semibold">Park ID:</span>
                  <span className="font-mono font-bold text-[#1D1A14]">
                    {profile?.park_id || user?.park_id || "Pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CarFront className="h-4 w-4" />
                  <span className="font-semibold">Plate:</span>
                  <span className="font-mono font-bold text-[#1D1A14]">
                    {profile?.plate_number || "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Motion.div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickStats.map((item, index) => {
            const IconComponent = item.icon;

            return (
              <Motion.div
                key={item.label}
                {...motionProps(0.1 + index * 0.1)}
                className="interactive-card rounded-xl border-2 border-[#D8D0BD] bg-white p-5 shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#6F6758]">
                      {item.label}
                    </p>
                    <p className="text-2xl font-extrabold text-[#1D1A14]">
                      {item.value}
                    </p>
                    <p className="text-xs text-[#6F6758]">{item.meta}</p>
                  </div>
                </div>
              </Motion.div>
            );
          })}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Motion.div
            {...motionProps(0.4)}
            className="interactive-card rounded-2xl border-2 border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-lg"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#F4C542]">
                <DollarSign className="h-6 w-6 text-[#14532D]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D1A14]">
                  Daily Payment
                </h3>
                <p className="text-sm text-[#6F6758]">
                  Complete your park fee payment
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-white p-4">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#1D1A14]">
                  N500
                </span>
                <span className="text-sm text-[#6F6758]">due today</span>
              </div>
              <p className="text-xs text-[#6F6758]">
                Status: {isPaid ? "Payment confirmed" : "Awaiting payment"}
              </p>
            </div>
            <button
              onClick={handlePayment}
              disabled={isPaid}
              className="interactive-button w-full rounded-xl bg-[#F4C542] py-3.5 font-bold text-[#1D1A14] transition-all shadow-md hover:-translate-y-0.5 hover:bg-[#DCA117] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-[#d8d2c4] disabled:text-[#7f7565]"
            >
              {isPaid ? "Payment Confirmed" : "Pay Now"}
            </button>
          </Motion.div>

          <Motion.div
            {...motionProps(0.5)}
            className="interactive-card rounded-2xl border-2 border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-lg"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1B4D2F]">
                <Users className="h-6 w-6 text-[#F4C542]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D1A14]">
                  Queue Status
                </h3>
                <p className="text-sm text-[#6F6758]">
                  Join the queue when ready
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-white p-4">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#1D1A14]">
                  {queueCount || 0}
                </span>
                <span className="text-sm text-[#6F6758]">drivers in queue</span>
              </div>
              <p className="text-xs text-[#6F6758]">
                {cooldown > 0
                  ? `Cooldown active: ${cooldown} minute${cooldown === 1 ? "" : "s"} left`
                  : "Estimated wait depends on current movement"}
              </p>
            </div>
            <button
              onClick={handleJoinQueue}
              disabled={loading || !isPaid || isInQueue}
              className="interactive-button w-full rounded-xl bg-[#1B4D2F] py-3.5 font-bold text-white transition-all shadow-md hover:-translate-y-0.5 hover:bg-[#14532D] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-[#a8ada6] disabled:text-[#eef1eb]"
            >
              {loading ? "Joining..." : isInQueue ? "Already in Queue" : "Join Queue"}
            </button>
          </Motion.div>
        </div>

        {queuePosition ? (
          <Motion.div
            {...motionProps(0.6)}
            className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-[#1B4D2F] to-[#14532D] p-8 shadow-xl lg:p-12"
          >
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#F4C542]/10 blur-3xl" />
            <div className="relative z-10">
              <p className="mb-2 text-sm font-semibold text-white/70">
                YOUR QUEUE POSITION
              </p>
              <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-end">
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#F4C542] shadow-2xl lg:h-48 lg:w-48">
                  <span className="text-6xl font-extrabold text-[#14532D] lg:text-7xl">
                    {queuePosition}
                  </span>
                </div>
                <div className="text-center lg:text-left">
                  <p className="mb-2 text-2xl font-extrabold text-white lg:text-3xl">
                    You're number {queuePosition}
                  </p>
                  <p className="mb-4 text-lg text-white/80">
                    {queueCount
                      ? `Out of ${queueCount} drivers waiting`
                      : "Live queue position is active"}
                  </p>
                  <div className="flex items-center gap-2 text-[#FFE28A]">
                    <Info className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {queueAhead} driver{queueAhead === 1 ? "" : "s"} ahead of you
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Motion.div>
        ) : (
          <div className="mb-6">
            <EmptyState
              icon={BusFront}
              title="No active queue position yet"
              copy="Once your daily fee is paid, you can join the queue and your live position will appear here automatically."
              tone="warm"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Motion.div
            {...motionProps(0.7)}
            className="interactive-card rounded-xl border-2 border-[#D8D0BD] bg-white p-5 shadow-md"
          >
            <div className="mb-3 flex items-start gap-3">
              <Clock className="h-6 w-6 flex-shrink-0 text-[#1E7A45]" />
              <div>
                <h4 className="mb-1 font-bold text-[#1D1A14]">Cooldown</h4>
                <p className="text-xs text-[#6F6758]">
                  {cooldown > 0 ? "Rest period active" : "No active cooldown"}
                </p>
              </div>
            </div>
            <div
              className={`rounded-lg border p-3 text-xs ${
                cooldown > 0
                  ? "border-[#dca117]/30 bg-[#fff5d6] text-[#7b5b10]"
                  : "border-[#1E7A45]/30 bg-[#1E7A45]/10 text-[#1D1A14]"
              }`}
            >
              {cooldown > 0
                ? `Wait ${cooldown} more minute${cooldown === 1 ? "" : "s"} before you can rejoin the queue.`
                : "You're ready to join the queue anytime."}
            </div>
          </Motion.div>

          <Motion.div
            {...motionProps(0.8)}
            className="interactive-card rounded-xl border-2 border-[#DCA117]/30 bg-[#FFE28A]/30 p-5 shadow-md"
          >
            <div className="mb-3 flex items-start gap-3">
              <Info className="h-6 w-6 flex-shrink-0 text-[#DCA117]" />
              <div>
                <h4 className="mb-1 font-bold text-[#1D1A14]">Queue Tips</h4>
                <p className="text-xs text-[#6F6758]">Stay prepared</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-[#1D1A14]">
              {[
                "Pay your daily fee before trying to join the queue.",
                "Keep your phone nearby for live queue movement.",
                "Be prepared before your turn reaches loading stage.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="text-[#DCA117]">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Motion.div>

          <Motion.div
            {...motionProps(0.9)}
            className="interactive-card rounded-xl border-2 border-[#D8D0BD] bg-white p-5 shadow-md"
          >
            <div className="mb-4 flex items-start gap-3">
              <Edit3 className="h-6 w-6 flex-shrink-0 text-[#1B4D2F]" />
              <div>
                <h4 className="mb-1 font-bold text-[#1D1A14]">Profile</h4>
                <p className="text-xs text-[#6F6758]">
                  Update your details and passport photo
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isEditingProfile && profile) {
                  syncEditForm(profile);
                }
                setIsEditingProfile((current) => !current);
              }}
              className="interactive-button w-full rounded-lg bg-[#F4C542] py-3 font-bold text-[#1D1A14] transition-all shadow-sm hover:bg-[#DCA117] hover:shadow-md"
            >
              {isEditingProfile ? "Hide Profile" : "Edit Profile"}
            </button>
          </Motion.div>
        </div>

        {isEditingProfile ? (
          <Motion.div
            ref={editSectionRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.4 }}
            className="mt-6 overflow-hidden rounded-2xl border-2 border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-lg lg:p-8"
          >
            <h3 className="mb-6 text-2xl font-extrabold text-[#1D1A14]">
              Edit Profile
            </h3>

            <form onSubmit={handleProfileUpdate} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Full Name
                  </span>
                  <div className="relative">
                    <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="text"
                      name="full_name"
                      value={editForm.full_name}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      placeholder="Full name"
                      className={`${inputClassName} ${editErrors.full_name ? "border-[#c43f3f] bg-[#fff5f5]" : ""}`}
                    />
                  </div>
                  {editErrors.full_name ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.full_name}</p>
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
                      value={editForm.phone}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      placeholder="080 1234 5678"
                      className={`${inputClassName} ${editErrors.phone ? "border-[#c43f3f] bg-[#fff5f5]" : ""}`}
                    />
                  </div>
                  {editErrors.phone ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.phone}</p>
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
                      value={editForm.email}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      placeholder="email@example.com"
                      className={`${inputClassName} ${editErrors.email ? "border-[#c43f3f] bg-[#fff5f5]" : ""}`}
                    />
                  </div>
                  {editErrors.email ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.email}</p>
                  ) : null}
                </label>

                <PasswordField
                  label="Change Password"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditChange}
                  onBlur={handleEditBlur}
                  placeholder="Leave blank to keep current"
                  inputClassName="rounded-xl border-2 border-[#D8D0BD] py-3.5 focus-within:border-[#F4C542] focus-within:ring-[#F4C542]/20"
                  error={editErrors.password}
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Driver's License
                  </span>
                  <div className="relative">
                    <IdCard className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="text"
                      name="license_number"
                      value={editForm.license_number}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      placeholder="LAG123456789"
                      className={`${inputClassName} ${editErrors.license_number ? "border-[#c43f3f] bg-[#fff5f5]" : ""}`}
                    />
                  </div>
                  {editErrors.license_number ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">
                      {editErrors.license_number}
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
                      value={editForm.plate_number}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      placeholder="ABC-123DE"
                      className={`${inputClassName} ${editErrors.plate_number ? "border-[#c43f3f] bg-[#fff5f5]" : ""}`}
                    />
                  </div>
                  {editErrors.plate_number ? (
                    <p className="mt-2 text-sm text-[#c43f3f]">
                      {editErrors.plate_number}
                    </p>
                  ) : null}
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                  Update Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewPhotoChange}
                  className="hidden"
                  id="photo-replace"
                />
                <label
                  htmlFor="photo-replace"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D8D0BD] bg-white py-3 transition-all hover:border-[#F4C542] hover:bg-[#FFFBEA]"
                >
                  <Camera className="h-5 w-5 text-[#6F6758]" />
                  <span className="text-sm font-semibold text-[#6F6758]">
                    {newPhoto ? newPhoto.name : "Choose new photo"}
                  </span>
                </label>
                {editErrors.photo ? (
                  <p className="mt-2 text-sm text-[#c43f3f]">{editErrors.photo}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="interactive-button flex w-full items-center justify-center gap-3 rounded-xl bg-[#F4C542] py-4 font-bold text-[#1D1A14] transition-all shadow-lg shadow-[#F4C542]/30 hover:-translate-y-0.5 hover:bg-[#DCA117] hover:shadow-xl hover:shadow-[#F4C542]/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingProfile ? <TimerReset className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {savingProfile ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </Motion.div>
        ) : null}
      </div>
    </div>
  );
}
