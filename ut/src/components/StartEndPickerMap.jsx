import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for Leaflet marker icons in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function ClickHandler({ start, end, onPick }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      onPick({ lat, lng });
    }
  });

  return null;
}

export default function StartEndPickerMap({
  start,
  end,
  onChangeStart,
  onChangeEnd,
  height = "h-80",
  defaultCenter = [59.9127, 10.7461], // Oslo
  defaultZoom = 10
}) {
  function handlePick(point) {
    // Første klikk setter start, andre klikk setter end,
    // tredje klikk: start på nytt (eller du kan velge annen logikk)
    if (!start) {
      onChangeStart(point);
      return;
    }
    if (!end) {
      onChangeEnd(point);
      return;
    }

    // Reset og sett start på nytt
    onChangeStart(point);
    onChangeEnd(null);
  }

  const positions = [];
  if (start) positions.push([start.lat, start.lng]);
  if (end) positions.push([end.lat, end.lng]);

  const center = start ? [start.lat, start.lng] : defaultCenter;

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${height}`}>
      <MapContainer center={center} zoom={defaultZoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler start={start} end={end} onPick={handlePick} />

        {start ? (
          <Marker position={[start.lat, start.lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Start</div>
                <div className="text-xs text-gray-700">
                  {start.lat.toFixed(5)}, {start.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {end ? (
          <Marker position={[end.lat, end.lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">Slutt</div>
                <div className="text-xs text-gray-700">
                  {end.lat.toFixed(5)}, {end.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {start && end ? <Polyline positions={positions} /> : null}
      </MapContainer>
    </div>
  );
}
