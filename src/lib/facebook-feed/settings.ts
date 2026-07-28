export function normalizeFacebookFeedSelection(value: unknown, max = 6) {
  const selectedItemIds = Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, max)
    : [];
  return selectedItemIds;
}
