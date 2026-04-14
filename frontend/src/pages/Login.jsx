import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  Clock,
  Phone,
  RadioTower,
  Shield,
  Zap,
} from "lucide-react";
import api from "../lib/api";
import { setAuthTokens } from "../lib/auth";
import PasswordField from "../components/PasswordField";
import InlineNotice from "../components/InlineNotice";

const featureCards = [
  {
    icon: Zap,
    title: "Instant Queue Join",
    copy: "Join the queue with one tap and track your position live",
    delay: 0.2,
  },
  {
    icon: Shield,
    title: "Fair & Transparent",
    copy: "Every driver gets equal opportunity, no favoritism",
    delay: 0.3,
  },
  {
    icon: Clock,
    title: "Cooldown Management",
    copy: "Automatic rest periods ensure driver safety and fairness",
    delay: 0.4,
  },
];

export default function Login({ setUser }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const loginNotice = location.state?.notice;
  const verifiedStatus = new URLSearchParams(location.search).get("verified");
  const verificationMessages = {
    success:
      "Email verified successfully. Your driver account has been approved automatically and you can now sign in.",
    "already-verified":
      "This email was already verified earlier. You can sign in if the account is already approved.",
    "manual-review-required":
      "Your email was received, but this account still needs manual admin review.",
    "invalid-token":
      "That verification link is invalid or has already been used. You can still wait for admin approval within 24 hours.",
    "missing-token":
      "Verification link is incomplete. Please use the full email link.",
    "server-error":
      "Something went wrong while verifying your email. Please try again later or wait for admin approval within 24 hours.",
  };
  const verificationNotice = verifiedStatus
    ? verificationMessages[verifiedStatus] || verificationMessages["server-error"]
    : "";

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const res = await api.post("/api/auth/login", { phone, password });
      setAuthTokens(res.data);
      setUser(res.data.user);
      toast.success("Login successful");
      navigate(res.data.user.role === "admin" ? "/admin" : "/driver");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative hidden overflow-hidden bg-linear-to-br from-[#F4C542] via-[#DCA117] to-[#F4C542] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12"
        >
          <div className="absolute right-20 top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 left-20 h-96 w-96 rounded-full bg-[#14532D]/20 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-16 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B4D2F] shadow-lg">
                <Zap className="h-8 w-8 text-[#F4C542]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-[#14532D]">
                  Keke Park
                </h1>
                <p className="text-sm font-medium text-[#14532D]/70">
                  Queue System
                </p>
              </div>
            </div>

            <h2 className="mb-6 text-5xl leading-tight font-extrabold text-[#14532D]">
              Manage your park.
              <br />
              Simple. Fast.
              <br />
              Fair.
            </h2>
            <p className="mb-12 max-w-md text-xl text-[#14532D]/80">
              Digital queue management for Nigerian transport parks. No more
              waiting confusion.
            </p>

            <div className="space-y-4">
              {featureCards.map((item) => {
                const IconComponent = item.icon;

                return (
                  <Motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: item.delay, duration: 0.5 }}
                    className="rounded-[1.6rem] border border-white/30 bg-white/20 p-5 backdrop-blur-sm transition-all hover:bg-white/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#1B4D2F]">
                        <IconComponent
                          className="h-6 w-6 text-[#F4C542]"
                          strokeWidth={2}
                        />
                      </div>
                      <div>
                        <h3 className="mb-1 font-bold text-[#14532D]">
                          {item.title}
                        </h3>
                        <p className="text-sm text-[#14532D]/70">
                          {item.copy}
                        </p>
                      </div>
                    </div>
                  </Motion.div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-sm text-[#14532D]/60">
              Trusted by transport parks across Nigeria
            </p>
          </div>
        </Motion.section>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B4D2F]">
                <Zap className="h-7 w-7 text-[#F4C542]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#14532D]">
                  Keke Park
                </h1>
                <p className="text-xs text-[#6F6758]">Queue System</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#D8D0BD] bg-[#FFFBEA] p-8 shadow-xl shadow-black/5 lg:p-10">
              <h2 className="mb-2 text-3xl font-extrabold text-[#1D1A14]">
                Welcome back
              </h2>
              <p className="mb-8 text-[#6F6758]">
                Sign in to access your account
              </p>

              {loginNotice ? (
                <InlineNotice
                  type="success"
                  message={loginNotice}
                  className="mb-6"
                />
              ) : null}

              {!loginNotice && verificationNotice ? (
                <InlineNotice
                  type={verifiedStatus === "success" ? "success" : "info"}
                  message={verificationNotice}
                  className="mb-6"
                />
              ) : null}

              <form onSubmit={handleLogin} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#1D1A14]">
                    Phone Number
                  </span>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#6F6758]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="080 1234 5678"
                      className="w-full rounded-xl border-2 border-[#D8D0BD] bg-white py-3.5 pr-4 pl-12 text-[#1D1A14] outline-none transition-all placeholder:text-[#6F6758]/50 focus:border-[#F4C542] focus:ring-4 focus:ring-[#F4C542]/20"
                      required
                    />
                  </div>
                </label>

                <PasswordField
                  label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  inputClassName="rounded-xl border-2 border-[#D8D0BD] px-4 py-3.5 focus-within:border-[#F4C542] focus-within:ring-[#F4C542]/20"
                  required
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#F4C542] py-4 font-bold text-[#1D1A14] shadow-lg shadow-[#F4C542]/30 transition-all hover:-translate-y-0.5 hover:bg-[#DCA117] hover:shadow-xl hover:shadow-[#F4C542]/40"
                >
                  Sign In
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#6F6758]">
                  New driver?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-[#1B4D2F] underline underline-offset-2 transition-colors hover:text-[#14532D]"
                  >
                    Register here
                  </Link>
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-[#DCA117]/30 bg-[#FFE28A]/30 p-4">
                <p className="text-center text-xs text-[#6F6758]">
                  <span className="font-semibold text-[#1D1A14]">Note:</span>{" "}
                  Driver accounts require admin approval before activation
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4D2F] underline underline-offset-2 transition-colors hover:text-[#14532D]"
              >
                <RadioTower size={16} />
                Admin Login
              </Link>
            </div>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}
