const KEY = "demo_cabin_v1";

export function loadCabin() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCabin(cabin) {
  localStorage.setItem(KEY, JSON.stringify(cabin));
}
