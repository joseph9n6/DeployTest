// src/pages/Trips.jsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * API_BASE:
 * - bruk "" hvis du har Vite proxy for /api
 * - bruk "http://localhost:5000" hvis du ikke har proxy
 */
const API_BASE = "";

/**
 * BACKEND_BASE:
 * Må peke på backend for å vise opplastede bilder ("/uploads/..."),
 * ellers prøver browser å hente fra frontend (5173).
 *
 * Sett samme som i Home.jsx
 */
const BACKEND_BASE = "http://localhost:5000";

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data.error || data.message || `HTTP ${res.status}`,
      stack: data.stack,
      path: data.path
    };
  }
  return data;
}

/**
 * Samme bilde-logikk som Home.jsx
 * - "/uploads/..." => BACKEND_BASE + url
 * - "http(s)://..." => behold
 * - annet => returner som det er
 */
function resolveImageUrl(u) {
  if (!u) return "";
  if (typeof u !== "string") return "";
  if (u.startsWith("/uploads/")) return `${BACKEND_BASE}${u}`;
  if (/^https?:\/\//i.test(u)) return u;
  return u;
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("no-NO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function money(price) {
  if (!price || typeof price !== "object") return "Gratis";
  const amount = Number(price.amount || 0);
  const currency = price.currency || "NOK";
  if (!amount) return "Gratis";
  return `${amount} ${currency}`;
}

function badge(status) {
  const s = String(status || "DRAFT");
  const map = {
    PUBLISHED: "bg-green-50 border-green-200 text-green-800",
    FULL: "bg-red-50 border-red-200 text-red-800",
    DRAFT: "bg-gray-50 border-gray-200 text-gray-700",
    CANCELLED: "bg-yellow-50 border-yellow-200 text-yellow-800"
  };
  return map[s] || "bg-gray-50 border-gray-200 text-gray-700";
}

/**
 * Siden Home bruker item.imageUrl, gjør vi Trips robust:
 * - støtter t.imageUrl direkte (som Home)
 * - støtter t.coverImage.url / t.coverImage (string)
 * - støtter t.images[0]
 * - til slutt: tom streng
 */
function getCoverUrl(t) {
  if (!t) return "";

  // Home-stil
  if (t.imageUrl) return resolveImageUrl(t.imageUrl);

  // coverImage kan være string eller {url, alt}
  if (typeof t.coverImage === "string") return resolveImageUrl(t.coverImage);
  if (t.coverImage && typeof t.coverImage === "object" && t.coverImage.url) return resolveImageUrl(t.coverImage.url);

  // alternativ: images[]
  if (Array.isArray(t.images) && t.images.length > 0) {
    const first = t.images[0];
    if (typeof first === "string") return resolveImageUrl(first);
    if (first?.url) return resolveImageUrl(first.url);
  }

  return "";
}

function getCoverAlt(t) {
  if (!t) return "Tur";
  if (t.coverImage && typeof t.coverImage === "object" && t.coverImage.alt) return t.coverImage.alt;
  return t.title || "Tur";
}

function getGallery(t) {
  // Modell: galleryImages: [{url, alt}] | string[]
  if (!Array.isArray(t?.galleryImages)) return [];
  return t.galleryImages
    .map((g) => {
      if (typeof g === "string") return { url: resolveImageUrl(g), alt: t?.title || "Tur" };
      return { url: resolveImageUrl(g?.url || ""), alt: g?.alt || t?.title || "Tur" };
    })
    .filter((x) => x.url);
}

export default function Trips() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canManage = roles.includes("TOUR_LEADER") || roles.includes("ADMIN");

  const [tab, setTab] = React.useState("public"); // public | mine
  const [q, setQ] = React.useState(""); // søk
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [tours, setTours] = React.useState([]);

  async function loadPublic() {
    setLoading(true);
    setError("");
    const data = await fetchJSON("/api/tours", { method: "GET" });
    setLoading(false);

    if (!data.ok) {
      setError(data.error || "Kunne ikke hente turer");
      return;
    }

    setTours(Array.isArray(data.tours) ? data.tours : []);
  }

  async function loadMine() {
    setLoading(true);
    setError("");
    const data = await fetchJSON("/api/tours/mine", { method: "GET" });
    setLoading(false);

    if (!data.ok) {
      setError(data.error || "Kunne ikke hente dine turer");
      return;
    }

    setTours(Array.isArray(data.tours) ? data.tours : []);
  }

  React.useEffect(() => {
    // valgfritt: reset søk når tab byttes
    setQ("");
    if (tab === "mine") loadMine();
    else loadPublic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filteredTours = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return tours;

    return tours.filter((t) => {
      const start = (t.startLocation?.name || "").toLowerCase();
      const end = (t.endLocation?.name || "").toLowerCase();
      const title = (t.title || "").toLowerCase();
      const desc = (t.shortDescription || "").toLowerCase();
      return start.includes(query) || end.includes(query) || title.includes(query) || desc.includes(query);
    });
  }, [tours, q]);

  async function bookTour(id) {
    setError("");
    const data = await fetchJSON(`/api/tours/${id}/book`, { method: "POST" });
    if (!data.ok) {
      setError(data.error || "Kunne ikke booke turen");
      return;
    }

    const updated = data.tour;
    setTours((ts) => ts.map((t) => (t._id === updated._id ? updated : t)));
  }

  function openTour(id) {
    navigate(`/trips/${id}`);
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Turer</h1>
          <p className="text-sm text-gray-600">Klikk på en tur for å se mer detaljer.</p>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 py-1 border rounded ${tab === "public" ? "bg-gray-100" : ""}`}
            onClick={() => setTab("public")}
          >
            Publisert
          </button>

          <button
            className={`px-3 py-1 border rounded ${tab === "mine" ? "bg-gray-100" : ""}`}
            onClick={() => setTab("mine")}
            disabled={!canManage}
            title={!canManage ? "Krever TOUR_LEADER eller ADMIN" : ""}
          >
            Mine turer
          </button>
        </div>
      </header>

      {/* SØK (samme idé som Home, men med filtrering i listen) */}
      <form onSubmit={(e) => e.preventDefault()} className="w-full" aria-label="Søk turer">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-600" htmlFor="trip-search">
                Søk etter by (start/slutt) eller tittel
              </label>
              <input
                id="trip-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="F.eks. Oslo, Bergen, Gaustatoppen…"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="text-sm text-gray-600">
              Viser <b>{filteredTours.length}</b> av <b>{tours.length}</b>
            </div>

            {q ? (
              <button className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50" onClick={() => setQ("")}>
                Tøm
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border bg-white p-4">
          <div className="font-medium text-red-700">Feil</div>
          <div className="text-sm text-gray-700 mt-1">{error}</div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">Laster turer…</div>
      ) : filteredTours.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
          {tours.length === 0 ? (
            <>
              Ingen turer funnet.
              <div className="mt-2">
                Tips: Opprett en tur og sett <b>status</b> til <b>PUBLISHED</b> for at den skal vises under “Publisert”.
              </div>
              <div className="mt-2">
                Husk også å legge til route for detaljsiden: <b>/trips/:id</b>.
              </div>
            </>
          ) : (
            <>
              Ingen turer matcher søket <b>“{q}”</b>.
              <div className="mt-2">Prøv et annet stedsnavn eller trykk “Tøm”.</div>
            </>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTours.map((t) => {
            const spots =
              typeof t.availableSpots === "number"
                ? t.availableSpots
                : Math.max(0, (t.maxParticipants || 0) - (t.participantsCount || 0));

            // Home-stil: vi bygger src via resolveImageUrl(...)
            const coverSrc = getCoverUrl(t);
            const coverAlt = getCoverAlt(t);

            const gallery = getGallery(t);

            return (
              <article
                key={t._id}
                className="rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <button
                  type="button"
                  onClick={() => openTour(t._id)}
                  className="text-left w-full"
                  aria-label={`Åpne tur: ${t.title}`}
                >
                  {/* Cover (samme stil som Home: img med onError fallback) */}
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    <img
                      src={coverSrc || "/images/placeholder-trip.jpg"}
                      alt={coverAlt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder-trip.jpg";
                      }}
                    />

                    <div className="absolute top-3 left-3">
                      <span className={`text-xs px-2 py-1 border rounded-full bg-white/90 ${badge(t.status)}`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="text-xs px-2 py-1 border rounded-full bg-white/90">
                        {money(t.price)}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3">
                      <span className="text-xs px-2 py-1 border rounded-full bg-white/90">
                        <b>{spots}</b> ledige plasser
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h2 className="text-lg font-semibold leading-snug">{t.title}</h2>
                      {t.shortDescription ? (
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">{t.shortDescription}</p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">Ingen beskrivelse</p>
                      )}
                    </div>

                    <div className="text-sm text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-gray-500">Start</div>
                          <div className="font-medium">{t.startLocation?.name || "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Slutt</div>
                          <div className="font-medium">{t.endLocation?.name || "—"}</div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Tid</div>
                        <div>
                          {fmtDateTime(t.startDateTime)} – {fmtDateTime(t.endDateTime)}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 border rounded-full bg-gray-50">
                          Vanskelighet: {t.difficulty}
                        </span>
                        <span className="px-2 py-1 border rounded-full bg-gray-50">
                          Form: {t.fitnessLevel}
                        </span>
                        {t.ageLimit ? (
                          <span className="px-2 py-1 border rounded-full bg-gray-50">Alder: {t.ageLimit}+</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">Klikk for å se detaljside</div>
                  </div>
                </button>

                {/* Footer actions */}
                <div className="px-4 pb-4 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">{tab === "mine" ? "Dine turer" : "Synlig for kunder"}</div>

                  {tab === "public" ? (
                    <button
                      className="px-3 py-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        bookTour(t._id);
                      }}
                      disabled={t.status !== "PUBLISHED" || spots <= 0}
                      title={t.status !== "PUBLISHED" ? "Kun PUBLISHED kan bookes" : ""}
                    >
                      {spots <= 0 ? "Fullt" : "Book plass"}
                    </button>
                  ) : (
                    <Link
                      to={`/trips/${t._id}`}
                      className="px-3 py-1.5 border rounded-md hover:bg-gray-50 text-sm"
                    >
                      Se detaljer
                    </Link>
                  )}
                </div>

                {/* Gallery thumbnails */}
                {gallery.length > 0 ? (
                  <div className="px-4 pb-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {gallery.slice(0, 6).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url}
                          alt={img.alt || `${t.title || "Tur"} bilde ${idx + 1}`}
                          className="h-14 w-20 rounded-lg object-cover border"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
