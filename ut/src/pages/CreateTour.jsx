// src/pages/CreateTour.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Leaflet / React-Leaflet (klikk-for-start/slutt)
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Leaflet marker icons (Vite-fix)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/**
 * Viktig: Du må ha dette én gang i appen (f.eks. i src/main.jsx):
 * import "leaflet/dist/leaflet.css";
 */

const API = "";
const DEFAULT_CENTER = [59.9127, 10.7461]; // Oslo
const DEFAULT_ZOOM = 10;

// Fix for Leaflet marker icons in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function toIsoOrNull(dtLocal) {
  // dtLocal from <input type="datetime-local"> e.g. "2026-02-14T14:00"
  if (!dtLocal || typeof dtLocal !== "string") return null;
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-2">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none " +
        "focus:border-green-700 focus:ring-2 focus:ring-green-700/20 " +
        (props.className || "")
      }
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none " +
        "focus:border-green-700 focus:ring-2 focus:ring-green-700/20 " +
        (props.className || "")
      }
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none " +
        "focus:border-green-700 focus:ring-2 focus:ring-green-700/20 " +
        (props.className || "")
      }
    />
  );
}

/** Klikk-handler for kartet */
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      onPick({ lat, lng });
    }
  });
  return null;
}

/** Start/Slutt-velger kart */
function StartEndPickerMap({ start, end, onChangeStart, onChangeEnd }) {
  function handlePick(point) {
    // 1. klikk: start
    if (!start) {
      onChangeStart(point);
      return;
    }
    // 2. klikk: end
    if (!end) {
      onChangeEnd(point);
      return;
    }
    // 3. klikk: reset (start på nytt)
    onChangeStart(point);
    onChangeEnd(null);
  }

  const positions = [];
  if (start) positions.push([start.lat, start.lng]);
  if (end) positions.push([end.lat, end.lng]);

  const center = start ? [start.lat, start.lng] : DEFAULT_CENTER;

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="h-96 w-full">
        <MapContainer center={center} zoom={DEFAULT_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onPick={handlePick} />

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

      <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-700">
        <div className="font-medium">Slik velger du:</div>
        <ul className="list-disc pl-5 mt-1 text-xs text-gray-600 space-y-1">
          <li>Klikk én gang for startpunkt.</li>
          <li>Klikk én gang for sluttpunkt.</li>
          <li>Klikk en tredje gang for å starte på nytt.</li>
        </ul>
      </div>
    </div>
  );
}

