export function isSafeAuthNext(value: unknown): value is string {
  if (typeof value !== "string") return false;

  // Must start with '/' but not '//' or '/\'
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return false;
  }

  try {
    const url = new URL(value, "http://localhost");
    const path = url.pathname;

    // Prevent auth loops and disallowed paths
    if (
      path === "/login" ||
      path === "/auth/callback" ||
      path.startsWith("/api/auth/") ||
      path === "/logout"
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export function safeAuthNext(value: unknown, fallback: string = "/albums"): string {
  return isSafeAuthNext(value) ? value : fallback;
}

export function buildLoginHref(
  currentPath: string,
  searchParams?: string | URLSearchParams,
): string {
  let pathWithQuery = currentPath;
  if (searchParams) {
    const query = typeof searchParams === "string" ? searchParams : searchParams.toString();
    if (query) {
      pathWithQuery += `?${query}`;
    }
  }

  const next = encodeURIComponent(pathWithQuery);
  return `/login?next=${next}`;
}

export function buildRegisterHref(
  currentPath: string,
  searchParams?: string | URLSearchParams,
): string {
  let pathWithQuery = currentPath;
  if (searchParams) {
    const query = typeof searchParams === "string" ? searchParams : searchParams.toString();
    if (query) {
      pathWithQuery += `?${query}`;
    }
  }

  const next = encodeURIComponent(pathWithQuery);
  return `/login?next=${next}&mode=register`;
}
