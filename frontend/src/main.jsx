import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/next";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: "18px",
          border: "1px solid rgba(234, 223, 202, 0.95)",
          background: "rgba(255, 251, 235, 0.98)",
          color: "#1d1a14",
          boxShadow: "0 24px 70px rgba(85, 60, 7, 0.14)",
          padding: "14px 16px",
        },
        success: {
          iconTheme: {
            primary: "#1E7A45",
            secondary: "#FFFBEA",
          },
        },
        error: {
          iconTheme: {
            primary: "#C43F3F",
            secondary: "#FFFBEA",
          },
        },
      }}
    />
    <Analytics />
  </StrictMode>,
);
