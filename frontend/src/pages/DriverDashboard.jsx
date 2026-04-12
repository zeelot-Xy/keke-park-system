import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  BusFront,
  Clock3,
  CreditCard,
  LogOut,
  MapPinned,
  RadioTower,
  TimerReset,
  WalletCards,
} from "lucide-react";
import api from "../lib/api";
import { clearAuthTokens } from "../lib/auth";
import { resolveAssetUrl } from "../lib/config";
import { socket } from "../lib/socket";
import BrandMark from "../components/BrandMark";

export default function DriverDashboard({ user, setUser }) {
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [position, setPosition] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const [profileRes, queueRes] = await Promise.all([
          api.get("/api/driver/profile"),
          api.get("/api/driver/queue-position"),
        ]);
        setProfile(profileRes.data);
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
