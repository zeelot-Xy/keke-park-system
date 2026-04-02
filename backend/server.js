const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const pool = require("./db/connection");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", credentials: true },
});

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// Rate limiter for join-queue
const joinLimiter = require("express-rate-limit")({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// Routes (imported below)
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);

// Global io emitter helper (used in controllers)
global.io = io;

// Socket connection
io.on("connection", (socket) => {
  console.log(socket.id, "Client connected");
  socket.on("disconnect", () => console.log(socket.id, "Client disconnected "));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚕 Keke Park Backend running on port ${PORT}`),
);
