import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  BusFront,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import api from "../lib/api";
import { clearAuthTokens } from "../lib/auth";
import { resolveAssetUrl } from "../lib/config";
import { socket } from "../lib/socket";
import BrandMark from "../components/BrandMark";

export default function AdminDashboard({ setUser }) {
  const [activeTab, setActiveTab] = useState("queue");
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const hasWaiting = queue.some((entry) => entry.status === "waiting");
  const hasLoading = queue.some((entry) => entry.status === "loading");

  const fetchPending = async () => {
    try {
      const res = await api.get("/api/admin/pending-drivers");
      setPending(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch pending drivers");
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await api.get("/api/admin/queue");
      setQueue(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch live queue");
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api.get("/api/admin/drivers");
      setDrivers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch drivers");
    }
  };

  useEffect(() => {
    fetchPending();
    fetchQueue();
    fetchDrivers();

    socket.on("queueUpdated", fetchQueue);

    return () => {
      socket.off("queueUpdated", fetchQueue);
    };
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/api/admin/approve/${id}`);
      toast.success("Driver approved");
      fetchPending();
      fetchQueue();
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not approve driver");
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/api/admin/reject/${id}`);
      toast.success("Driver rejected");
      fetchPending();
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reject driver");
    }
  };

  const loadFirst = async () => {
    try {
      await api.post("/api/admin/load-first");
      toast.success("First driver is now loading");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load first driver");
    }
  };

  const completeLoading = async () => {
    try {
      await api.post("/api/admin/complete-loading");
      toast.success("Loading completed");
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete loading");
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

  const stats = useMemo(
    () => [
      {
        icon: BusFront,
        label: "Active queue",
        value: queue.length,
        tone: "bg-[#fff5d6] text-[#8f6610]",
      },
      {
        icon: UserCheck,
        label: "Pending approvals",
        value: pending.length,
        tone: "bg-[#eef7f1] text-[#1e7a45]",
      },
      {
        icon: Users,
        label: "Registered drivers",
        value: drivers.length,
        tone: "bg-white/80 text-[#1d1a14]",
      },
    ],
    [drivers.length, pending.length, queue.length],
  );

  const tabs = [
    { id: "queue", label: "Live Queue", icon: LayoutDashboard },
    { id: "pending", label: "Pending", icon: UserCheck },
    { id: "drivers", label: "Drivers", icon: Users },
  ];

  return (
    <div className="page-shell min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="glass-panel-strong animate-rise-in rounded-[2rem] p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <BrandMark compact />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6508]">
                  Admin Control
                </p>
                <h1 className="mt-2 text-3xl font-black text-[#1d1a14] sm:text-4xl">
                  Park operations at a glance
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6f6758] sm:text-base">
                  Approve drivers, control loading order, and monitor the live
                  queue from one responsive dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-center">
              <span className="status-chip bg-[#eef7f1] text-[#1e7a45]">
                <ShieldCheck size={14} />
                Admin session
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-[#eadfca] bg-white px-4 py-3 text-sm font-semibold text-[#473f34] transition hover:bg-[#fff9eb]"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {stats.map((item) => {
              const IconComponent = item.icon;

              return (
                <div
                  key={item.label}
                  className={`rounded-[1.5rem] border border-white/70 p-4 ${item.tone}`}
                >
                  <div className="mb-3 inline-flex rounded-2xl bg-[#1d1a14] p-2.5 text-[#f4c542]">
                    <IconComponent size={18} />
                  </div>
                  <p className="text-sm opacity-75">{item.label}</p>
                  <p className="mt-2 text-3xl font-black">{item.value}</p>
                </div>
              );
            })}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.28fr_0.72fr]">
          <aside className="glass-panel animate-rise-in rounded-[2rem] p-4 sm:p-5">
            <nav className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {tabs.map((item) => {
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 rounded-[1.35rem] px-4 py-4 text-left text-sm font-semibold transition ${
                      activeTab === item.id
                        ? "bg-[#173c26] text-white shadow-[0_18px_36px_rgba(23,60,38,0.24)]"
                        : "bg-white/60 text-[#4d4539] hover:bg-white"
                    }`}
                  >
                    <IconComponent size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="space-y-5">
            {activeTab === "queue" && (
              <section className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                      Live Queue
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-[#1d1a14]">
                      Dispatch sequence
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={loadFirst}
                      disabled={!hasWaiting}
                      className="rounded-[1.3rem] bg-[#f4c542] px-5 py-3.5 text-sm font-black text-[#1d1a14] transition hover:-translate-y-0.5 hover:bg-[#efbb2e] disabled:cursor-not-allowed disabled:bg-[#d8d2c4] disabled:text-[#7f7565]"
                    >
                      Load First Driver
                    </button>
                    <button
                      onClick={completeLoading}
                      disabled={!hasLoading}
                      className="rounded-[1.3rem] bg-[#1b4d2f] px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#143a24] disabled:cursor-not-allowed disabled:bg-[#91a393]"
                    >
                      Complete Loading
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {queue.map((entry, index) => (
                    <article
                      key={entry.id}
                      className="rounded-[1.6rem] border border-white/80 bg-white/70 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#173c26] text-xl font-black text-[#f4c542]">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-[#1d1a14]">
                              {entry.full_name}
                            </h3>
                            <p className="mt-1 text-sm text-[#6f6758]">
                              {entry.park_id} - {entry.plate_number}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                            entry.status === "loading"
                              ? "bg-[#fff0db] text-[#b55f00]"
                              : "bg-[#eef7f1] text-[#1e7a45]"
                          }`}
                        >
                          {entry.status === "loading" ? (
                            <Timer size={16} />
                          ) : (
                            <Clock3 size={16} />
                          )}
                          {entry.status.toUpperCase()}
                        </div>
                      </div>
                    </article>
                  ))}

                  {queue.length === 0 && (
                    <div className="rounded-[1.6rem] bg-[#fbf8f1] p-10 text-center text-[#6f6758]">
                      Queue is currently empty.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "pending" && (
              <section className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                    Pending Approvals
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#1d1a14]">
                    Review incoming drivers
                  </h2>
                </div>

                <div className="mt-6 space-y-4">
                  {pending.map((driver) => (
                    <article
                      key={driver.id}
                      className="rounded-[1.6rem] border border-white/80 bg-white/70 p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                        <div className="flex items-start gap-4">
                          {driver.passport_photo ? (
                            <img
                              src={resolveAssetUrl(driver.passport_photo)}
                              alt="Passport"
                              className="h-24 w-24 rounded-[1.3rem] object-cover shadow-md"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-[1.3rem] bg-[#f2ecdf] text-[#1b4d2f]">
                              <Users size={28} />
                            </div>
                          )}

                          <div className="space-y-1">
                            <h3 className="text-xl font-black text-[#1d1a14]">
                              {driver.full_name}
                            </h3>
                            <p className="text-sm text-[#6f6758]">
                              {driver.phone}
                            </p>
                            <p className="text-sm text-[#6f6758]">
                              Licence: {driver.license_number}
                            </p>
                            <p className="text-sm text-[#6f6758]">
                              Plate: {driver.plate_number}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 lg:ml-auto">
                          <button
                            onClick={() => approve(driver.id)}
                            className="inline-flex items-center gap-2 rounded-[1.2rem] bg-[#1b4d2f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#143a24]"
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => reject(driver.id)}
                            className="inline-flex items-center gap-2 rounded-[1.2rem] bg-[#c43f3f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#aa3333]"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}

                  {pending.length === 0 && (
                    <div className="rounded-[1.6rem] bg-[#fbf8f1] p-10 text-center text-[#6f6758]">
                      No pending approvals at the moment.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "drivers" && (
              <section className="glass-panel animate-rise-in rounded-[2rem] p-5 sm:p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-[#8d6508]">
                    Driver Directory
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#1d1a14]">
                    Registered drivers
                  </h2>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {drivers.map((driver) => (
                    <article
                      key={driver.id}
                      className="rounded-[1.6rem] border border-white/80 bg-white/70 p-5"
                    >
                      <div className="flex items-start gap-4">
                        {driver.passport_photo ? (
                          <img
                            src={resolveAssetUrl(driver.passport_photo)}
                            alt="Passport"
                            className="h-20 w-20 rounded-[1.2rem] object-cover shadow-md"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-[1.2rem] bg-[#f2ecdf] text-[#1b4d2f]">
                            <Users size={24} />
                          </div>
                        )}

                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black text-[#1d1a14]">
                              {driver.full_name}
                            </h3>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                                driver.status === "approved"
                                  ? "bg-[#eef7f1] text-[#1e7a45]"
                                  : driver.status === "pending"
                                    ? "bg-[#fff5d6] text-[#91660e]"
                                    : "bg-[#fff0f0] text-[#c43f3f]"
                              }`}
                            >
                              {driver.status}
                            </span>
                          </div>
                          <p className="text-sm text-[#6f6758]">{driver.phone}</p>
                          <p className="text-sm text-[#6f6758]">
                            Email: {driver.email || "N/A"}
                          </p>
                          <p className="text-sm text-[#6f6758]">
                            Park ID: {driver.park_id || "Not assigned"}
                          </p>
                          <p className="text-sm text-[#6f6758]">
                            Licence: {driver.license_number}
                          </p>
                          <p className="text-sm text-[#6f6758]">
                            Plate: {driver.plate_number}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {drivers.length === 0 && (
                    <div className="rounded-[1.6rem] bg-[#fbf8f1] p-10 text-center text-[#6f6758] xl:col-span-2">
                      No drivers found.
                    </div>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
