const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const pool = require("./db/connection");

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const uploadsDirectory = path.resolve(__dirname, "uploads");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDirectory));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);

global.io = io;

io.on("connection", (socket) => {
  console.log(socket.id, "Client connected");
  socket.on("disconnect", () => console.log(socket.id, "Client disconnected"));
});

app.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Passport photo must be 2MB or less" });
  }

  if (err?.message === "Only image files allowed") {
    return res.status(400).json({ message: err.message });
  }

  if (err?.message === "Origin not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }

  console.error("Unhandled server error:", err);
  return res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    server.listen(PORT, () => {
      console.log(`Keke Park Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
