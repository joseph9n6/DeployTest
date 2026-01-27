import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

// ✅ Bruk Vite env hvis du lager ut/.env, ellers fallback
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ✅ Normaliser user så Header alltid får avatarUrl når det finnes
function normalizeUser(u) {
  if (!u) return null;

  // prøv å finne avatar fra flere mulige felter
  const avatarUrl =
    u.avatarUrl ||
    u.avatar ||
    u.profileImage ||
    u.photoUrl ||
    u.imageUrl ||
    u.image ||
    (u.profile && (u.profile.avatarUrl || u.profile.avatar || u.profile.imageUrl)) ||
    "";

  // sørg for at avatarUrl er i format "/uploads/..."
  let fixedAvatar = avatarUrl;
  if (typeof fixedAvatar === "string") {
    fixedAvatar = fixedAvatar.trim().replace(/\\/g, "/");
    if (fixedAvatar && !fixedAvatar.startsWith("http") && !fixedAvatar.startsWith("/")) {
      fixedAvatar = `/${fixedAvatar}`;
    }
  } else {
    fixedAvatar = "";
  }

  return {
    ...u,
    avatarUrl: fixedAvatar || "", // ✅ garantert string
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, message: data.message || data.error || "Request failed" };
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hent innlogget bruker ved refresh
  useEffect(() => {
    (async () => {
      const data = await apiFetch("/api/auth/me", { method: "GET" });
      setUser(normalizeUser(data.user || null));
      setLoading(false);
    })();
  }, []);

  const register = async ({ username, email, password }) => {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    if (data.ok) setUser(normalizeUser(data.user));
    return data;
  };

  const login = async ({ identifier, password }) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    if (data.ok) setUser(normalizeUser(data.user));
    return data;
  };

  const logout = async () => {
    const data = await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    return data;
  };

  const value = useMemo(
    () => ({ user, loading, register, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}



