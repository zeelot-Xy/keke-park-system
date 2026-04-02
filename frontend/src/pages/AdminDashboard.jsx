import { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import toast from "react-hot-toast";
import { Truck, Users, Clock, LogOut } from "lucide-react";

const socket = io("http://localhost:5000", { withCredentials: true });

export default function AdminDashboard({ setUser }) {
  const [activeTab, setActiveTab] = useState("queue");
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);

  const hasWaiting = queue.some((entry) => entry.status === "waiting");
  const hasLoading = queue.some((entry) => entry.status === "loading");

  useEffect(() => {
    fetchPending();
    fetchQueue();

    socket.on("queueUpdated", fetchQueue);

    return () => {
      socket.off("queueUpdated", fetchQueue);
    };
  }, []);

  const fetchPending = async () => {
    try {
      const res = await axios.get("/api/admin/pending-drivers");
      setPending(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not fetch pending drivers",
      );
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await axios.get("/api/admin/queue");
      setQueue(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch live queue");
    }
  };

  const approve = async (id) => {
    try {
      await axios.post(`/api/admin/approve/${id}`);
      toast.success("Driver approved ✅");
      fetchPending();
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not approve driver");
    }
  };

  const reject = async (id) => {
    try {
      await axios.post(`/api/admin/reject/${id}`);
      toast.success("Driver rejected");
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reject driver");
    }
  };

  const loadFirst = async () => {
    try {
      await axios.post("/api/admin/load-first");
      toast.success("First driver is now loading");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load first driver");
    }
  };

  const completeLoading = async () => {
    try {
      await axios.post("/api/admin/complete-loading");
      toast.success("Loading completed");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete loading");
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
    <div className="min-h-screen flex bg-[#1A1A1A] text-white dark:bg-gray-950">
      <div className="w-72 bg-black/50 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="text-5xl">🚕</div>
          <div>
            <h1 className="text-3xl font-bold text-[#FFED00]">Keke Park</h1>
            <p className="text-sm text-gray-400">Admin Control</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setActiveTab("queue")}
            className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left text-xl font-medium transition ${
              activeTab === "queue"
                ? "bg-[#FFED00] text-black"
                : "hover:bg-white/10"
            }`}>
            <Truck size={28} /> Live Queue Management
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left text-xl font-medium transition ${
              activeTab === "pending"
                ? "bg-[#FFED00] text-black"
                : "hover:bg-white/10"
            }`}>
            <Users size={28} /> Pending Approvals
          </button>

          <button
            onClick={() => setActiveTab("drivers")}
            className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left text-xl font-medium transition ${
              activeTab === "drivers"
                ? "bg-[#FFED00] text-black"
                : "hover:bg-white/10"
            }`}>
            <Clock size={28} /> All Drivers
          </button>
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-6 py-5 mt-auto rounded-3xl text-xl font-medium text-red-400 hover:bg-white/10">
          <LogOut size={28} /> Logout
        </button>
      </div>

      <div className="flex-1 p-10 overflow-auto">
        {activeTab === "queue" && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-bold">
                Live Queue ({queue.length} drivers)
              </h2>

              <div className="flex gap-4">
                <button
                  onClick={loadFirst}
                  disabled={!hasWaiting}
                  className="bg-[#FFED00] hover:bg-yellow-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-black font-bold px-10 py-5 rounded-3xl text-xl active:scale-95 transition">
                  Load First Driver
                </button>

                <button
                  onClick={completeLoading}
                  disabled={!hasLoading}
                  className="bg-[#008000] hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold px-10 py-5 rounded-3xl text-xl active:scale-95 transition">
                  Complete Loading
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {queue.map((entry, index) => (
                <div
                  key={entry.id}
                  className="bg-white/10 p-8 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <span className="text-6xl font-black text-[#FFED00]">
                      #{index + 1}
                    </span>

                    <div>
                      <p className="text-2xl font-bold">{entry.full_name}</p>
                      <p className="text-[#FFED00] font-mono">
                        {entry.park_id} • {entry.plate_number}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`px-8 py-3 rounded-2xl text-xl font-bold ${
                      entry.status === "loading"
                        ? "bg-orange-500"
                        : "bg-[#FFED00] text-black"
                    }`}>
                    {entry.status.toUpperCase()}
                  </div>
                </div>
              ))}

              {queue.length === 0 && (
                <p className="text-center text-2xl text-gray-400 py-20">
                  Queue is empty
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "pending" && (
          <div>
            <h2 className="text-4xl font-bold mb-8">
              Pending Driver Approvals
            </h2>

            <div className="grid gap-6">
              {pending.map((driver) => (
                <div
                  key={driver.id}
                  className="bg-white/10 p-8 rounded-3xl flex gap-8 items-start">
                  {driver.passport_photo && (
                    <img
                      src={`http://localhost:5000${driver.passport_photo}`}
                      alt="Passport"
                      className="w-32 h-32 object-cover rounded-2xl"
                    />
                  )}

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{driver.full_name}</h3>
                    <p className="text-xl">📱 {driver.phone}</p>
                    <p>License: {driver.license_number}</p>
                    <p>Plate: {driver.plate_number}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => approve(driver.id)}
                      className="bg-[#008000] px-12 py-5 rounded-3xl text-xl font-bold active:scale-95">
                      Approve
                    </button>

                    <button
                      onClick={() => reject(driver.id)}
                      className="bg-red-600 px-12 py-5 rounded-3xl text-xl font-bold active:scale-95">
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {pending.length === 0 && (
                <p className="text-center text-2xl text-gray-400 py-20">
                  No pending drivers
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "drivers" && (
          <div className="text-3xl text-gray-400">All Drivers Page</div>
        )}
      </div>
    </div>
  );
}
