import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "../components/Modals";

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [existingUser, setExistingUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      setExistingUser(JSON.parse(userStr));
      setShowLogoutConfirm(true);
    }
  }, []);

  const handleConfirmLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setShowLogoutConfirm(false);
    setExistingUser(null);
  };

  const handleCancelLogout = () => {
    if (!existingUser) return;
    const nameSlug = existingUser.name
      ? existingUser.name.split(" ")[0].toLowerCase()
      : "user";
    const userSlug = `${nameSlug}-${existingUser.id.slice(-8)}`;
    if (existingUser.role === "Admin") {
      navigate(`/admin-dashboard/${userSlug}`, { replace: true });
    } else {
      navigate(`/employee-dashboard/${userSlug}`, { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        const nameSlug = data.user.name
          ? data.user.name.split(" ")[0].toLowerCase()
          : "user";
        const userSlug = `${nameSlug}-${data.user.id.slice(-8)}`;

        if (data.user.role === "Admin") {
          navigate(`/admin-dashboard/${userSlug}`, { replace: true });
        } else {
          navigate(`/employee-dashboard/${userSlug}`, { replace: true });
        }
      } else {
        setError(data.message || "Failed to authenticate.");
      }
    } catch (error) {
      setError("Server error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafafa] font-sans relative">
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Log out?"
        message="You navigated back to the login screen. Do you want to sign out of your active session?"
        confirmText="Yes, Log Out"
        isDestructive={true}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />

      <div className="w-full max-w-[360px] p-6 bg-white border border-zinc-200 rounded-md z-10">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center mx-auto rounded-md mb-4 font-bold text-xl tracking-tighter">
            E/S
          </div>
          <h2 className="text-xl font-semibold text-black tracking-tight mb-1">
            Sign in to your account
          </h2>
          <p className="text-sm text-zinc-500">
            Enter your corporate email to continue
          </p>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
              required
              disabled={showLogoutConfirm}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest">
                Password
              </label>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
              required
              disabled={showLogoutConfirm}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || showLogoutConfirm}
            className="w-full bg-black text-white px-4 py-2.5 text-sm font-medium rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
      <div className="absolute bottom-6 text-center w-full z-10">
        <p className="text-xs text-zinc-400 font-medium tracking-wide">
          SECURE EMPLOYEE MANAGEMENT SYSTEM
        </p>
      </div>
    </div>
  );
};

export default Login;
