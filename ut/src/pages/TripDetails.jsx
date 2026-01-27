// src/pages/TripDetails.jsx
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Leaflet / React-Leaflet
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

// Leaflet marker icons (Vite-fix)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/**
 * API_BASE:
 * - bruk "" hvis du har Vite proxy for /api
 * - bruk "http://localhost:5000" hvis du ikke har proxy
 */
const API_BASE = "";

/**
 * BACKEND_BASE:
 * Samme som i Home.jsx – trengs for å laste opplastede bilder ("/uploads/...").
 */
const BACKEND_BASE = "http://localhost:5000";

// Fix for Leaflet marker icons in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data.error || data.message || "Request failed",
      stack: data.stack,
      path: data.path
    };
  }
  return data;
}

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
      month: "long",
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

function getCoverUrl(tour) {
  if (!tour) return "";

  if (tour.imageUrl) return resolveImageUrl(String(tour.imageUrl));

  if (typeof tour.coverImage === "string") return resolveImageUrl(tour.coverImage);
  if (tour.coverImage && typeof tour.coverImage === "object" && tour.coverImage.url) {
    return resolveImageUrl(String(tour.coverImage.url));
  }

  if (Array.isArray(tour.images) && tour.images.length > 0) {
    const first = tour.images[0];
    if (typeof first === "string") return resolveImageUrl(first);
    if (first?.url) return resolveImageUrl(String(first.url));
  }

  return "";
}

function getCoverAlt(tour) {
  if (!tour) return "Tur";
  if (tour.coverImage && typeof tour.coverImage === "object" && tour.coverImage.alt) return String(tour.coverImage.alt);
  return tour.title || "Tur";
}

function getGallery(tour) {
  const arr = Array.isArray(tour?.galleryImages) ? tour.galleryImages : [];
  return arr
    .map((img) => {
      if (typeof img === "string") return { url: resolveImageUrl(img), alt: tour?.title || "Tur" };
      return {
        url: resolveImageUrl(img?.url ? String(img.url) : ""),
        alt: img?.alt ? String(img.alt) : tour?.title || "Tur"
      };
    })
    .filter((x) => x.url);
}

function ImgWithFallback({ src, alt, fallback, className }) {
  const [current, setCurrent] = React.useState(src || fallback);

  React.useEffect(() => {
    setCurrent(src || fallback);
  }, [src, fallback]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setCurrent(fallback)}
    />
  );
}

