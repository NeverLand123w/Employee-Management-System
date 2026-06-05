import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";

const ProtectedRoute = ({ children, allowedRole }) => {
  const { slug } = useParams();
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  if (!token || !userString) {
    return <Navigate to="/" replace />;
  }

  try {
    const decodedToken = JSON.parse(atob(token.split(".")[1]));
    if (decodedToken.exp * 1000 < Date.now()) {
      localStorage.clear();
      sessionStorage.clear();
      return <Navigate to="/" replace />;
    }
  } catch (error) {
    localStorage.clear();
    sessionStorage.clear();
    return <Navigate to="/" replace />;
  }

  const user = JSON.parse(userString);
  const nameSlug = user.name ? user.name.split(" ")[0].toLowerCase() : "user";
  const expectedSlug = `${nameSlug}-${user.id.slice(-8)}`;

  if (allowedRole && user.role !== allowedRole) {
    const correctPath =
      user.role === "Admin"
        ? `/admin-dashboard/${expectedSlug}`
        : `/employee-dashboard/${expectedSlug}`;
    return <Navigate to={correctPath} replace />;
  }

  if (slug && slug !== expectedSlug) {
    const rolePath =
      user.role === "Admin"
        ? `/admin-dashboard/${expectedSlug}`
        : `/employee-dashboard/${expectedSlug}`;
    return <Navigate to={rolePath} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/admin-dashboard/:slug"
          element={
            <ProtectedRoute allowedRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee-dashboard/:slug"
          element={
            <ProtectedRoute allowedRole="Employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
