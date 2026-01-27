// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Bruk proxy (anbefalt) -> API = ""
const API = "";

// Trengs for /uploads/... (så browser ikke prøver å hente fra 5173)
const BACKEND_BASE = "http://localhost:5000";

function resolveImageUrl(u) {
  if (!u) return "";
  if (typeof u !== "string") return "";
  if (u.startsWith("/uploads/")) return `${BACKEND_BASE}${u}`;
  if (/^https?:\/\//i.test(u)) return u;
  return u;
}

async function apiFetch(path, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.message || data.error || "Request failed", data };
  return data;
}

function RoleBadge({ role }) {
  const labelMap = {
    CUSTOMER: "Bruker",
    TOUR_LEADER: "Turleder",
    CABIN_OWNER: "Hytteeier",
    ADMIN: "Admin"
  };

  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-xs">
      {labelMap[role] || role}
    </span>
  );
}

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const map = {
    PENDING: "Venter",
    APPROVED: "Godkjent",
    REJECTED: "Avslått",
    CONFIRMED: "Bekreftet",
    CANCELLED: "Avbooket"
  };
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-xs">
      {map[s] || status}
    </span>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{description}</div>
      {actionLabel ? (
        <button onClick={onAction} className="mt-3 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function fmt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("no-NO");
  } catch {
    return String(iso);
  }
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user]);
  const isAdmin = roles.includes("ADMIN");
  const hasCabinOwner = roles.includes("CABIN_OWNER");
  const hasTourLeader = roles.includes("TOUR_LEADER");

  // ---- Profile ----
  const [profile, setProfile] = useState({ fullName: "", bio: "", location: "", avatarUrl: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ---- Avatar upload/remove ----
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // ---- My Tours (Tour Leader/Admin) ----
  const [myTours, setMyTours] = useState([]);
  const [myToursLoading, setMyToursLoading] = useState(false);
  const [myToursError, setMyToursError] = useState("");

  // ---- Bookings for a tour (on-demand per tour) ----
  const [tourBookingsMap, setTourBookingsMap] = useState({}); // { [tourId]: { loading, error, bookings, open } }

  // ---- Cabins (CABIN_OWNER) – optional depending on your backend ----
  const [myCabins, setMyCabins] = useState([]);
  const [myCabinsLoading, setMyCabinsLoading] = useState(false);
  const [myCabinsError, setMyCabinsError] = useState("");

  const [cabinBookingsMap, setCabinBookingsMap] = useState({}); // same structure as tours

  // ---- Role request UI ----
  const [rrRole, setRrRole] = useState("CABIN_OWNER");
  const [rrMessage, setRrMessage] = useState("");
  const [rrSubmitting, setRrSubmitting] = useState(false);
  const [rrError, setRrError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [myReqLoading, setMyReqLoading] = useState(false);

  async function loadProfile() {
    setError("");
    setProfileLoading(true);

    const data = await apiFetch("/api/profile", { method: "GET" });
    setProfileLoading(false);

    if (!data.ok) {
      setError(data.message);
      return;
    }

    setProfile(data.profile || { fullName: "", bio: "", location: "", avatarUrl: "" });
  }

  async function loadMyRequests() {
    setMyReqLoading(true);
    setRrError("");

    const data = await apiFetch("/api/role-requests/me", { method: "GET" });
    setMyReqLoading(false);

    if (!data.ok) {
      setRrError(data.message);
      return;
    }
    setMyRequests(Array.isArray(data.requests) ? data.requests : []);
  }

  async function loadMyTours() {
    if (!(hasTourLeader || isAdmin)) return;

    setMyToursLoading(true);
    setMyToursError("");

    const data = await apiFetch("/api/tours/mine", { method: "GET" });
    setMyToursLoading(false);

    if (!data.ok) {
      setMyToursError(data.message);
      return;
    }
    setMyTours(Array.isArray(data.tours) ? data.tours : []);
  }

  async function loadMyCabins() {
    if (!hasCabinOwner && !isAdmin) return;

    setMyCabinsLoading(true);
    setMyCabinsError("");

    // NB: Krever at du har disse routene. Hvis ikke: UI viser feilen pent.
    const data = await apiFetch("/api/cabins/mine", { method: "GET" });
    setMyCabinsLoading(false);

    if (!data.ok) {
      setMyCabinsError(data.message);
      return;
    }
    setMyCabins(Array.isArray(data.cabins) ? data.cabins : []);
  }

  useEffect(() => {
    (async () => {
      await loadProfile();
      await loadMyRequests();
      await loadMyTours();
      await loadMyCabins();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const data = await apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile)
    });

    setSaving(false);

    if (!data.ok) {
      setError(data.message);
      return;
    }

    setProfile(data.profile || profile);
    alert("Profil lagret!");
  }

  async function uploadAvatar() {
    setAvatarError("");

    if (!avatarFile) {
      setAvatarError("Velg et bilde først.");
      return;
    }

    // Basic frontend-sjekk
    const okType = /^image\//.test(avatarFile.type);
    if (!okType) {
      setAvatarError("Kun bildefiler er tillatt.");
      return;
    }

    const fd = new FormData();
    fd.append("avatar", avatarFile);

    setAvatarUploading(true);

    // Forventet backend: POST /api/profile/avatar (multipart)
    const data = await apiFetch("/api/profile/avatar", {
      method: "POST",
      body: fd
    });

    setAvatarUploading(false);

    if (!data.ok) {
      setAvatarError(data.message || "Kunne ikke laste opp avatar");
      return;
    }

    const newUrl = data.avatarUrl || data.profile?.avatarUrl || "";
    setProfile((p) => ({ ...p, avatarUrl: newUrl }));
    setAvatarFile(null);
    alert("Avatar oppdatert!");
  }

  async function removeAvatar() {
    setAvatarError("");
    setAvatarUploading(true);

    // Forventet backend: DELETE /api/profile/avatar
    const data = await apiFetch("/api/profile/avatar", { method: "DELETE" });

    setAvatarUploading(false);

    if (!data.ok) {
      setAvatarError(data.message || "Kunne ikke fjerne avatar");
      return;
    }

    setProfile((p) => ({ ...p, avatarUrl: "" }));
    setAvatarFile(null);
    alert("Avatar fjernet!");
  }

  async function onDeleteProfile() {
    setError("");
    const data = await apiFetch("/api/profile", { method: "DELETE" });
    if (!data.ok) {
      setError(data.message);
      return;
    }
    setProfile({ fullName: "", bio: "", location: "", avatarUrl: "" });
  }

  async function onDeleteAccount() {
    setError("");
    const data = await apiFetch("/api/profile/account", { method: "DELETE" });
    if (!data.ok) {
      setError(data.message);
      return;
    }
    await logout();
    navigate("/", { replace: true });
  }

  async function submitRoleRequest(e) {
    e.preventDefault();
    setRrSubmitting(true);
    setRrError("");

    if (rrRole === "CABIN_OWNER" && hasCabinOwner) {
      setRrSubmitting(false);
      setRrError("Du har allerede rollen CABIN_OWNER.");
      return;
    }
    if (rrRole === "TOUR_LEADER" && hasTourLeader) {
      setRrSubmitting(false);
      setRrError("Du har allerede rollen TOUR_LEADER.");
      return;
    }

    const data = await apiFetch("/api/role-requests", {
      method: "POST",
      body: JSON.stringify({
        requestedRole: rrRole,
        message: rrMessage
      })
    });

    setRrSubmitting(false);

    if (!data.ok) {
      setRrError(data.message);
      return;
    }

    setRrMessage("");
    await loadMyRequests();
    alert("Søknad sendt! Admin vil vurdere den.");
  }

  // ---------- Bookings (Tour leader/cabin owner) ----------
  async function toggleTourBookings(tourId) {
    const prev = tourBookingsMap[tourId] || { open: false, loading: false, error: "", bookings: null };
    const willOpen = !prev.open;

    setTourBookingsMap((m) => ({ ...m, [tourId]: { ...prev, open: willOpen } }));

    const alreadyLoaded = Array.isArray(prev.bookings);
    if (willOpen && !alreadyLoaded) {
      await loadTourBookings(tourId);
    }
  }

  async function loadTourBookings(tourId) {
    setTourBookingsMap((m) => ({
      ...m,
      [tourId]: { ...(m[tourId] || {}), loading: true, error: "" }
    }));

    // Forventet backend: GET /api/tours/:id/bookings
    const data = await apiFetch(`/api/tours/${tourId}/bookings`, { method: "GET" });

    if (!data.ok) {
      setTourBookingsMap((m) => ({
        ...m,
        [tourId]: {
          ...(m[tourId] || {}),
          loading: false,
          error: data.message || "Kunne ikke hente bookinger",
          bookings: []
        }
      }));
      return;
    }

    setTourBookingsMap((m) => ({
      ...m,
      [tourId]: {
        ...(m[tourId] || {}),
        loading: false,
        error: "",
        bookings: Array.isArray(data.bookings) ? data.bookings : []
      }
    }));
  }

  async function toggleCabinBookings(cabinId) {
    const prev = cabinBookingsMap[cabinId] || { open: false, loading: false, error: "", bookings: null };
    const willOpen = !prev.open;

    setCabinBookingsMap((m) => ({ ...m, [cabinId]: { ...prev, open: willOpen } }));

    const alreadyLoaded = Array.isArray(prev.bookings);
    if (willOpen && !alreadyLoaded) {
      await loadCabinBookings(cabinId);
    }
  }

  async function loadCabinBookings(cabinId) {
    setCabinBookingsMap((m) => ({
      ...m,
      [cabinId]: { ...(m[cabinId] || {}), loading: true, error: "" }
    }));

    // Forventet backend: GET /api/cabins/:id/bookings
    const data = await apiFetch(`/api/cabins/${cabinId}/bookings`, { method: "GET" });

    if (!data.ok) {
      setCabinBookingsMap((m) => ({
        ...m,
        [cabinId]: {
          ...(m[cabinId] || {}),
          loading: false,
          error: data.message || "Kunne ikke hente bookinger",
          bookings: []
        }
      }));
      return;
    }

    setCabinBookingsMap((m) => ({
      ...m,
      [cabinId]: {
        ...(m[cabinId] || {}),
        loading: false,
        error: "",
        bookings: Array.isArray(data.bookings) ? data.bookings : []
      }
    }));
  }

  const displayName = profile.fullName?.trim() || user?.username || "Bruker";
  const avatarSrc = resolveImageUrl(profile.avatarUrl);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-gray-50">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-600">
                  {String(displayName).slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-xl font-semibold">{displayName}</h1>
              <div className="mt-1 text-sm text-gray-600">
                Innlogget som: <span className="font-medium">{user?.username}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {roles.length ? roles.map((r) => <RoleBadge key={r} role={r} />) : <RoleBadge role="CUSTOMER" />}
              </div>

              {profile.location ? <div className="mt-2 text-sm text-gray-700">Sted: {profile.location}</div> : null}
              {profile.bio ? <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</div> : null}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {(hasTourLeader || isAdmin) ? (
              <button onClick={() => navigate("/tours/new")} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                Opprett tur
              </button>
            ) : null}

            {isAdmin ? (
              <button onClick={() => navigate("/admin")} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                Adminpanel
              </button>
            ) : null}

            <button onClick={() => navigate("/")} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
              Til forsiden
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border p-3 text-sm">
            <span className="font-semibold">Feil:</span> {error}
          </div>
        ) : null}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Edit Profile */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold">Profilinnstillinger</h2>
              <p className="text-sm text-gray-600">Oppdater informasjonen som vises på profilen.</p>
            </div>

            {profileLoading ? (
              <div className="text-sm text-gray-600">Laster profil…</div>
            ) : (
              <form onSubmit={onSave} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm">Fullt navn</label>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    value={profile.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="F.eks. Ola Nordmann"
                  />
                </div>

                {/* Avatar upload + remove */}
                <div className="space-y-1">
                  <label className="text-sm">Avatar</label>

                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-md border p-2 text-sm bg-white"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={uploadAvatar}
                        disabled={avatarUploading || !avatarFile}
                        className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                      >
                        {avatarUploading ? "Laster opp…" : "Last opp avatar"}
                      </button>

                      <button
                        type="button"
                        onClick={removeAvatar}
                        disabled={avatarUploading || !profile.avatarUrl}
                        className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                      >
                        {avatarUploading ? "Jobber…" : "Fjern avatar"}
                      </button>
                    </div>

                    {avatarError ? <div className="text-sm text-red-700">{avatarError}</div> : null}

                    <div className="text-xs text-gray-500">
                      Avatar lagres som fil og settes som <code>/uploads/...</code> i databasen.
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Bio</label>
                  <textarea
                    className="w-full rounded-md border p-2 text-sm"
                    rows={4}
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Kort om deg (erfaring, hva du tilbyr, interesser)."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Sted</label>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    value={profile.location}
                    onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    placeholder="F.eks. Oslo"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  {saving ? "Lagrer…" : "Lagre endringer"}
                </button>
              </form>
            )}
          </div>

          {/* Account actions */}
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="text-base font-semibold">Konto</h2>
            <p className="mt-1 text-sm text-gray-600">Disse handlingene kan ikke angres. Vær forsiktig.</p>

            <div className="mt-3 flex flex-col gap-2">
              <button onClick={onDeleteProfile} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                Slett profilinfo
              </button>
              <button onClick={onDeleteAccount} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                Slett bruker
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tours dashboard */}
          {(hasTourLeader || isAdmin) ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Mine turer</h2>
                  <p className="text-sm text-gray-600">Oversikt og bookinger for turene du har opprettet.</p>
                </div>

                <button onClick={() => navigate("/tours/new")} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                  Opprett tur
                </button>
              </div>

              {myToursError ? (
                <div className="mt-3 rounded-md border p-3 text-sm">
                  <span className="font-semibold">Kunne ikke laste turer:</span> {myToursError}
                  <div className="mt-2">
                    <button onClick={loadMyTours} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                      Prøv igjen
                    </button>
                  </div>
                </div>
              ) : myToursLoading ? (
                <div className="mt-3 text-sm text-gray-600">Laster turer…</div>
              ) : myTours.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="Ingen turer ennå"
                    description="Opprett din første tur for å få den synlig i systemet."
                    actionLabel="Opprett tur"
                    onAction={() => navigate("/tours/new")}
                  />
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {myTours.map((t) => {
                    const st = tourBookingsMap[t._id] || { open: false, loading: false, error: "", bookings: null };
                    const start = t.startDateTime ? new Date(t.startDateTime).toLocaleString("no-NO") : "";

                    return (
                      <div key={t._id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{t.title || "Uten tittel"}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              {start || "Dato ikke satt"}
                              {t.startLocation?.name ? ` • ${t.startLocation.name}` : ""}
                            </div>

                            <div className="mt-2 text-xs text-gray-600">
                              Plasser: <b>{Math.max(0, (t.maxParticipants || 0) - (t.participantsCount || 0))}</b> ledig •{" "}
                              {t.participantsCount || 0}/{t.maxParticipants || 0}
                              <span className="mx-2">•</span>
                              <StatusPill status={t.status} />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => navigate(`/tours/${t._id}`)}
                              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Vis
                            </button>
                            <button
                              onClick={() => navigate(`/tours/${t._id}/edit`)}
                              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Rediger
                            </button>
                            <button
                              onClick={() => toggleTourBookings(t._id)}
                              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {st.open ? "Skjul bookinger" : "Se bookinger"}
                            </button>
                          </div>
                        </div>

                        {/* Bookings panel */}
                        {st.open ? (
                          <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Bookinger</div>
                              <button
                                onClick={() => loadTourBookings(t._id)}
                                className="rounded-md border px-3 py-1.5 text-xs hover:bg-white"
                                disabled={st.loading}
                              >
                                {st.loading ? "Oppdaterer…" : "Oppdater"}
                              </button>
                            </div>

                            {st.error ? (
                              <div className="mt-2 text-sm text-red-700">
                                {st.error}
                                <div className="mt-2 text-xs text-gray-600">
                                  Dette krever backend: <code>GET /api/tours/:id/bookings</code>
                                </div>
                              </div>
                            ) : st.loading ? (
                              <div className="mt-2 text-sm text-gray-600">Laster bookinger…</div>
                            ) : Array.isArray(st.bookings) && st.bookings.length === 0 ? (
                              <div className="mt-2 text-sm text-gray-600">Ingen bookinger på denne turen enda.</div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {(st.bookings || []).map((b) => {
                                  const u = b.user || b.userId || {};
                                  const name = u?.profile?.fullName || u?.fullName || u?.username || "Bruker";
                                  const uname = u?.username ? `@${u.username}` : "";
                                  const aUrl = resolveImageUrl(u?.profile?.avatarUrl || u?.avatarUrl || "");

                                  return (
                                    <div key={b._id} className="rounded-md border bg-white p-2 flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-full overflow-hidden border bg-gray-50 shrink-0">
                                        {aUrl ? (
                                          <img src={aUrl} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="h-full w-full grid place-items-center text-xs text-gray-600">
                                            {String(name).slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium truncate">
                                          {name} <span className="text-gray-500 font-normal">{uname}</span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {fmt(b.createdAt)} <span className="mx-2">•</span> <StatusPill status={b.status} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="Vil du bli turleder?"
              description="Som turleder kan du opprette og administrere turer, og se hvem som har booket."
            />
          )}

          {/* Cabins dashboard (hytteeier) */}
          {(hasCabinOwner || isAdmin) ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Mine hytter</h2>
                  <p className="text-sm text-gray-600">Oversikt og bookinger for hyttene dine.</p>
                </div>
              </div>

              {myCabinsError ? (
                <div className="mt-3 rounded-md border p-3 text-sm">
                  <span className="font-semibold">Kunne ikke laste hytter:</span> {myCabinsError}
                  <div className="mt-2">
                    <button onClick={loadMyCabins} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                      Prøv igjen
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Dette krever backend: <code>GET /api/cabins/mine</code>.
                  </div>
                </div>
              ) : myCabinsLoading ? (
                <div className="mt-3 text-sm text-gray-600">Laster hytter…</div>
              ) : myCabins.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600">Ingen hytter funnet (eller ikke implementert).</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {myCabins.map((c) => {
                    const st = cabinBookingsMap[c._id] || { open: false, loading: false, error: "", bookings: null };
                    return (
                      <div key={c._id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{c.title || c.name || "Uten navn"}</div>
                            <div className="mt-1 text-sm text-gray-600">{c.location || c.address || ""}</div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => navigate(`/cabin/${c._id}`)}
                              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Vis
                            </button>
                            <button
                              onClick={() => toggleCabinBookings(c._id)}
                              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {st.open ? "Skjul bookinger" : "Se bookinger"}
                            </button>
                          </div>
                        </div>

                        {st.open ? (
                          <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">Bookinger</div>
                              <button
                                onClick={() => loadCabinBookings(c._id)}
                                className="rounded-md border px-3 py-1.5 text-xs hover:bg-white"
                                disabled={st.loading}
                              >
                                {st.loading ? "Oppdaterer…" : "Oppdater"}
                              </button>
                            </div>

                            {st.error ? (
                              <div className="mt-2 text-sm text-red-700">
                                {st.error}
                                <div className="mt-2 text-xs text-gray-600">
                                  Dette krever backend: <code>GET /api/cabins/:id/bookings</code>
                                </div>
                              </div>
                            ) : st.loading ? (
                              <div className="mt-2 text-sm text-gray-600">Laster bookinger…</div>
                            ) : Array.isArray(st.bookings) && st.bookings.length === 0 ? (
                              <div className="mt-2 text-sm text-gray-600">Ingen bookinger på denne hytta enda.</div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {(st.bookings || []).map((b) => {
                                  const u = b.user || b.userId || {};
                                  const name = u?.profile?.fullName || u?.fullName || u?.username || "Bruker";
                                  const uname = u?.username ? `@${u.username}` : "";
                                  const aUrl = resolveImageUrl(u?.profile?.avatarUrl || u?.avatarUrl || "");

                                  return (
                                    <div key={b._id} className="rounded-md border bg-white p-2 flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-full overflow-hidden border bg-gray-50 shrink-0">
                                        {aUrl ? (
                                          <img src={aUrl} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="h-full w-full grid place-items-center text-xs text-gray-600">
                                            {String(name).slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium truncate">
                                          {name} <span className="text-gray-500 font-normal">{uname}</span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {fmt(b.createdAt)} <span className="mx-2">•</span> <StatusPill status={b.status} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Role request (ikke admin) */}
          {!isAdmin ? (
            <div className="rounded-2xl border bg-white p-4 space-y-4">
              <div>
                <h2 className="text-base font-semibold">Søk om rolle</h2>
                <p className="text-sm text-gray-600">
                  Søk om å bli <b>Hytteeier</b> eller <b>Turleder</b>. Søknaden sendes til admin for godkjenning.
                </p>
              </div>

              {rrError ? <p className="rounded-md border p-3 text-sm">{rrError}</p> : null}

              <form onSubmit={submitRoleRequest} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm">Jeg vil søke om</label>
                  <select
                    className="w-full rounded-md border p-2 text-sm"
                    value={rrRole}
                    onChange={(e) => setRrRole(e.target.value)}
                  >
                    <option value="CABIN_OWNER" disabled={hasCabinOwner}>
                      CABIN_OWNER {hasCabinOwner ? "(du har allerede)" : ""}
                    </option>
                    <option value="TOUR_LEADER" disabled={hasTourLeader}>
                      TOUR_LEADER {hasTourLeader ? "(du har allerede)" : ""}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Hvorfor søker du? (valgfritt)</label>
                  <textarea
                    className="w-full rounded-md border p-2 text-sm"
                    rows={3}
                    value={rrMessage}
                    onChange={(e) => setRrMessage(e.target.value)}
                    placeholder="Skriv kort hvorfor du ønsker rollen..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={rrSubmitting}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  >
                    {rrSubmitting ? "Sender…" : "Send søknad"}
                  </button>

                  <button
                    type="button"
                    onClick={loadMyRequests}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Oppdater status
                  </button>
                </div>
              </form>

              {/* Mine søknader */}
              <div className="pt-2">
                <h3 className="font-semibold mb-2">Mine søknader</h3>

                {myReqLoading ? (
                  <div className="text-sm text-gray-600">Laster…</div>
                ) : myRequests.length === 0 ? (
                  <div className="text-sm text-gray-600">Ingen søknader ennå.</div>
                ) : (
                  <div className="space-y-2">
                    {myRequests.map((r) => (
                      <div key={r._id} className="rounded-xl border p-3 text-sm bg-gray-50">
                        <div className="flex flex-wrap items-center gap-2">
                          <div>
                            Rolle: <b>{r.requestedRole}</b>
                          </div>
                          <StatusPill status={r.status} />
                        </div>

                        {r.message ? (
                          <div className="text-gray-700 mt-2 whitespace-pre-wrap">
                            <span className="font-semibold">Melding:</span> {r.message}
                          </div>
                        ) : null}

                        {r.adminNote ? (
                          <div className="text-gray-700 mt-2 whitespace-pre-wrap">
                            <span className="font-semibold">Admin note:</span> {r.adminNote}
                          </div>
                        ) : null}

                        <div className="text-xs text-gray-500 mt-2">Sendt: {r.createdAt ? fmt(r.createdAt) : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
