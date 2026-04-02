import { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import toast from "react-hot-toast";
import { LogOut, Truck } from "lucide-react";

const socket = io("http://localhost:5000", { withCredentials: true });

export default function DriverDashboard({ user, setUser }) {
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [position, setPosition] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        await axios.get("/api/driver/profile");
        const queueRes = await axios.get("/api/driver/queue-position");
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

    return () => {
      socket.off("queueUpdated", handleQueueUpdate);
    };
  }, []);

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
    <div className="min-h-screen bg-linear-to-b from-[#FFED00] to-white p-4 font-sans">
      <div className="flex justify-between items-center mb-8 bg-white rounded-3xl p-6 shadow">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🚕</div>
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Keke Park</h1>
            <p className="text-sm text-gray-600">Port Harcourt • Single Park</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-100 text-red-700 px-6 py-3 rounded-2xl font-bold">
          <LogOut size={20} /> Logout
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow">
          <div className="flex gap-6 items-center">
            <div className="w-24 h-24 bg-gray-200 rounded-2xl overflow-hidden">
              {user?.passport_photo && (
                <img
                  src={`http://localhost:5000${user.passport_photo}`}
                  alt="Passport"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold">{user?.full_name}</h2>
              <p className="text-xl text-[#008000] font-mono">
                {user?.park_id || "Pending Approval"}
              </p>
              <p>Plate: {user?.plate_number}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Today's Payment</p>
            <div
              className={`text-4xl font-bold ${
                paymentStatus === "paid" ? "text-[#008000]" : "text-red-600"
              }`}>
              {paymentStatus === "paid" ? "PAID ✅" : "PENDING"}
            </div>
          </div>

          {paymentStatus !== "paid" && (
            <button
              onClick={handlePayment}
              className="bg-[#008000] text-white px-10 py-5 rounded-2xl text-xl font-bold active:scale-95">
              Pay ₦500 Now
            </button>
          )}
        </div>

        <button
          onClick={handleJoinQueue}
          disabled={
            loading ||
            position?.status === "waiting" ||
            position?.status === "loading"
          }
          className="w-full bg-[#FFED00] hover:bg-yellow-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-[#1A1A1A] font-bold py-8 rounded-3xl text-3xl shadow-xl active:scale-95 transition flex items-center justify-center gap-4">
          <Truck size={32} /> {loading ? "Joining..." : "JOIN QUEUE NOW"}
        </button>

        {position?.position && (
          <div className="bg-white rounded-3xl p-10 text-center shadow">
            <p className="text-gray-500 text-xl">Your Position in Queue</p>
            <div className="text-[120px] font-black text-[#1A1A1A] leading-none">
              {position.position}
            </div>
            <p className="text-2xl text-[#008000]">
              {position.position === 1 ? "Next to Load" : "In Queue"}
            </p>
          </div>
        )}

        {cooldown > 0 && (
          <div className="text-center text-red-600 font-bold">
            Cooldown: {cooldown} minutes remaining
          </div>
        )}
      </div>
    </div>
  );
}
