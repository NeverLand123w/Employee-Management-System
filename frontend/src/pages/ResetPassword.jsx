import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        setTimeout(() => navigate("/", { replace: true }), 2500);
      } else {
        setStatus({ type: "error", message: data.message });
      }
    } catch {
      setStatus({ type: "error", message: "Server error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafafa] font-sans">
      <div className="w-full max-w-[360px] p-6 bg-white border border-zinc-200 rounded-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center mx-auto rounded-md mb-4 font-bold text-xl tracking-tighter">
            E/S
          </div>
          <h2 className="text-xl font-semibold text-black tracking-tight mb-1">
            Set a new password
          </h2>
          <p className="text-sm text-zinc-500">
            Choose a strong password for your account.
          </p>
        </div>

        {status.message && (
          <div
            className={`mb-4 p-3 rounded-md text-sm text-center ${
              status.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}
          >
            {status.message}
            {status.type === "success" && (
              <p className="text-xs mt-1 text-green-600">Redirecting to login…</p>
            )}
          </div>
        )}

        {status.type !== "success" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-xs text-zinc-400 hover:text-black transition-colors"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white px-4 py-2.5 text-sm font-medium rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-black transition-colors"
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
