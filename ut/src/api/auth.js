const BASE_URL = ""; 
// hvis du IKKE bruker proxy: const BASE_URL = "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include", // VIKTIG for express-session cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, error: data?.message || `HTTP ${res.status}`, data };
  }

  return { ok: true, data };
}

export async function apiRegister(payload) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function apiLogin(payload) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function apiLogout() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function apiMe() {
  return request("/api/auth/me", { method: "GET" });
}
