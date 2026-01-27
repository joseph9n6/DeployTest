import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export default function TripRouteMap({ start, end }) {
  const sLat = Number(start?.lat);
  const sLng = Number(start?.lng);
  const eLat = Number(end?.lat);
  const eLng = Number(end?.lng);

  const startOk = Number.isFinite(sLat) && Number.isFinite(sLng);
  const endOk = Number.isFinite(eLat) && Number.isFinite(eLng);

  const points = [];
  if (startOk) points.push([sLat, sLng]);
  if (endOk) points.push([eLat, eLng]);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
        Denne turen mangler gyldige koordinater (lat/lng).
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="h-80 w-full">
        <MapContainer center={points[0]} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds points={points} />

          {startOk ? (
            <Marker position={[sLat, sLng]}>
              <Popup>Start: {start?.name || "Start"}</Popup>
            </Marker>
          ) : null}

          {endOk ? (
            <Marker position={[eLat, eLng]}>
              <Popup>Slutt: {end?.name || "Slutt"}</Popup>
            </Marker>
          ) : null}

          {startOk && endOk ? <Polyline positions={points} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}
