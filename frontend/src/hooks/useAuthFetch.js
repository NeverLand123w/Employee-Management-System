import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

export function useAuthFetch() {
  const navigate = useNavigate();

  const authFetch = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("sessionExpired", "1");
        navigate("/", { replace: true });
        return res;
      }

      return res;
    },
    [navigate],
  );

  return authFetch;
}
