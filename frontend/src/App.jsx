import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import api from "./lib/api";
import { clearAuthTokens } from "./lib/auth";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setUser(res.data);
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error("Auth check failed:", err);
        }
        clearAuthTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !user ? (
              <Login setUser={setUser} />
            ) : (
              <Navigate
                to={user.role === "admin" ? "/admin" : "/driver"}
                replace
              />
            )
          }
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/driver"
          element={
            user?.role === "driver" ? (
              <DriverDashboard user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user?.role === "admin" ? (
              <AdminDashboard user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
