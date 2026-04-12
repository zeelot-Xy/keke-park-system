import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  RadioTower,
  LockKeyhole,
} from "lucide-react";
import api from "../lib/api";
import { setAuthTokens } from "../lib/auth";
import BrandMark from "../components/BrandMark";
import PasswordField from "../components/PasswordField";

export default function Login({ setUser }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

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
    <div className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel relative hidden overflow-hidden rounded-[2rem] p-8 lg:block lg:p-10 animate-rise-in">
          <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-br from-[#ffe37d]/75 via-[#f7c935]/30 to-transparent" />
          <div className="absolute right-6 top-6 h-24 w-24 rounded-full border border-white/60" />
          <div className="absolute right-10 top-10 h-24 w-24 rounded-full border border-[#f4c542]/70 animate-spin-slow" />
          <div className="absolute -left-8 bottom-8 h-32 w-32 rounded-full bg-[#ffd95a]/35 blur-2xl" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="space-y-6">
              <BrandMark />
              <div className="space-y-3">
                <p className="status-chip bg-[#f4c542]/20 text-[#8d6508]">
                  <RadioTower size={14} />
                  Live queue visibility
                </p>
                <h1 className="max-w-lg text-5xl font-black leading-tight text-[#1d1a14]">
                  A cleaner, calmer dispatch experience for drivers and admins.
                </h1>
                <p className="max-w-xl text-lg leading-8 text-[#625b4e]">
                  Track payments, move the queue in real time, and manage park
                  operations with a faster, friendlier control surface.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Protected sessions",
                  copy: "Cookie-based auth with role checks for both portals.",
                },
                {
                  icon: Phone,
                  title: "Flexible login",
                  copy: "Drivers can sign in with 080 or +234 phone formats.",
                },
                {
                  icon: RadioTower,
                  title: "Realtime updates",
                  copy: "Queue changes appear instantly for everyone online.",
                },
              ].map((item) => {
                const IconComponent = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-[1.6rem] border border-white/70 bg-linear-to-br from-[#fff9e2] to-white/85 p-4 animate-float-soft"
                  >
                    <div className="mb-3 inline-flex rounded-2xl bg-[#f4c542] p-2.5 text-[#1b4d2f]">
                      <IconComponent size={18} />
                    </div>
                    <p className="font-bold text-[#1d1a14]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6f6758]">
                      {item.copy}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="glass-panel-strong animate-rise-in rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="space-y-3">
              <BrandMark compact />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6508]">
                  Welcome Back
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#1d1a14] sm:text-4xl">
                  Sign in to Keke Park
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-[#6f6758] sm:text-base">
                  Use your registered phone number and password to enter the
                  driver or admin portal.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3f392e]">
                Phone number
              </span>
              <div className="flex items-center gap-3 rounded-[1.35rem] border border-[#d8d0bd] bg-white px-4 py-4 shadow-sm transition focus-within:border-[#f4c542] focus-within:ring-4 focus-within:ring-[#f4c542]/20">
                <Phone size={18} className="text-[#1b4d2f]" />
                <input
                  type="tel"
                  placeholder="08031234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent text-base outline-none placeholder:text-[#9d9486]"
                  required
                />
              </div>
            </label>

            <PasswordField
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              icon={LockKeyhole}
              required
            />

            <button
              type="submit"
              className="group mt-2 flex w-full items-center justify-center gap-3 rounded-[1.4rem] bg-[#1b4d2f] px-6 py-4 text-lg font-bold text-white shadow-[0_18px_36px_rgba(27,77,47,0.24)] transition hover:-translate-y-0.5 hover:bg-[#143a24]"
            >
              Login
              <ArrowRight
                size={18}
                className="transition group-hover:translate-x-1"
              />
            </button>
          </form>

          <div className="mt-8 rounded-[1.4rem] border border-[#ecdca4] bg-[#fff7dc] p-4 text-sm leading-7 text-[#5f563f]">
            Driver accounts require admin approval before first access.
          </div>

          <p className="mt-6 text-center text-sm text-[#6f6758] sm:text-base">
            No account yet?{" "}
            <Link
              to="/register"
              className="font-bold text-[#1b4d2f] underline decoration-[#f4c542] decoration-2 underline-offset-4"
            >
              Register as a driver
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
