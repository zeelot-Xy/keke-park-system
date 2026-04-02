import { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import toast from "react-hot-toast";
import { LogOut, Truck, CreditCard } from "lucide-react";

const socket = io("http://localhost:5000", { withCredentials: true });

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
          axios.get("/api/driver/profile"),
          axios.get("/api/driver/queue-position"),
        ]);

        setProfile(profileRes.data);
        setPaymentStatus(profileRes.data.payment_status || "pending");
        setPosition(queueRes.data);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load driver data",
        );
      }
    };

    const handleQueueUpdate = async () => {
      try {
        const res = await axios.get("/api/driver/queue-position");
        setPosition(res.data);
      } catch (err) {
        console.error("Queue update error:", err);
      }
    };

    fetchDriverData();
    socket.on("queueUpdated", handleQueueUpdate);

    return () => socket.off("queueUpdated", handleQueueUpdate);
  }, []);

  // Cooldown Timer
  useEffect(() => {
    if (cooldown <= 0) return;

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
      await axios.post("/api/driver/payment");
      setPaymentStatus("paid");
      toast.success("Payment recorded ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    }
  };

  const handleJoinQueue = async () => {
    setLoading(true);
    try {
      await axios.post("/api/driver/join-queue");
      toast.success("Joined queue! Position updating live...");

      const res = await axios.get("/api/driver/queue-position");
      setPosition(res.data);
      setCooldown(0);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to join";

      const match = message.match(/(\d+)\s*minutes/i);
      if (match) {
        setCooldown(Number(match[1]));
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#FFED00] to-white flex flex-col font-sans">
      {/* Sticky Header */}
      <div className="bg-[#1A1A1A] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🚕</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Keke Park</h1>
              <p className="text-xs text-gray-400">
                Driver Portal • Benue Makurdi
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600/80 hover:bg-red-700 rounded-2xl text-sm font-medium active:scale-95 transition">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 pb-24">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-3xl overflow-hidden border-4 border-[#FFED00] shrink-0">
              {profile?.passport_photo && (
                <img
                  src={`http://localhost:5000${profile.passport_photo}`}
                  alt="Passport"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
                {profile?.full_name || user?.full_name}
              </h2>
              <p className="text-[#008000] font-mono text-xl font-semibold mt-1">
                {profile?.park_id || user?.park_id || "Pending Approval"}
              </p>
              <p className="text-gray-600 mt-1">
                Plate: {profile?.plate_number || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Status Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <CreditCard size={24} />
                <span className="font-medium text-lg">Today's Park Fee</span>
              </div>
              <div
                className={`text-5xl text-center font-bold ${paymentStatus === "paid" ? "text-[#008000]" : "text-red-600"}`}>
                {paymentStatus === "paid" ? "PAID ✓" : "PENDING"}
              </div>
            </div>

            {paymentStatus !== "paid" && (
              <button
                onClick={handlePayment}
                className="w-full sm:w-auto bg-[#008000] hover:bg-green-700 text-white font-bold px-10 py-5 rounded-3xl text-xl active:scale-95 transition">
                Pay ₦500 Now
              </button>
            )}
          </div>
        </div>

        {/* Join Queue Button */}
        <button
          onClick={handleJoinQueue}
          disabled={
            loading ||
            paymentStatus !== "paid" ||
            position?.status === "waiting" ||
            position?.status === "loading"
          }
          className="w-full bg-[#FFED00] hover:bg-yellow-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-[#1A1A1A] font-bold py-10 sm:py-12 px-6 rounded-3xl text-3xl shadow-2xl active:scale-[0.97] transition flex items-center justify-center gap-4">
          <Truck size={40} className={loading ? "" : "animate-bounce"} />
          {loading ? "Joining..." : "JOIN QUEUE NOW"}
        </button>

        {/* Live Position Card */}
        {position?.position && (
          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 text-center">
            <p className="text-gray-500 text-lg mb-3">Your Current Position</p>
            <div className="text-[90px] sm:text-[120px] lg:text-[140px] leading-none font-black text-[#1A1A1A]">
              {position.position}
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-[#008000] mt-2">
              {position.position === 1 ? "Next to Load" : "In Queue"}
            </p>
          </div>
        )}

        {/* Cooldown Warning */}
        {cooldown > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-3xl text-center text-xl font-bold">
            Cooldown Active — Wait {cooldown} minutes before re-joining
          </div>
        )}

        {/* Loading Status */}
        {position?.status === "loading" && (
          <div className="text-center bg-orange-100 text-orange-700 py-8 rounded-3xl text-xl font-bold">
            You are currently being loaded
          </div>
        )}
      </div>
    </div>
  );
}
