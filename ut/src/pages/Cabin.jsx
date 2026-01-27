import React from "react";
import { loadCabin, saveCabin } from "../data/CabinStore";
import MapView from "../components/MapView";

const emptyAvail = { from: "", to: "" };

const getEmptyForm = () => ({
  name: "",
  serviced: false,
  price: "mid",
  facilities: "",
  availability: [{ ...emptyAvail }],
});

export default function Cabin() {
  const [cabins, setCabins] = React.useState(() => loadCabin() || []);
  const [form, setForm] = React.useState(() => getEmptyForm());
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    saveCabin(cabins);
  }, [cabins]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setAvail(i, field, value) {
    setForm((prev) => {
      const availability = prev.availability.map((a, idx) =>
        idx === i ? { ...a, [field]: value } : a
      );
      return { ...prev, availability };
    });
  }

  function addAvail() {
    setForm((prev) => ({
      ...prev,
      availability: [...prev.availability, { ...emptyAvail }],
    }));
  }

  function removeAvail(i) {
    setForm((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, idx) => idx !== i),
    }));
  }

  function validate(v) {
    const e = {};
    if (!v.name.trim()) e.name = "Navn er påkrevd";
    v.availability.forEach((a, i) => {
      if (!a.from || !a.to) e[`avail_${i}`] = "Fra og til må fylles ut";
      if (a.from && a.to && a.from > a.to) e[`avail_${i}`] = "Fra-dato kan ikke være etter til-dato";
    });
    return e;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;

    const newCabin = {
      id: Date.now(),
      ...form,
      facilities: form.facilities.trim(),
    };

    setCabins((prev) => [newCabin, ...prev]);
    setForm(getEmptyForm());
  }

  function onRemoveLocal(id) {
    if (!confirm("Fjerne denne fra den lokale listen?")) return;
    setCabins((prev) => prev.filter((c) => c.id !== id));
  }

  function labelPrice(p) {
    if (p === "low") return "Lavt";
    if (p === "high") return "Høyt";
    return "Middels";
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Hytte-admin (demo)</h1>
        <p className="text-gray-600">
          Øverst vises kartdata fra backend. Under kan du registrere hytter lokalt (demo).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kart (hytter og turer)</h2>
        <MapView />
        <p className="text-sm text-gray-600">
          Tips: Kjør først{" "}
          <code className="px-1 py-0.5 bg-gray-100 rounded">/api/map/seed</code> i backend for å få test-data.
        </p>
      </section>

      <hr />

      <h2 className="text-xl font-semibold">Registrer ny hytte (lokalt demo)</h2>

      <form className="max-w-xl space-y-4 border rounded bg-white p-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="block text-sm font-medium" htmlFor="name">
            Navn
          </label>
          <input
            id="name"
            className={`mt-1 w-full border rounded px-2 py-1 ${errors.name ? "border-red-500" : ""}`}
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "err-name" : undefined}
            required
          />
          {errors.name && (
            <div id="err-name" className="text-sm text-red-600 mt-1">
              {errors.name}
            </div>
          )}
        </div>

        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.serviced} onChange={(e) => setField("serviced", e.target.checked)} />
            Betjent hytte
          </label>

          <label className="flex items-center gap-2">
            <span className="text-sm">Prisnivå</span>
            <select className="border rounded px-2 py-1" value={form.price} onChange={(e) => setField("price", e.target.value)}>
              <option value="low">Lavt</option>
              <option value="mid">Middels</option>
              <option value="high">Høyt</option>
            </select>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="facilities">
            Fasiliteter (komma-separert)
          </label>
          <input
            id="facilities"
            className="mt-1 w-full border rounded px-2 py-1"
            placeholder="dusj, strøm, kjøkken"
            value={form.facilities}
            onChange={(e) => setField("facilities", e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Eksempel: “dusj, strøm, hund tillatt”.</p>
        </div>

        <fieldset className="border rounded p-3">
          <legend className="text-sm font-medium px-1">Tilgjengelighet (dato-intervaller)</legend>

          <div className="space-y-2">
            {form.availability.map((a, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <label className="text-sm">
                  Fra
                  <input
                    type="date"
                    className="ml-2 border rounded px-2 py-1"
                    value={a.from}
                    onChange={(e) => setAvail(i, "from", e.target.value)}
                  />
                </label>

                <label className="text-sm">
                  Til
                  <input
                    type="date"
                    className="ml-2 border rounded px-2 py-1"
                    value={a.to}
                    onChange={(e) => setAvail(i, "to", e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                  onClick={() => removeAvail(i)}
                >
                  Fjern
                </button>

                {errors[`avail_${i}`] && <div className="text-sm text-red-600 basis-full">{errors[`avail_${i}`]}</div>}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={addAvail}
          >
            + Legg til periode
          </button>
        </fieldset>

        <button
          type="submit"
          className="px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          Lagre hytte (lokalt)
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Registrerte hytter (lokalt) ({cabins.length})</h2>

        {cabins.length === 0 ? (
          <div className="text-sm text-gray-600">Ingen hytter registrert enda.</div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {cabins.map((c) => (
              <li key={c.id} className="border rounded bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.serviced ? "Betjent" : "Ubetjent"} • Pris: {labelPrice(c.price)}
                    </div>
                    {c.facilities && (
                      <div className="text-xs mt-1">
                        <span className="text-gray-500">Fasiliteter:</span> {c.facilities}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="text-sm px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-800"
                    onClick={() => onRemoveLocal(c.id)}
                  >
                    Fjern lokalt
                  </button>
                </div>

                <div className="mt-2">
                  <div className="text-sm font-medium">Tilgjengelighet</div>
                  <ul className="text-sm text-gray-700 list-disc pl-5">
                    {c.availability.map((a, i) => (
                      <li key={i}>
                        {a.from || "?"} → {a.to || "?"}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
