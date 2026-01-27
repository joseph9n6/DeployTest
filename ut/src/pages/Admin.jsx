import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "";

function statusLabel(status) {
  if (status === "PENDING") return "Avventer godkjenning";
  if (status === "APPROVED") return "Godkjent";
  if (status === "REJECTED") return "Avslått";
  return status || "";
}

export default function Admin() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ROLE REQUESTS ---
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  // --- USERS TABLE ---
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  async function fetchJSON(url, options = {}) {
    const res = await fetch(`${BASE_URL}${url}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Request failed: ${res.status}`);
    return json;
  }

  function getMainRole(roles) {
    const arr = Array.isArray(roles) ? roles : [];
    if (arr.includes("ADMIN")) return "ADMIN";
    if (arr.includes("CABIN_OWNER")) return "CABIN_OWNER";
    if (arr.includes("TOUR_LEADER")) return "TOUR_LEADER";
    return "CUSTOMER";
  }

  const myId = useMemo(() => String(me?._id || me?.id || ""), [me]);

  async function loadMeAndGuard() {
    const data = await fetchJSON("/api/auth/me", { method: "GET" });
    const user = data?.user || null;

    if (!user) {
      navigate("/login");
      return null;
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (!roles.includes("ADMIN")) {
      navigate("/");
      return null;
    }

    setMe(user);
    return user;
  }

  async function loadRequests(status) {
    setError("");
    const data = await fetchJSON(`/api/admin/role-requests?status=${status}`, { method: "GET" });
    setRequests(Array.isArray(data.requests) ? data.requests : []);
  }

  async function approveRequest(id) {
    setError("");
    await fetchJSON(`/api/admin/role-requests/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: "" })
    });
    await loadRequests(statusFilter);
    // valgfritt: refresh brukerliste for å se rolle endret med en gang
    await loadUsers(userQuery);
  }

  async function rejectRequest(id) {
    setError("");
    await fetchJSON(`/api/admin/role-requests/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: "" })
    });
    await loadRequests(statusFilter);
  }

  async function loadUsers(q = "") {
    setUsersLoading(true);
    setUsersError("");
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}` : "";
      const data = await fetchJSON(`/api/admin/users${qs}`, { method: "GET" });
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setUsersError(e.message);
    } finally {
      setUsersLoading(false);
    }
  }

  async function saveUserRole(userId, role) {
    setUsersError("");
    try {
      await fetchJSON(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      await loadUsers(userQuery);
    } catch (e) {
      setUsersError(e.message);
    }
  }

  async function deleteUser(userId) {
    if (!confirm("Er du sikker på at du vil slette denne brukeren?")) return;

    setUsersError("");
    try {
      await fetchJSON(`/api/admin/users/${userId}`, { method: "DELETE" });
      await loadUsers(userQuery);
    } catch (e) {
      setUsersError(e.message);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const user = await loadMeAndGuard();
        if (!user) return;

        await loadRequests(statusFilter);
        await loadUsers("");
      } catch (e) {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Laster…</div>;
  if (!me) return null;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Admin</h1>

      <div style={{ marginBottom: 12, fontSize: 14, color: "#555" }}>
        Logget inn som: <b>{me.username || me.email}</b>
      </div>

      {/* --- ROLE REQUESTS (øverst, som du ønsket) --- */}
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <label style={{ fontSize: 14 }}>Filter søknader:</label>
          <select
            value={statusFilter}
            onChange={async (e) => {
              const next = e.target.value;
              setStatusFilter(next);
              await loadRequests(next);
            }}
          >
            <option value="PENDING">Avventer godkjenning</option>
            <option value="APPROVED">Godkjent</option>
            <option value="REJECTED">Avslått</option>
          </select>

          <button
            onClick={() => loadRequests(statusFilter)}
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}
          >
            Oppdater
          </button>
        </div>

        {error ? <div style={{ marginBottom: 12, color: "crimson" }}>{error}</div> : null}

        {requests.length === 0 ? (
          <div style={{ color: "#666" }}>Ingen søknader.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {requests.map((r) => {
              const u = r.userId || {};
              const roles = Array.isArray(u.roles) ? u.roles.join(", ") : "";
              const fullName = u.profile?.fullName || u.username || u.email;

              return (
                <div
                  key={r._id}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: 10,
                    padding: 12
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{fullName}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>
                        {u.email ? u.email : ""} {roles ? `• Roles: ${roles}` : ""}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14 }}>
                        Søker om: <b>{r.requestedRole}</b> • Status: <b>{statusLabel(r.status)}</b>
                      </div>
                      {r.message ? (
                        <div style={{ marginTop: 6, fontSize: 14 }}>
                          <b>Melding:</b> {r.message}
                        </div>
                      ) : null}
                      <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>
                        Sendt: {r.createdAt ? new Date(r.createdAt).toLocaleString("no-NO") : ""}
                      </div>
                    </div>

                    {r.status === "PENDING" ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <button
                          onClick={() => approveRequest(r._id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #000",
                            background: "#000",
                            color: "#fff"
                          }}
                        >
                          Godkjenn
                        </button>
                        <button
                          onClick={() => rejectRequest(r._id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "#fff"
                          }}
                        >
                          Avslå
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {r.adminNote ? (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                      <b>Admin note:</b> {r.adminNote}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- USERS TABLE --- */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Admin – Brukere</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Søk på brukernavn eller e-post..."
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button
          onClick={() => loadUsers(userQuery)}
          style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8 }}
        >
          Søk
        </button>
        <button
          onClick={async () => {
            setUserQuery("");
            await loadUsers("");
          }}
          style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8 }}
        >
          Reset
        </button>
      </div>

      {usersError ? <div style={{ marginBottom: 10, color: "crimson" }}>{usersError}</div> : null}
      {usersLoading ? <div style={{ color: "#666" }}>Laster brukere…</div> : null}

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8f8f8" }}>
            <tr>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e5e5" }}>Brukernavn</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e5e5" }}>E-post</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e5e5" }}>Rolle</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e5e5" }}>Opprettet</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e5e5e5" }}>Handling</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const mainRole = getMainRole(u.roles);
              const isMe = String(u._id) === myId;

              return (
                <tr key={u._id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{u.username}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{u.email}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    <select
                      defaultValue={mainRole}
                      onChange={(e) => (u.__nextRole = e.target.value)}
                      style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: 8 }}
                    >
                      <option value="CUSTOMER">BRUKER</option>
                      <option value="CABIN_OWNER">HYTTEEIERE</option>
                      <option value="TOUR_LEADER">TURLEDER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleString("no-NO") : ""}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee", display: "flex", gap: 8 }}>
                    <button
                      onClick={() => saveUserRole(u._id, u.__nextRole || mainRole)}
                      style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
                    >
                      Lagre
                    </button>
                    <button
                      onClick={() => deleteUser(u._id)}
                      disabled={isMe}
                      title={isMe ? "Du kan ikke slette deg selv" : "Slett bruker"}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #f00",
                        color: "#f00",
                        borderRadius: 8,
                        opacity: isMe ? 0.5 : 1
                      }}
                    >
                      Slett
                    </button>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && !usersLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: 12, color: "#666" }}>
                  Ingen brukere funnet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