export default function CreateTour() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    fullDescription: "",

    startName: "",
    startLat: "",
    startLng: "",
    endName: "",
    endLat: "",
    endLng: "",

    startDateTime: "",
    endDateTime: "",

    maxParticipants: 10,
    priceAmount: 0,

    difficulty: "MODERATE",
    fitnessLevel: "MEDIUM",

    coverFile: null,
    galleryFiles: [] // ✅ NY: flere bilder
  });

  // Kart-punkter (source of truth for lat/lng)
  const [startPoint, setStartPoint] = useState(null); // {lat, lng}
  const [endPoint, setEndPoint] = useState(null); // {lat, lng}

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Preview URL for selected cover file
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  // Preview URLs for gallery files
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState([]);

  useEffect(() => {
    if (!form.coverFile) {
      setCoverPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(form.coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.coverFile]);

  useEffect(() => {
    // revoke old
    galleryPreviewUrls.forEach((u) => URL.revokeObjectURL(u));

    const urls = (form.galleryFiles || []).map((f) => URL.createObjectURL(f));
    setGalleryPreviewUrls(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.galleryFiles]);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // Når brukeren klikker på kart: synk lat/lng felter
  useEffect(() => {
    if (!startPoint) return;
    setForm((p) => ({
      ...p,
      startLat: String(startPoint.lat),
      startLng: String(startPoint.lng)
    }));
  }, [startPoint]);

  useEffect(() => {
    if (!endPoint) return;
    setForm((p) => ({
      ...p,
      endLat: String(endPoint.lat),
      endLng: String(endPoint.lng)
    }));
  }, [endPoint]);

  const validation = useMemo(() => {
    const errors = [];

    if (!form.title.trim()) errors.push("Tittel er påkrevd.");
    if (!form.startName.trim()) errors.push("Start stednavn er påkrevd.");
    if (!form.endName.trim()) errors.push("Slutt stednavn er påkrevd.");

    const startLat = Number(form.startLat);
    const startLng = Number(form.startLng);
    const endLat = Number(form.endLat);
    const endLng = Number(form.endLng);

    if (Number.isNaN(startLat)) errors.push("Start lat må være et tall.");
    if (Number.isNaN(startLng)) errors.push("Start lng må være et tall.");
    if (Number.isNaN(endLat)) errors.push("Slutt lat må være et tall.");
    if (Number.isNaN(endLng)) errors.push("Slutt lng må være et tall.");

    if (!Number.isFinite(startLat) || !Number.isFinite(startLng)) errors.push("Velg startpunkt på kartet.");
    if (!Number.isFinite(endLat) || !Number.isFinite(endLng)) errors.push("Velg sluttpunkt på kartet.");

    const startISO = toIsoOrNull(form.startDateTime);
    const endISO = toIsoOrNull(form.endDateTime);

    if (!startISO) errors.push("Start dato/tid er påkrevd.");
    if (!endISO) errors.push("Slutt dato/tid er påkrevd.");
    if (startISO && endISO && new Date(endISO) <= new Date(startISO)) {
      errors.push("Slutt dato/tid må være etter start.");
    }

    const maxP = Number(form.maxParticipants);
    if (!maxP || Number.isNaN(maxP) || maxP < 1) errors.push("Maks deltakere må være minst 1.");

    const price = Number(form.priceAmount);
    if (Number.isNaN(price) || price < 0) errors.push("Pris kan ikke være negativ.");

    return { ok: errors.length === 0, errors };
  }, [form]);

  function resetPoints() {
    setStartPoint(null);
    setEndPoint(null);
    setField("startLat", "");
    setField("startLng", "");
    setField("endLat", "");
    setField("endLng", "");
  }

  function removeGalleryAt(index) {
    setForm((p) => {
      const next = Array.isArray(p.galleryFiles) ? [...p.galleryFiles] : [];
      next.splice(index, 1);
      return { ...p, galleryFiles: next };
    });
  }

  async function submit(status) {
    setMsg("");
    setErr("");

    if (!validation.ok) {
      setErr(validation.errors[0]);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();

      fd.append("title", form.title.trim());
      fd.append("shortDescription", form.shortDescription.trim());
      fd.append("fullDescription", form.fullDescription.trim());

      fd.append("startName", form.startName.trim());
      fd.append("startLat", String(Number(form.startLat)));
      fd.append("startLng", String(Number(form.startLng)));

      fd.append("endName", form.endName.trim());
      fd.append("endLat", String(Number(form.endLat)));
      fd.append("endLng", String(Number(form.endLng)));

      fd.append("startDateTime", toIsoOrNull(form.startDateTime) || "");
      fd.append("endDateTime", toIsoOrNull(form.endDateTime) || "");

      fd.append("maxParticipants", String(Number(form.maxParticipants)));
      fd.append("priceAmount", String(Number(form.priceAmount)));
      fd.append("currency", "NOK");

      fd.append("difficulty", form.difficulty);
      fd.append("fitnessLevel", form.fitnessLevel);

      fd.append("status", status);

      // ✅ Cover (1)
      if (form.coverFile) {
        // Backend must accept: upload.single("coverImage") OR upload.fields([...])
        fd.append("coverImage", form.coverFile);
      }

      // ✅ Gallery (mange)
      for (const f of form.galleryFiles || []) {
        // Backend must accept: upload.array("galleryImages") OR upload.fields([...])
        fd.append("galleryImages", f);
      }

      const res = await fetch(API + "/api/tours", {
        method: "POST",
        credentials: "include",
        body: fd
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Kunne ikke opprette tur");
      if (data && data.ok === false) throw new Error(data.error || "Kunne ikke opprette tur");

      setMsg(status === "PUBLISHED" ? "Turen er publisert!" : "Utkast lagret!");
      // navigate("/trips");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Opprett tur</h1>
          <p className="text-sm text-gray-600">
            Lag en attraktiv turannonse med tydelig info. Du kan lagre som utkast og publisere senere.
          </p>
        </div>

        <button onClick={() => navigate("/trips")} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
          Tilbake til turer
        </button>
      </div>

      {/* Alerts */}
      {err ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div> : null}
      {msg ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">{msg}</div>
      ) : null}

      {/* Layout: Form + Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Basic */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Grunninfo</h2>
            <p className="text-sm text-gray-600 mb-4">Dette er teksten som kundene ser først. Hold det konkret.</p>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Tittel" hint="Maks 120 tegn">
                <Input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="F.eks. Solnedgangstur til Gaustatoppen"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Kort beskrivelse" hint="Vises i kort/listing">
                  <Textarea
                    rows={3}
                    value={form.shortDescription}
                    onChange={(e) => setField("shortDescription", e.target.value)}
                    placeholder="F.eks. Sosial kveldstur med guide og utsikt i verdensklasse."
                  />
                </Field>

                <Field label="Full beskrivelse" hint="Detaljer, tempo, hva som skjer">
                  <Textarea
                    rows={3}
                    value={form.fullDescription}
                    onChange={(e) => setField("fullDescription", e.target.value)}
                    placeholder="Beskriv ruten, pauser, nivå, og hva man opplever."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Vanskelighetsgrad">
                  <Select value={form.difficulty} onChange={(e) => setField("difficulty", e.target.value)}>
                    <option value="EASY">EASY</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="HARD">HARD</option>
                  </Select>
                </Field>

                <Field label="Formnivå">
                  <Select value={form.fitnessLevel} onChange={(e) => setField("fitnessLevel", e.target.value)}>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          {/* Card: Location + Map click */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Start og slutt</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Klikk på kartet for å velge start (1. klikk) og slutt (2. klikk). Tredje klikk starter på nytt.
                </p>
              </div>

              <button type="button" onClick={resetPoints} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Nullstill punkter
              </button>
            </div>

            <div className="mt-4">
              <StartEndPickerMap start={startPoint} end={endPoint} onChangeStart={setStartPoint} onChangeEnd={setEndPoint} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold">Start</h3>
                <Field label="Stednavn" hint="Skriv f.eks. Oslo S / Sognsvann">
                  <Input value={form.startName} onChange={(e) => setField("startName", e.target.value)} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lat" hint="Settes automatisk fra kart">
                    <Input value={form.startLat} onChange={(e) => setField("startLat", e.target.value)} placeholder="Klikk på kartet" />
                  </Field>
                  <Field label="Lng" hint="Settes automatisk fra kart">
                    <Input value={form.startLng} onChange={(e) => setField("startLng", e.target.value)} placeholder="Klikk på kartet" />
                  </Field>
                </div>

                {startPoint ? (
                  <div className="text-xs text-gray-600">
                    Valgt start: {startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Ingen start valgt enda.</div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Slutt</h3>
                <Field label="Stednavn" hint="Skriv f.eks. Gaustatoppen">
                  <Input value={form.endName} onChange={(e) => setField("endName", e.target.value)} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lat" hint="Settes automatisk fra kart">
                    <Input value={form.endLat} onChange={(e) => setField("endLat", e.target.value)} placeholder="Klikk på kartet" />
                  </Field>
                  <Field label="Lng" hint="Settes automatisk fra kart">
                    <Input value={form.endLng} onChange={(e) => setField("endLng", e.target.value)} placeholder="Klikk på kartet" />
                  </Field>
                </div>

                {endPoint ? (
                  <div className="text-xs text-gray-600">
                    Valgt slutt: {endPoint.lat.toFixed(5)}, {endPoint.lng.toFixed(5)}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Ingen slutt valgt enda.</div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Time & Capacity */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Tid, kapasitet og pris</h2>
            <p className="text-sm text-gray-600 mb-4">Dette påvirker tilgjengelige plasser og booking.</p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Start dato/tid">
                <Input type="datetime-local" value={form.startDateTime} onChange={(e) => setField("startDateTime", e.target.value)} />
              </Field>

              <Field label="Slutt dato/tid">
                <Input type="datetime-local" value={form.endDateTime} onChange={(e) => setField("endDateTime", e.target.value)} />
              </Field>

              <Field label="Maks deltakere" hint="Minst 1">
                <Input type="number" min="1" value={form.maxParticipants} onChange={(e) => setField("maxParticipants", e.target.value)} />
              </Field>

              <Field label="Pris (NOK)" hint="0 = gratis">
                <Input type="number" min="0" value={form.priceAmount} onChange={(e) => setField("priceAmount", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Card: Image upload */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Bilder</h2>
            <p className="text-sm text-gray-600 mb-4">
              Last opp cover (1 stk) og galleri (flere). Cover brukes i listing – galleri vises på detaljsiden.
            </p>

            {/* Cover */}
            <div className="space-y-3">
              <Field label="Cover-bilde" hint="1 bilde">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setField("coverFile", e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700"
                />
              </Field>

              {form.coverFile ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-gray-50 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{form.coverFile.name}</div>
                    <div className="text-xs text-gray-600">
                      {(form.coverFile.size / 1024 / 1024).toFixed(2)} MB • {form.coverFile.type || "image"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setField("coverFile", null)}
                    className="rounded-lg border px-3 py-2 text-xs hover:bg-white"
                  >
                    Fjern
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-500">Ingen cover valgt.</div>
              )}

              {coverPreviewUrl ? (
                <div>
                  <div className="text-sm font-medium mb-2">Cover forhåndsvisning</div>
                  <img src={coverPreviewUrl} alt="Cover preview" className="h-48 w-full rounded-xl object-cover border" />
                </div>
              ) : null}

              {/* Gallery */}
              <div className="pt-4 border-t">
                <Field label="Galleri-bilder" hint="Velg flere (multiple)">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setField("galleryFiles", Array.from(e.target.files || []))}
                    className="block w-full text-sm text-gray-700"
                  />
                </Field>

                {form.galleryFiles?.length ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium">Galleri ({form.galleryFiles.length})</div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {galleryPreviewUrls.map((url, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border bg-gray-50">
                          <img src={url} alt={`Galleri ${idx + 1}`} className="h-28 w-full object-cover block" />
                          <button
                            type="button"
                            onClick={() => removeGalleryAt(idx)}
                            className="absolute top-2 right-2 bg-white/90 border rounded-md px-2 py-1 text-xs hover:bg-white"
                            title="Fjern bilde"
                          >
                            Fjern
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-2">Ingen galleri-bilder valgt.</div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Backend må støtte flere filer: <b>galleryImages</b> (array) + <b>coverImage</b> (single).
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              disabled={saving}
              onClick={() => submit("DRAFT")}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {saving ? "Lagrer..." : "Lagre utkast"}
            </button>

            <button
              disabled={saving}
              onClick={() => submit("PUBLISHED")}
              className="rounded-xl bg-green-900 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? "Publiserer..." : "Publiser"}
            </button>
          </div>

          {!validation.ok ? (
            <div className="text-xs text-gray-500">
              Tips: Fyll ut tittel, start/slutt (via kart), stednavn og start/slutt dato/tid før du publiserer.
            </div>
          ) : null}
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold">Forhåndsvisning</div>
            <p className="text-xs text-gray-500 mb-3">Slik kan turen se ut i listing for kunder.</p>

            <div className="rounded-xl border overflow-hidden">
              <div className="h-36 bg-gray-100">
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Legg til cover-bilde</div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div className="font-semibold leading-snug">{form.title.trim() || "Tittel på tur"}</div>

                <div className="text-sm text-gray-700">{form.shortDescription.trim() || "Kort beskrivelse vises her."}</div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Start:</span> {form.startName.trim() || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Slutt:</span> {form.endName.trim() || "—"}
                  </div>
                  <div className="flex justify-between">
                    <span>
                      <span className="font-medium">Plasser:</span> {Number(form.maxParticipants) || 0}
                    </span>
                    <span>
                      <span className="font-medium">Pris:</span> {Number(form.priceAmount) || 0} NOK
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
                    {form.difficulty} • {form.fitnessLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Kart: start/slutt velges med klikk, og lat/lng sendes til backend automatisk.
              <br />
              Galleri: flere bilder sendes som <b>galleryImages</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
