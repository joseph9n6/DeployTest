import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LINKS = [
  { to: "/", label: "Hjem" },
  { to: "/trips", label: "Turer" },
  { to: "/cabin", label: "Hytte" },
  { to: "/ads", label: "Annonser" },
  { to: "/admin", label: "Admin" },
];

function LangToggle() {
  const [lang, setLang] = React.useState("no");
  return (
    <button
      className="rounded-xl px-3 py-2 text-sm font-semibold border border-white/30 hover:bg-white/10 transition"
      onClick={() => setLang((l) => (l === "no" ? "en" : "no"))}
      aria-label="Språk (NO/EN)"
      type="button"
    >
      {lang.toUpperCase()}
    </button>
  );
}

function initials(name = "") {
  const s = String(name).trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function getBackendBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
}

function avatarFromUser(user) {
  const raw = user?.avatarUrl;
  if (!raw || typeof raw !== "string") return "";

  const base = getBackendBase();

  // Normaliser: trim + bytt backslashes til /
  let p = raw.trim().replace(/\\/g, "/");

  // Full URL? -> bruk den direkte
  if (/^https?:\/\//i.test(p)) return p;

  // "uploads/..." -> "/uploads/..."
  if (p.startsWith("uploads/")) p = `/${p}`;

  // sørg for leading slash
  if (!p.startsWith("/")) p = `/${p}`;

  // encode segments (tåler mellomrom)
  p = p
    .split("/")
    .map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg)))
    .join("/");

  return `${base}${p}`;
}

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canCreateTour = roles.includes("ADMIN") || roles.includes("TOUR_LEADER");

  const username = user?.username || "Bruker";
  const avatar = avatarFromUser(user);

  // ✅ hvis avatar endrer seg (ny opplasting), prøv igjen
  const [avatarOk, setAvatarOk] = React.useState(true);
  React.useEffect(() => setAvatarOk(true), [avatar]);

  const close = () => setOpen(false);

  const navClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-base font-medium transition hover:bg-white/10 ${
      isActive ? "bg-white/15" : ""
    }`;

  const btnOutline =
    "rounded-xl px-4 py-2 text-sm font-semibold border border-white/30 hover:bg-white/10 transition";
  const btnSolid =
    "rounded-xl px-4 py-2 text-sm font-semibold bg-white text-green-900 hover:opacity-90 transition";

  const UserBadge = () => (
    <Link
      to="/profil"
      onClick={close}
      className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 transition"
      title="Gå til profil"
    >
      {avatar && avatarOk ? (
        <img
          src={avatar}
          alt="Profilbilde"
          className="h-8 w-8 rounded-full object-cover"
          loading="lazy"
          onError={() => setAvatarOk(false)}
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center text-sm font-bold">
          {initials(username)}
        </div>
      )}

      <div className="leading-tight">
        <div className="text-xs opacity-90">Innlogget:</div>
        <div className="text-sm font-semibold">{username}</div>
      </div>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-green-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 md:py-4 flex flex-wrap items-center justify-between gap-y-3">
        <Link to="/" onClick={close} className="font-bold text-2xl md:text-4xl">
          UTopia.no <span className="opacity-80 text-sm md:text-base">(demo)</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-2">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}

          {user ? (
            <>
              <NavLink to="/profil" className={navClass}>
                Profil
              </NavLink>

              {canCreateTour ? (
                <NavLink to="/tours/new" className={navClass}>
                  Opprett tur
                </NavLink>
              ) : null}

              <div className="ml-2 hidden lg:block">
                <UserBadge />
              </div>

              <button
                type="button"
                onClick={() => {
                  close();
                  logout();
                }}
                className={btnOutline}
              >
                Logg ut
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={close} className={btnOutline}>
                Logg inn
              </Link>
              <Link to="/register" onClick={close} className={btnSolid}>
                Registrer
              </Link>
            </>
          )}

          <LangToggle />
        </nav>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <LangToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl p-2 hover:bg-white/10 transition"
            aria-label={open ? "Lukk meny" : "Åpne meny"}
            aria-expanded={open}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="md:hidden border-t border-white/20">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass} onClick={close}>
                {l.label}
              </NavLink>
            ))}

            {user ? (
              <>
                <NavLink to="/profil" className={navClass} onClick={close}>
                  Profil
                </NavLink>

                {canCreateTour ? (
                  <NavLink to="/tours/new" className={navClass} onClick={close}>
                    Opprett tur
                  </NavLink>
                ) : null}

                <div className="mt-2">
                  <UserBadge />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    close();
                    logout();
                  }}
                  className={`${btnOutline} mt-2`}
                >
                  Logg ut
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link
                  to="/login"
                  onClick={close}
                  className={`${btnOutline} flex-1 text-center`}
                >
                  Logg inn
                </Link>
                <Link
                  to="/register"
                  onClick={close}
                  className={`${btnSolid} flex-1 text-center`}
                >
                  Registrer
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}




