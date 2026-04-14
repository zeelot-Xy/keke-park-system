import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  CheckCircle,
  CheckSquare,
  Clock,
  FileText,
  KeyRound,
  LogOut,
  Phone,
  Play,
  UserCheck,
  Users,
  XCircle,
  Zap,
  Car,
} from "lucide-react";
import api from "../lib/api";
import { clearAuthTokens } from "../lib/auth";
import { resolveAssetUrl } from "../lib/config";
import { socket } from "../lib/socket";
import EmptyState from "../components/EmptyState";
import InlineNotice from "../components/InlineNotice";
import DashboardSkeleton from "../components/DashboardSkeleton";
import PasswordField from "../components/PasswordField";

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

export default function AdminDashboard({ setUser }) {
  const [activeTab, setActiveTab] = useState("queue");
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [notice, setNotice] = useState(null);
  const [deleteAction, setDeleteAction] = useState({
    driverId: null,
    mode: null,
    password: "",
    loading: false,
  });

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
    const bootstrap = async () => {
      await Promise.allSettled([fetchPending(), fetchQueue(), fetchDrivers()]);
      setBootstrapping(false);
    };

    bootstrap();

    socket.on("queueUpdated", fetchQueue);

    return () => {
      socket.off("queueUpdated", fetchQueue);
    };
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/api/admin/approve/${id}`);
      toast.success("Driver approved");
      setNotice({
        type: "success",
        message: "Driver approved successfully. They can now access the driver dashboard.",
      });
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
      setNotice({
        type: "warning",
        message: "Driver application rejected. The pending list has been updated.",
      });
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
      setNotice({
        type: "info",
        message: "The first waiting driver has been moved into loading state.",
      });
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load first driver");
    }
  };

  const completeLoading = async () => {
    try {
      await api.post("/api/admin/complete-loading");
      toast.success("Loading completed");
      setNotice({
        type: "success",
        message: "Loading completed successfully. The queue order has been refreshed.",
      });
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
        icon: Users,
        label: "Active Queue",
        value: queue.length,
        iconClass: "bg-[#F4C542] text-[#14532D]",
      },
      {
        icon: Clock,
        label: "Pending Approvals",
        value: pending.length,
        iconClass: "bg-[#FFE28A] text-[#DCA117]",
      },
      {
        icon: UserCheck,
        label: "Registered Drivers",
        value: drivers.length,
        iconClass: "bg-white/20 text-white",
      },
    ],
    [drivers.length, pending.length, queue.length],
  );

  const tabs = [
    { id: "queue", label: "Live Queue", mobile: "Queue", icon: Users },
    { id: "pending", label: "Pending", mobile: "Pending", icon: Clock },
    { id: "drivers", label: "Drivers", mobile: "Drivers", icon: UserCheck },
  ];

  const formatDeletionDate = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const openDeleteAction = (driverId, mode) => {
    setDeleteAction({
      driverId,
      mode,
      password: "",
      loading: false,
    });
  };

  const closeDeleteAction = () => {
    setDeleteAction({
      driverId: null,
      mode: null,
      password: "",
      loading: false,
    });
  };

  const handleDeletePasswordChange = (event) => {
    setDeleteAction((current) => ({
      ...current,
      password: event.target.value,
    }));
  };

  const submitDeleteAction = async (driver) => {
    if (!deleteAction.password.trim()) {
      toast.error("Enter your admin password to continue.");
      return;
    }

    const route =
      deleteAction.mode === "confirm"
        ? `/api/admin/drivers/${driver.id}/confirm-delete`
        : `/api/admin/drivers/${driver.id}/request-delete`;

    setDeleteAction((current) => ({ ...current, loading: true }));

    try {
      const res = await api.post(route, { password: deleteAction.password });
      setNotice({
        type: deleteAction.mode === "confirm" ? "success" : "warning",
        message: res.data.message,
      });
      closeDeleteAction();
      fetchDrivers();
      fetchQueue();
      fetchPending();
      toast.success(
        deleteAction.mode === "confirm"
          ? "Driver deleted"
          : "Deletion scheduled",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete delete action");
      setDeleteAction((current) => ({ ...current, loading: false }));
    }
  };

  const cancelScheduledDeletion = async (driver) => {
    try {
      const res = await api.post(`/api/admin/drivers/${driver.id}/cancel-delete`);
      setNotice({
        type: "info",
        message: res.data.message,
      });
      if (deleteAction.driverId === driver.id) {
        closeDeleteAction();
      }
      fetchDrivers();
      toast.success("Deletion cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel scheduled deletion");
    }
  };

  const removeRejectedDriver = async (driver) => {
    try {
      const res = await api.delete(`/api/admin/drivers/${driver.id}/rejected`);
      setNotice({
        type: "info",
        message: res.data.message,
      });
      fetchDrivers();
      toast.success("Rejected driver removed");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not remove rejected driver",
      );
    }
  };

  if (bootstrapping) {
    return <DashboardSkeleton tone="dark" />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1] pb-8">
      <div className="bg-linear-to-r from-[#1B4D2F] to-[#14532D] px-4 py-6 shadow-xl lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4C542] shadow-lg">
                <Zap className="h-7 w-7 text-[#14532D]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white lg:text-2xl">
                  Keke Park System
                </h1>
                <p className="text-xs text-white/70">Admin Operations</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-[#F4C542]/30 bg-[#F4C542]/20 px-4 py-2 sm:flex">
                <div className="h-2 w-2 rounded-full bg-[#F4C542] animate-pulse" />
                <span className="text-xs font-semibold text-white">
                  Active Session
                </span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {stats.map((item, index) => {
              const IconComponent = item.icon;

              return (
                <Motion.div
                  key={item.label}
                  {...motionProps(index * 0.1)}
                  className="interactive-card rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/70">
                        {item.label}
                      </p>
                      <p className="text-3xl font-extrabold text-white">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
        <InlineNotice
          type={notice?.type}
          message={notice?.message}
          className="mb-6"
        />

        <div className="mb-6 rounded-xl border-2 border-[#D8D0BD] bg-white p-2 shadow-md">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-active={activeTab === tab.id}
                  className={`rounded-lg px-4 py-3 font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#F4C542] text-[#1D1A14] shadow-md"
                      : "bg-transparent text-[#6F6758] hover:bg-[#FFFBEA]"
                  } tab-pill interactive-button`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.mobile}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {activeTab === "queue" ? (
          <Motion.div
            key="queue-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mb-6 rounded-xl border-2 border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-md">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="mb-1 text-xl font-extrabold text-[#1D1A14]">
                    Queue Management
                  </h3>
                  <p className="text-sm text-[#6F6758]">
                    Control the loading process
                  </p>
                </div>
                <div className="flex w-full gap-3 sm:w-auto">
                  <button
                    onClick={loadFirst}
                    disabled={!hasWaiting}
                    className="interactive-button flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1B4D2F] px-6 py-3 font-bold text-white transition-all shadow-md hover:bg-[#14532D] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-[#a8ada6] disabled:text-[#eef1eb] sm:flex-initial"
                  >
                    <Play className="h-5 w-5" />
                    Load First Driver
                  </button>
                  <button
                    onClick={completeLoading}
                    disabled={!hasLoading}
                    className="interactive-button flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E7A45] px-6 py-3 font-bold text-white transition-all shadow-md hover:bg-[#1B4D2F] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-[#91a393] sm:flex-initial"
                  >
                    <CheckSquare className="h-5 w-5" />
                    Complete Loading
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border-2 border-[#D8D0BD] bg-white shadow-lg">
              <div className="bg-[#F4C542] px-6 py-4">
                <h3 className="text-lg font-extrabold text-[#14532D]">
                  Current Queue
                </h3>
              </div>
              <div className="divide-y divide-[#D8D0BD]">
                {queue.length > 0 ? (
                  queue.map((entry, index) => (
                    <Motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`interactive-card p-6 transition-all hover:bg-[#FFFBEA] ${
                        index === 0 ? "bg-[#FFE28A]/30" : ""
                      }`}
                    >
                      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                            index === 0
                              ? "bg-[#1B4D2F] text-white shadow-lg"
                              : "bg-[#F8EBC7] text-[#1D1A14]"
                          }`}
                        >
                          <span className="text-2xl font-extrabold">
                            {index + 1}
                          </span>
                        </div>

                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
                          <div>
                            <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                              Driver Name
                            </p>
                            <p className="font-bold text-[#1D1A14]">
                              {entry.full_name}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                              Park ID
                            </p>
                            <p className="font-mono font-bold text-[#1D1A14]">
                              {entry.park_id}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                              Plate Number
                            </p>
                            <p className="font-mono font-bold text-[#1D1A14]">
                              {entry.plate_number}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {entry.status === "loading" ? (
                            <span className="inline-flex items-center gap-2 rounded-lg bg-[#1B4D2F] px-4 py-2 text-sm font-bold text-white shadow-md">
                              <div className="h-2 w-2 rounded-full bg-[#F4C542] animate-pulse" />
                              Loading
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-lg bg-[#D8D0BD]/30 px-4 py-2 text-sm font-bold text-[#6F6758]">
                              Waiting
                            </span>
                          )}
                        </div>
                      </div>
                    </Motion.div>
                  ))
                ) : (
                  <div className="p-6">
                    <EmptyState
                      icon={Users}
                      title="Queue is currently empty"
                      copy="As soon as paid drivers join the queue, the live dispatch order will appear here."
                      tone="warm"
                    />
                  </div>
                )}
              </div>
            </div>
          </Motion.div>
        ) : null}

        {activeTab === "pending" ? (
          <Motion.div
            key="pending-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
          >
            {pending.length > 0 ? (
              pending.map((driver, index) => {
                const initials = driver.full_name
                  ?.split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();

                return (
                  <Motion.article
                    key={driver.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="interactive-card rounded-xl border-2 border-[#D8D0BD] bg-[#FFFBEA] p-6 shadow-lg transition-all hover:shadow-xl"
                  >
                    <div className="mb-5 flex items-center gap-4">
                      {driver.passport_photo ? (
                        <img
                          src={resolveAssetUrl(driver.passport_photo)}
                          alt="Passport"
                          className="h-20 w-20 rounded-2xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-[#F4C542] to-[#DCA117] text-2xl font-extrabold text-[#14532D] shadow-md">
                          {initials || "DR"}
                        </div>
                      )}
                      <div>
                        <h4 className="mb-1 text-xl font-extrabold text-[#1D1A14]">
                          {driver.full_name}
                        </h4>
                        <p className="text-sm text-[#6F6758]">
                          Awaiting approval
                        </p>
                      </div>
                    </div>

                    <div className="mb-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 hrink-0 text-[#6F6758]" />
                        <span className="text-sm text-[#1D1A14]">
                          {driver.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-[#6F6758]" />
                        <span className="font-mono text-sm text-[#1D1A14]">
                          {driver.license_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Car className="h-4 w-4 shrink-0 text-[#6F6758]" />
                        <span className="font-mono text-sm text-[#1D1A14]">
                          {driver.plate_number}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => approve(driver.id)}
                        className="interactive-button flex items-center justify-center gap-2 rounded-lg bg-[#1E7A45] px-4 py-3 font-bold text-white transition-all shadow-md hover:bg-[#1B4D2F] hover:shadow-lg"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => reject(driver.id)}
                        className="interactive-button flex items-center justify-center gap-2 rounded-lg border-2 border-[#C43F3F] bg-white px-4 py-3 font-bold text-[#C43F3F] transition-all hover:bg-[#FFE9E9]"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </Motion.article>
                );
              })
            ) : (
              <EmptyState
                icon={UserCheck}
                title="No pending approvals right now"
                copy="New driver applications will appear here when registration requests come in."
                className="xl:col-span-3"
              />
            )}
          </Motion.div>
        ) : null}

        {activeTab === "drivers" ? (
          <Motion.div
            key="drivers-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <div className="overflow-hidden rounded-xl border-2 border-[#D8D0BD] bg-white shadow-lg">
              <div className="bg-[#1B4D2F] px-6 py-4">
                <h3 className="text-lg font-extrabold text-white">
                  All Registered Drivers
                </h3>
              </div>
              <div className="divide-y divide-[#D8D0BD]">
                {drivers.length > 0 ? (
                  drivers.map((driver, index) => {
                    const initials = driver.full_name
                      ?.split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase();
                    const isDeletePanelOpen = deleteAction.driverId === driver.id;
                    const canScheduleDelete =
                      driver.status === "approved" && !driver.deletion_state;
                    const canConfirmDelete =
                      driver.deletion_state === "awaiting_confirmation";
                    const showDeletionCountdown =
                      driver.deletion_state === "scheduled";
                    const canRemoveRejected = driver.status === "rejected";

                    return (
                      <Motion.div
                        key={driver.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="interactive-card p-6 transition-all hover:bg-[#FFFBEA]"
                      >
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                          {driver.passport_photo ? (
                            <img
                              src={resolveAssetUrl(driver.passport_photo)}
                              alt="Passport"
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#F4C542] to-[#DCA117] text-lg font-extrabold text-[#14532D]">
                              {initials || "DR"}
                            </div>
                          )}

                          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-4">
                            <div>
                              <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                                Park ID
                              </p>
                              <p className="text-sm font-mono font-bold text-[#1D1A14]">
                                {driver.park_id || "Not assigned"}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                                Driver Name
                              </p>
                              <p className="text-sm font-bold text-[#1D1A14]">
                                {driver.full_name}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                                Plate
                              </p>
                              <p className="text-sm font-mono font-bold text-[#1D1A14]">
                                {driver.plate_number}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-[#6F6758]">
                                Phone
                              </p>
                              <p className="text-sm font-mono text-[#1D1A14]">
                                {driver.phone}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {driver.status === "approved" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E7A45] px-3 py-1.5 text-xs font-bold text-white">
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                  Active
                                </span>
                              ) : driver.status === "pending" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCA117] px-3 py-1.5 text-xs font-bold text-white">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D8D0BD] px-3 py-1.5 text-xs font-bold text-[#6F6758]">
                                  Inactive
                                </span>
                              )}

                              {canScheduleDelete ? (
                                <button
                                  type="button"
                                  onClick={() => openDeleteAction(driver.id, "request")}
                                  className="interactive-button rounded-full border border-[#C43F3F]/20 bg-[#FFF1F1] px-3 py-1.5 text-xs font-bold text-[#9C3535] transition hover:bg-[#ffe4e4]"
                                >
                                  Schedule Delete
                                </button>
                              ) : null}

                              {showDeletionCountdown ? (
                                <button
                                  type="button"
                                  onClick={() => cancelScheduledDeletion(driver)}
                                  className="interactive-button rounded-full border border-[#DCA117]/20 bg-[#FFF5D6] px-3 py-1.5 text-xs font-bold text-[#8D6508] transition hover:bg-[#ffefbe]"
                                >
                                  Cancel Delete
                                </button>
                              ) : null}

                              {canConfirmDelete ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteAction(driver.id, "confirm")}
                                    className="interactive-button rounded-full border border-[#C43F3F]/20 bg-[#FFF1F1] px-3 py-1.5 text-xs font-bold text-[#9C3535] transition hover:bg-[#ffe4e4]"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cancelScheduledDeletion(driver)}
                                    className="interactive-button rounded-full border border-[#DCA117]/20 bg-[#FFF5D6] px-3 py-1.5 text-xs font-bold text-[#8D6508] transition hover:bg-[#ffefbe]"
                                  >
                                    Cancel Delete
                                  </button>
                                </>
                              ) : null}

                              {canRemoveRejected ? (
                                <button
                                  type="button"
                                  onClick={() => removeRejectedDriver(driver)}
                                  className="interactive-button rounded-full border border-[#C43F3F]/20 bg-[#FFF1F1] px-3 py-1.5 text-xs font-bold text-[#9C3535] transition hover:bg-[#ffe4e4]"
                                >
                                  Remove Rejected
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {driver.deletion_state ? (
                          <div className="mt-4 rounded-[1.2rem] border border-[#DCA117]/20 bg-[#FFF7E2] px-4 py-3 text-sm text-[#7B5B10]">
                            {driver.deletion_state === "scheduled" ? (
                              <span>
                                Deletion scheduled. Final confirmation becomes available on{" "}
                                <strong>{formatDeletionDate(driver.deletion_eligible_at)}</strong>.
                              </span>
                            ) : (
                              <span>
                                Grace period completed. You can now confirm deletion or cancel the request.
                              </span>
                            )}
                          </div>
                        ) : null}

                        {isDeletePanelOpen ? (
                          <div className="mt-4 rounded-[1.4rem] border border-[#eadfca] bg-[#FFFBEA] p-4">
                            <p className="text-sm font-bold text-[#1D1A14]">
                              {deleteAction.mode === "confirm"
                                ? `Confirm permanent deletion for ${driver.full_name}`
                                : `Schedule ${driver.full_name} for deletion`}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#6F6758]">
                              {deleteAction.mode === "confirm"
                                ? "Enter your admin password to permanently remove this driver from the system database."
                                : "Enter your admin password to start the 3-day deletion grace period for this driver."}
                            </p>

                            <div className="mt-4">
                              <PasswordField
                                label="Admin password"
                                value={deleteAction.password}
                                onChange={handleDeletePasswordChange}
                                placeholder="Enter current admin password"
                                icon={KeyRound}
                              />
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => submitDeleteAction(driver)}
                                disabled={deleteAction.loading}
                                className="interactive-button rounded-xl bg-[#C43F3F] px-4 py-3 font-bold text-white transition hover:bg-[#a83434] disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {deleteAction.loading
                                  ? "Processing..."
                                  : deleteAction.mode === "confirm"
                                    ? "Delete Driver Permanently"
                                    : "Start 3-Day Grace Period"}
                              </button>
                              <button
                                type="button"
                                onClick={closeDeleteAction}
                                className="interactive-button rounded-xl border border-[#D8D0BD] bg-white px-4 py-3 font-bold text-[#6F6758] transition hover:bg-[#fff8ea]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </Motion.div>
                    );
                  })
                ) : (
                  <div className="p-6">
                    <EmptyState
                      icon={Users}
                      title="No registered drivers found"
                      copy="Approved and pending drivers will be listed here once they are available in the system."
                    />
                  </div>
                )}
              </div>
            </div>
          </Motion.div>
        ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
