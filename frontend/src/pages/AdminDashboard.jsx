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
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col">
      {/* Top Header */}
      <div className="bg-black sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🚕</div>
            <div>
              <h1 className="text-2xl font-bold text-[#FFED00]">Keke Park</h1>
              <p className="text-xs text-gray-400 -mt-1">
                Admin Control Center
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
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-72 bg-black/60 p-6 flex-col border-r border-white/10">
          <nav className="space-y-3 flex-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left text-lg font-medium transition ${
                activeTab === "queue"
                  ? "bg-[#FFED00] text-black"
                  : "hover:bg-white/10"
              }`}>
              <Truck size={26} /> Live Queue
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left text-lg font-medium transition ${
                activeTab === "pending"
                  ? "bg-[#FFED00] text-black"
                  : "hover:bg-white/10"
              }`}>
              <Users size={26} /> Pending Approvals
            </button>

            <button
              onClick={() => setActiveTab("drivers")}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-left text-lg font-medium transition ${
                activeTab === "drivers"
                  ? "bg-[#FFED00] text-black"
                  : "hover:bg-white/10"
              }`}>
              <Clock size={26} /> All Drivers
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-5 lg:p-10 pb-24">
          {activeTab === "queue" && (
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h2 className="text-3xl font-bold">
                  Live Queue ({queue.length})
                </h2>

                <div className="flex gap-3">
                  <button
                    onClick={loadFirst}
                    disabled={!hasWaiting}
                    className="bg-[#FFED00] hover:bg-yellow-300 disabled:bg-gray-500 disabled:text-gray-300 text-black font-bold px-8 py-4 rounded-3xl text-lg active:scale-95 transition flex-1 sm:flex-none">
                    Load First Driver
                  </button>
                  <button
                    onClick={completeLoading}
                    disabled={!hasLoading}
                    className="bg-[#008000] hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-300 font-bold px-8 py-4 rounded-3xl text-lg active:scale-95 transition flex-1 sm:flex-none">
                    Complete Loading
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {queue.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="bg-white/10 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <span className="text-5xl font-black text-[#FFED00] min-w-12.5">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="text-xl font-bold">{entry.full_name}</p>
                        <p className="text-[#FFED00] font-mono text-sm">
                          {entry.park_id} • {entry.plate_number}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`px-8 py-3 rounded-2xl text-lg font-bold text-center ${
                        entry.status === "loading"
                          ? "bg-orange-500"
                          : "bg-[#FFED00] text-black"
                      }`}>
                      {entry.status.toUpperCase()}
                    </div>
                  </div>
                ))}

                {queue.length === 0 && (
                  <div className="text-center py-20 text-gray-400 text-2xl">
                    Queue is currently empty
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "pending" && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">
                Pending Driver Approvals
              </h2>

              <div className="space-y-6">
                {pending.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white/10 p-6 rounded-3xl flex flex-col sm:flex-row gap-6 items-start">
                    {driver.passport_photo && (
                      <img
                        src={`http://localhost:5000${driver.passport_photo}`}
                        alt="Passport"
                        className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold mb-2">
                        {driver.full_name}
                      </h3>
                      <p className="text-lg">📱 {driver.phone}</p>
                      <p className="text-gray-300">
                        License: {driver.license_number}
                      </p>
                      <p className="text-gray-300">
                        Plate: {driver.plate_number}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => approve(driver.id)}
                        className="bg-[#008000] hover:bg-green-700 py-4 px-10 rounded-3xl text-lg font-bold active:scale-95 transition">
                        Approve
                      </button>
                      <button
                        onClick={() => reject(driver.id)}
                        className="bg-red-600 hover:bg-red-700 py-4 px-10 rounded-3xl text-lg font-bold active:scale-95 transition">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {pending.length === 0 && (
                  <div className="text-center py-20 text-gray-400 text-2xl">
                    No pending approvals at the moment
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "drivers" && (
            <div className="max-w-4xl mx-auto text-center py-20">
              <p className="text-3xl text-gray-400">All Drivers Page</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50">
        <div className="flex items-center justify-around py-3">
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex flex-col items-center gap-1 p-3 ${activeTab === "queue" ? "text-[#FFED00]" : "text-gray-400"}`}>
            <Truck size={24} />
            <span className="text-xs">Queue</span>
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`flex flex-col items-center gap-1 p-3 ${activeTab === "pending" ? "text-[#FFED00]" : "text-gray-400"}`}>
            <Users size={24} />
            <span className="text-xs">Pending</span>
          </button>

          <button
            onClick={() => setActiveTab("drivers")}
            className={`flex flex-col items-center gap-1 p-3 ${activeTab === "drivers" ? "text-[#FFED00]" : "text-gray-400"}`}>
            <Clock size={24} />
            <span className="text-xs">Drivers</span>
          </button>
        </div>
      </div>
    </div>
  );
}
