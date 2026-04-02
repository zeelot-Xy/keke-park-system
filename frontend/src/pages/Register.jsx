import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    license_number: "",
    plate_number: "",
  });
  const [photo, setPhoto] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photo) {
      toast.error("Please select a passport photo");
      return;
    }

    const data = new FormData();
    Object.keys(form).forEach((key) => {
      data.append(key, form[key]);
    });
    data.append("passport_photo", photo); // Make sure the key exactly matches backend

    try {
      const res = await axios.post("/api/auth/register", data, {
        headers: {
          "Content-Type": "multipart/form-data", // Important: let browser set it, but this helps sometimes
        },
      });
      toast.success("Registration successful! Awaiting admin approval.");
      navigate("/login");
    } catch (err) {
      console.error("Full registration error:", err.response?.data || err); // ← Add this for debugging
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        "Registration failed. Check console.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFED00] to-white p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚕🇳🇬</div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">
            Driver Registration
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* All fields with large inputs */}
          <input
            type="text"
            placeholder="Full Name"
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full p-4 border-2 rounded-2xl text-lg"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full p-4 border-2 rounded-2xl text-lg"
            required
          />
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-4 border-2 rounded-2xl text-lg"
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full p-4 border-2 rounded-2xl text-lg"
            required
          />
          <input
            type="text"
            placeholder="License Number"
            onChange={(e) =>
              setForm({ ...form, license_number: e.target.value })
            }
            className="w-full p-4 border-2 rounded-2xl text-lg"
            required
          />
          <input
            type="text"
            placeholder="Plate Number"
            onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
            className="w-full p-4 border-2 rounded-2xl text-lg"
            required
          />
          <label className="block">
            Passport Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
              className="mt-2 block w-full text-lg"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full bg-[#008000] hover:bg-green-700 text-white font-bold py-5 rounded-2xl text-xl">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
