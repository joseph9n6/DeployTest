// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";

/**
 * API_BASE:
 * - bruk "" hvis du har Vite proxy for /api
 * - bruk "http://localhost:5000" hvis du ikke har proxy
 */
const API_BASE = "";

/**
 * BACKEND_BASE:
 * Må peke på backend for å laste opp-lastede bilder ("/uploads/..."),
 * ellers prøver browser å hente fra frontend (5173).
 */
const BACKEND_BASE = "http://localhost:5000";

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function resolveImageUrl(u) {
  if (!u) return "";
  if (u.startsWith("/uploads/")) return `${BACKEND_BASE}${u}`;
  if (/^https?:\/\//i.test(u)) return u;
  return u;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("no-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPrice(item) {
  const amount = Number(item?.priceAmount ?? 0);
  const currency = item?.currency || "NOK";
  if (!amount) return `0 ${currency}`;
  return `${amount} ${currency}`;
}

export default function Home() {
  const [q, setQ] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [featured, setFeatured] = React.useState({
    trip: null,
    cabin: null
  });

  React.useEffect(() => {
    (async () => {
      try {
        setError("");
        setLoading(true);
        const data = await fetchJSON("/api/public/home");
        setFeatured(data?.featured || { trip: null, cabin: null });
      } catch (e) {
        setError(e.message || "Kunne ikke hente innhold");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* HERO + SEARCH */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6">
        {/* HERO */}
        <div
          className="
            relative overflow-hidden rounded-2xl
            h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[75vh]
            mb-6
          "
        >
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/videos/Norwegian Nature Walk.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/natur.jpg"
          />

          <div className="relative z-10 h-full w-full grid place-items-center bg-black/35">
            <div className="text-center px-4 max-w-3xl">
              <h1
                className="
                  text-white font-bold drop-shadow
                  text-2xl sm:text-3xl md:text-5xl lg:text-6xl
                "
              >
                Utforsk norsk natur
              </h1>
              <p className="text-white/90 mt-2 text-sm sm:text-base md:text-lg">
                Finn turer, hytter og inspirasjon – på ett sted.
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="w-full flex justify-center"
          aria-label="Søkeskjema"
        >
          <label className="sr-only" htmlFor="route-search">
            Søk etter...
          </label>

          <div
            className="
              w-full max-w-2xl
              flex flex-col sm:flex-row items-stretch sm:items-center
              gap-3
            "
          >
            <input
              id="route-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søk etter tur, sted eller hytte…"
              className="
                w-full px-5 py-3 rounded-full border shadow bg-white
                text-base sm:text-lg md:text-xl
                focus:outline-none focus:ring-4 focus:ring-green-300
              "
              aria-label="Søk etter..."
            />

            <button
              className="
                px-6 py-3 rounded-full bg-green-600 text-white font-semibold
                text-base sm:text-lg
                hover:bg-green-700
                focus:outline-none focus:ring-4 focus:ring-green-300
              "
              aria-label="Søk"
              type="submit"
            >
              Søk
            </button>
          </div>
        </form>

        {/* FEATURED */}
        <div className="mt-10 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">Nytt og tilgjengelig</h2>
                <p className="text-sm text-gray-600">
                  Viser siste tur og hytte som er publisert av turleder/hytteeier.
                </p>
              </div>

              <div className="hidden sm:flex gap-3">
                <Link to="/trips" className="text-sm underline underline-offset-4">
                  Se alle turer
                </Link>
                <Link to="/cabin" className="text-sm underline underline-offset-4">
                  Se alle hytter
                </Link>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border p-3 text-sm text-red-600 bg-red-50">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeaturedCard
                type="trip"
                title="Turer"
                item={featured.trip}
                loading={loading}
                fallbackImg="/images/placeholder-trip.jpg"
                // Viktig: når vi har en tur -> gå til detaljsiden for den turen
                to={featured.trip?._id ? `/trips/${featured.trip._id}` : "/trips"}
                listTo="/trips"
              />

              <FeaturedCard
                type="cabin"
                title="Hytter"
                item={featured.cabin}
                loading={loading}
                fallbackImg="/images/placeholder-cabin.jpg"
                // Viktig: når vi har en hytte -> gå til detaljsiden for den hytta
                to={featured.cabin?._id ? `/cabin/${featured.cabin._id}` : "/cabin"}
                listTo="/cabin"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER full width */}
      <footer className="bg-green-950 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="grid gap-12 grid-cols-1 md:grid-cols-3">
            <div>
              <h2 className="font-semibold leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                Finn din tur blant tusenvis av turforslag og hytter i hele Norge
              </h2>

              <p className="mt-4 text-white/75 text-sm sm:text-base max-w-xl">
                UTopia.no (demo) er en studentløsning der hytteeiere og turledere kan publisere innhold,
                og brukere kan oppdage nye turer og overnattingssteder.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white/80 uppercase">Innhold</h3>
              <ul className="mt-5 space-y-3 text-lg">
                <li>
                  <Link className="hover:underline" to="/">
                    → Utforsk
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" to="/trips">
                    → Turer
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" to="/cabin">
                    → Hytter
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" to="/ads">
                    → Annonser
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" to="/profil">
                    → Min profil
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" to="/admin">
                    → Admin
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white/80 uppercase">Om</h3>
              <ul className="mt-5 space-y-3 text-lg">
                <li>
                  <a className="hover:underline" href="#">
                    → Om prosjektet
                  </a>
                </li>
                <li>
                  <a className="hover:underline" href="#">
                    → Kontakt oss
                  </a>
                </li>
                <li>
                  <a className="hover:underline" href="#">
                    → Personvern
                  </a>
                </li>
                <li>
                  <a className="hover:underline" href="#">
                    → Informasjonskapsler
                  </a>
                </li>
                <li>
                  <a className="hover:underline" href="#">
                    → Hjelp
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-sm text-white/70">
            <div>© {new Date().getFullYear()} UTopia.no – Demo (APP2000). Ikke en ekte tjeneste.</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <a className="hover:text-white" href="#">
                Vilkår
              </a>
              <a className="hover:text-white" href="#">
                Personvern
              </a>
              <a className="hover:text-white" href="#">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeaturedCard({ type, title, item, loading, fallbackImg, to, listTo }) {
  const img = resolveImageUrl(item?.imageUrl) || fallbackImg;
  const headline = item?.title || (loading ? "Laster..." : `Ingen ${title.toLowerCase()} publisert ennå`);

  const sub = item?._id
    ? "Nyeste publisering"
    : loading
      ? "Henter innhold"
      : "Publiser en ny for å få den vist her";

  const details =
    item?._id && type === "trip"
      ? {
          shortDescription: item.shortDescription || "",
          startName: item.startName || "",
          endName: item.endName || "",
          startDateTime: formatDateTime(item.startDateTime),
          price: formatPrice(item),
          difficulty: item.difficulty || "",
          fitnessLevel: item.fitnessLevel || ""
        }
      : null;

  const primaryLabel = item?._id ? "Åpne detaljside" : `Gå til ${title.toLowerCase()}`;

  return (
    <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
      {/* Klikkbart bilde -> går til detaljside for item hvis finnes, ellers liste */}
      <Link to={to} aria-label={primaryLabel} className="block">
        <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
          <img
            src={img}
            alt={headline}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = fallbackImg;
            }}
          />
        </div>
      </Link>

      <div className="p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>

        {/* Klikkbar tittel -> går til riktig detaljside */}
        <Link to={to} className="mt-1 block text-lg font-semibold hover:underline">
          {headline}
        </Link>

        {item?._id ? (
          <div className="mt-2 space-y-1">
            {details?.shortDescription ? (
              <div className="text-sm text-gray-700">{details.shortDescription}</div>
            ) : (
              <div className="text-sm text-gray-600">{sub}</div>
            )}

            {details?.startName || details?.endName ? (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Start:</span> {details.startName || "—"}{" "}
                <span className="mx-2">•</span>
                <span className="font-medium">Slutt:</span> {details.endName || "—"}
              </div>
            ) : null}

            {details?.startDateTime ? (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Dato:</span> {details.startDateTime}
              </div>
            ) : null}

            {type === "trip" ? (
              <div className="text-xs text-gray-600 flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center rounded-full border px-2 py-1">
                  {details?.difficulty || "—"} • {details?.fitnessLevel || "—"}
                </span>
                <span className="inline-flex items-center rounded-full border px-2 py-1">
                  Pris: {details?.price || "0 NOK"}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-600">{sub}</div>
        )}

        {/* Buttons */}
        <div className="mt-4 flex gap-3">
          {/* Denne går til TripDetails når item finnes */}
          <Link to={to} className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm hover:bg-green-800">
            {primaryLabel}
          </Link>

          {/* Denne går alltid til liste */}
          <Link to={listTo} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">
            Se alle
          </Link>
        </div>
      </div>
    </div>
  );
}