function FitBounds({ points }) {
  const map = useMap();

  React.useEffect(() => {
    if (!points || points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

function isFiniteNum(n) {
  return Number.isFinite(n);
}

function TripRouteMap({ tour }) {
  const sLat = Number(tour?.startLocation?.lat);
  const sLng = Number(tour?.startLocation?.lng);
  const eLat = Number(tour?.endLocation?.lat);
  const eLng = Number(tour?.endLocation?.lng);

  const startOk = isFiniteNum(sLat) && isFiniteNum(sLng);
  const endOk = isFiniteNum(eLat) && isFiniteNum(eLng);

  const points = [];
  if (startOk) points.push([sLat, sLng]);
  if (endOk) points.push([eLat, eLng]);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-semibold">Kart</div>
        <div className="text-sm text-gray-600 mt-1">
          Denne turen mangler gyldige koordinater (lat/lng). Legg inn start/slutt-koordinater når du oppretter turen.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 pt-4">
        <div className="font-semibold">Kart</div>
        <div className="text-sm text-gray-600 mt-1">
          Start: {tour?.startLocation?.name || "—"} • Slutt: {tour?.endLocation?.name || "—"}
        </div>
      </div>

      <div className="h-80 w-full mt-3">
        <MapContainer center={points[0]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds points={points} />

          {startOk ? (
            <Marker position={[sLat, sLng]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Start</div>
                  <div>{tour?.startLocation?.name || "Startpunkt"}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    ({sLat}, {sLng})
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null}

          {endOk ? (
            <Marker position={[eLat, eLng]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Slutt</div>
                  <div>{tour?.endLocation?.name || "Sluttpunkt"}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    ({eLat}, {eLng})
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null}

          {startOk && endOk ? <Polyline positions={points} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}

export default function TripDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [tour, setTour] = React.useState(null);

  const [activeImg, setActiveImg] = React.useState("");
  const [booking, setBooking] = React.useState(false);

  // Nytt: status for om innlogget bruker er booket
  const [myBookingLoading, setMyBookingLoading] = React.useState(false);
  const [isBookedByMe, setIsBookedByMe] = React.useState(false);
  const [myBookingId, setMyBookingId] = React.useState(null);

  async function loadTour() {
    setLoading(true);
    setError("");

    const data = await apiFetch(`/api/tours/${id}`, { method: "GET" });
    setLoading(false);

    if (!data.ok) {
      setError(data.error || "Kunne ikke hente turen");
      return;
    }

    const t = data.tour || null;
    setTour(t);

    const cover = getCoverUrl(t);
    const gallery = getGallery(t);
    setActiveImg(cover || gallery[0]?.url || "");

    // Etter vi har tur: hent my-booking hvis innlogget
    if (user) {
      await loadMyBooking();
    } else {
      setIsBookedByMe(false);
      setMyBookingId(null);
    }
  }

  async function loadMyBooking() {
    if (!user) return;
    setMyBookingLoading(true);

    const data = await apiFetch(`/api/tours/${id}/my-booking`, { method: "GET" });
    setMyBookingLoading(false);

    if (!data.ok) {
      // Ikke ødelegg hele siden, bare reset
      setIsBookedByMe(false);
      setMyBookingId(null);
      return;
    }

    setIsBookedByMe(!!data.booked);
    setMyBookingId(data.bookingId || null);
  }

  React.useEffect(() => {
    if (!id) return;
    loadTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Hvis login-status endrer seg mens du står på siden
  React.useEffect(() => {
    if (!id) return;
    if (user) loadMyBooking();
    else {
      setIsBookedByMe(false);
      setMyBookingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function book() {
    setError("");

    if (!user) {
      nav("/login", { replace: true });
      return;
    }

    // Frontend-guard (backend håndhever uansett)
    if (isBookedByMe) {
      setError("Du har allerede booket denne turen. Du kan avbooke om du ønsker.");
      return;
    }

    setBooking(true);
    const data = await apiFetch(`/api/tours/${id}/book`, { method: "POST" });
    setBooking(false);

    if (!data.ok) {
      setError(data.error || "Kunne ikke booke turen");
      // Hvis backend sier “allerede booket”, refresh status
      await loadMyBooking();
      return;
    }

    const updated = data.tour;
    setTour(updated);

    const cover = getCoverUrl(updated);
    const gallery = getGallery(updated);
    setActiveImg((prev) => prev || cover || gallery[0]?.url || "");

    // Oppdater bookingstatus
    await loadMyBooking();
  }

  async function unbook() {
    setError("");

    if (!user) {
      nav("/login", { replace: true });
      return;
    }

    if (!isBookedByMe) {
      setError("Du er ikke booket på denne turen.");
      return;
    }

    const confirm = window.confirm("Vil du avbooke plassen din på denne turen?");
    if (!confirm) return;

    setBooking(true);
    const data = await apiFetch(`/api/tours/${id}/book`, { method: "DELETE" });
    setBooking(false);

    if (!data.ok) {
      setError(data.error || "Kunne ikke avbooke");
      await loadMyBooking();
      return;
    }

    const updated = data.tour;
    setTour(updated);

    // Oppdater bookingstatus
    await loadMyBooking();
  }

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">Laster tur…</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-medium text-red-700">Feil</div>
          <div className="text-sm text-gray-700 mt-1">{error}</div>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1.5 border rounded" onClick={loadTour}>
              Prøv igjen
            </button>
            <Link className="px-3 py-1.5 border rounded" to="/trips">
              Tilbake til turer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <div className="font-medium">Fant ikke turen</div>
        <Link className="text-sm underline" to="/trips">
          Tilbake
        </Link>
      </div>
    );
  }

  const cover = getCoverUrl(tour);
  const gallery = getGallery(tour);
  const status = tour.status || "DRAFT";

  const spots =
    typeof tour.availableSpots === "number"
      ? tour.availableSpots
      : Math.max(0, (tour.maxParticipants || 0) - (tour.participantsCount || 0));

  const canBookBase = status === "PUBLISHED" && spots > 0;

  // Endelig logikk:
  // - Hvis booket: du kan avbooke (uansett spots, fordi du allerede har plass)
  // - Hvis ikke booket: du kan booke bare hvis PUBLISHED og spots>0
  const canBook = !!user && canBookBase && !isBookedByMe;
  const canUnbook = !!user && isBookedByMe;

  return (
    <section className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Link to="/trips" className="text-sm text-gray-600 hover:underline">
            ← Tilbake til turer
          </Link>
          <h1 className="text-2xl font-semibold leading-snug">{tour.title}</h1>
          {tour.shortDescription ? (
            <p className="text-sm text-gray-700 max-w-2xl">{tour.shortDescription}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 border rounded-full ${badge(status)}`}>{status}</span>
          <span className="text-xs px-2 py-1 border rounded-full bg-white">{money(tour.price)}</span>
        </div>
      </div>

      {/* Media + booking card */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Images */}
        <div className="lg:col-span-2 rounded-2xl border bg-white overflow-hidden">
          <div className="h-72 bg-gray-100">
            {activeImg ? (
              <ImgWithFallback
                src={activeImg}
                alt={tour.title || "Tur"}
                fallback="/images/placeholder-trip.jpg"
                className="h-full w-full object-cover block"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">Ingen bilde</div>
            )}
          </div>

          {/* Thumbnails */}
          <div className="p-3 flex gap-2 overflow-x-auto">
            {cover ? (
              <button
                type="button"
                className={`h-16 w-24 rounded-lg border overflow-hidden ${activeImg === cover ? "ring-2 ring-green-700" : ""}`}
                onClick={() => setActiveImg(cover)}
                title="Cover"
              >
                <ImgWithFallback
                  src={cover}
                  alt={getCoverAlt(tour)}
                  fallback="/images/placeholder-trip.jpg"
                  className="h-full w-full object-cover block"
                />
              </button>
            ) : null}

            {gallery.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`h-16 w-24 rounded-lg border overflow-hidden ${activeImg === img.url ? "ring-2 ring-green-700" : ""}`}
                onClick={() => setActiveImg(img.url)}
                title={img.alt || `Bilde ${idx + 1}`}
              >
                <ImgWithFallback
                  src={img.url}
                  alt={img.alt || `Bilde ${idx + 1}`}
                  fallback="/images/placeholder-trip.jpg"
                  className="h-full w-full object-cover block"
                />
              </button>
            ))}

            {!cover && gallery.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">Legg til cover/galleri for mer attraktivt inntrykk.</div>
            ) : null}
          </div>
        </div>

        {/* Booking card */}
        <aside className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500">Dato og tid</div>
            <div className="font-medium">
              {fmtDateTime(tour.startDateTime)} – {fmtDateTime(tour.endDateTime)}
            </div>
          </div>

          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500">Sted</div>
            <div className="font-medium">
              {tour.startLocation?.name || "—"} → {tour.endLocation?.name || "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Start: ({tour.startLocation?.lat}, {tour.startLocation?.lng}) • Slutt: ({tour.endLocation?.lat},{" "}
              {tour.endLocation?.lng})
            </div>
          </div>

          <div className="text-sm text-gray-700 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Plasser</div>
              <div>
                <b>{spots}</b> ledig • {tour.participantsCount}/{tour.maxParticipants}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 border rounded-full bg-gray-50">Vanskelighet: {tour.difficulty}</span>
            <span className="px-2 py-1 border rounded-full bg-gray-50">Form: {tour.fitnessLevel}</span>
            {tour.ageLimit ? (
              <span className="px-2 py-1 border rounded-full bg-gray-50">Alder: {tour.ageLimit}+</span>
            ) : null}
          </div>

          {/* Booking status message */}
          {user ? (
            <div className="text-xs text-gray-600">
              {myBookingLoading ? "Sjekker bookingstatus…" : isBookedByMe ? "Du er påmeldt denne turen." : "Du er ikke påmeldt."}
              {myBookingId ? <span className="ml-2 text-gray-400">({String(myBookingId).slice(-6)})</span> : null}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Du må være innlogget for å booke.</div>
          )}

          {/* Buttons */}
          {!isBookedByMe ? (
            <button
              className="w-full px-3 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-60"
              onClick={book}
              disabled={!canBook || booking || myBookingLoading}
              title={!canBookBase ? "Turen må være PUBLISHED og ha ledige plasser" : ""}
            >
              {booking ? "Booker…" : !user ? "Logg inn for å booke" : canBookBase ? "Book nå" : spots <= 0 ? "Fullt" : "Ikke tilgjengelig"}
            </button>
          ) : (
            <button
              className="w-full px-3 py-2 border rounded-md hover:bg-red-50 disabled:opacity-60"
              onClick={unbook}
              disabled={!canUnbook || booking || myBookingLoading}
              title="Avbook din plass"
            >
              {booking ? "Avbooker…" : "Avbook"}
            </button>
          )}
        </aside>
      </div>

      {/* MAP */}
      <TripRouteMap tour={tour} />

      {/* Details */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Om turen</h2>
          {tour.fullDescription ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{tour.fullDescription}</p>
          ) : (
            <p className="text-sm text-gray-500">Ingen full beskrivelse lagt til enda.</p>
          )}

          {(Array.isArray(tour.includes) && tour.includes.length > 0) ||
          (Array.isArray(tour.notIncluded) && tour.notIncluded.length > 0) ? (
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div>
                <h3 className="text-sm font-semibold">Inkludert</h3>
                {Array.isArray(tour.includes) && tour.includes.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
                    {tour.includes.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">Ikke spesifisert.</div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold">Ikke inkludert</h3>
                {Array.isArray(tour.notIncluded) && tour.notIncluded.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
                    {tour.notIncluded.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">Ikke spesifisert.</div>
                )}
              </div>
            </div>
          ) : null}

          {Array.isArray(tour.equipmentRequired) && tour.equipmentRequired.length > 0 ? (
            <div className="pt-2">
              <h3 className="text-sm font-semibold">Utstyr som kreves</h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
                {tour.equipmentRequired.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-4 space-y-2">
          <h2 className="font-semibold">Praktisk info</h2>
          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500">Pris</div>
            <div className="font-medium">{money(tour.price)}</div>
          </div>

          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500">Varighet (estimert)</div>
            <div className="font-medium">{tour.estimatedDurationHours ? `${tour.estimatedDurationHours} timer` : "—"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
