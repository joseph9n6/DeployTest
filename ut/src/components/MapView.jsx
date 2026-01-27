import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for Leaflet marker icons in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapView() {
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setError("");
        const res = await fetch("http://localhost:5000/api/map");
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.ok === false) {
          const msg = data?.message || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (alive) setDocs(Array.isArray(data?.docs) ? data.docs : []);
      } catch (e) {
        if (alive) {
          setDocs([]);
          setError(e?.message || "Kunne ikke hente kartdata");
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // GeoJSON bruker [lng, lat]. Leaflet bruker [lat, lng]
  const toLatLng = ([lng, lat]) => [lat, lng];

  const cabins = useMemo(() => {
    return docs.filter(
      (d) =>
        d?.docType === "CABIN" &&
        d?.geometry?.type === "Point" &&
        Array.isArray(d?.geometry?.coordinates) &&
        d.geometry.coordinates.length === 2
    );
  }, [docs]);

  const tours = useMemo(() => {
    return docs.filter(
      (d) =>
        d?.docType === "TOUR" &&
        d?.geometry?.type === "LineString" &&
        Array.isArray(d?.geometry?.coordinates)
    );
  }, [docs]);

  // Kartets startposisjon: bruk første cabin hvis den finnes, ellers default Oslo
  const center = cabins.length
    ? toLatLng(cabins[0].geometry.coordinates)
    : [59.9127, 10.7461];

  return (
    <div className="w-full">
      {error ? (
        <div className="p-3 border rounded bg-red-50 text-red-700">
          <div className="font-semibold">Kart-feil</div>
          <div className="text-sm mt-1">{error}</div>
          <div className="text-xs mt-2 text-red-700/80">
            Sjekk at backend kjører på http://localhost:5000 og at /api/map svarer.
          </div>
        </div>
      ) : null}

      <div className="h-[70vh] w-full rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {cabins.map((c) => (
            <Marker key={c._id} position={toLatLng(c.geometry.coordinates)}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{c.properties?.name || "Uten navn"}</div>
                  {c.properties?.description ? (
                    <div className="mt-1">{c.properties.description}</div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}

          {tours
            .map((t) => {
              const coords = Array.isArray(t?.geometry?.coordinates) ? t.geometry.coordinates : [];
              const positions = coords
                .filter((p) => Array.isArray(p) && p.length === 2)
                .map(toLatLng);

              // Hvis vi ikke har minst 2 punkter, kan ikke polyline tegnes
              if (positions.length < 2) return null;

              return <Polyline key={t._id} positions={positions} />;
            })
            .filter(Boolean)}
        </MapContainer>
      </div>

      <div className="mt-3 text-sm text-gray-600">
        Viser {cabins.length} hytter og {tours.length} turer.
      </div>
    </div>
  );
}
