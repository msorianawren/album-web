export function getOrCreateClientId() {
  const key = "album_client_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}
