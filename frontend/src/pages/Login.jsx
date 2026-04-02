import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Login({ setUser }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/login", { phone, password });
      setUser(res.data.user);
      toast.success("Login successful 🚕");
      navigate(res.data.user.role === "admin" ? "/admin" : "/driver");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFED00] via-white to-[#FFED00] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🚕</div>
          <h1 className="text-4xl font-bold text-[#1A1A1A]">Keke Park</h1>
          <p className="text-gray-600">Driver Queue Management</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-4 border-2 border-[#1A1A1A] rounded-2xl text-lg focus:outline-none focus:border-[#FFED00]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border-2 border-[#1A1A1A] rounded-2xl text-lg focus:outline-none focus:border-[#FFED00]"
            required
          />
          <button
            type="submit"
            className="w-full bg-[#FFED00] hover:bg-yellow-300 text-[#1A1A1A] font-bold py-5 rounded-2xl text-xl active:scale-95 transition">
            Login
          </button>
        </form>
        <p className="text-center mt-6">
          No account?{" "}
          <a href="/register" className="text-[#008000] font-bold">
            Register as Driver
          </a>
        </p>
      </div>
    </div>
  );
}
