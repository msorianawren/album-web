"use client";

import { useEffect } from "react";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function OAuthHashHandler() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    const next = safeNext(new URLSearchParams(window.location.search).get("next"));

    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: hash.get("expires_in"),
        next,
      }),
    })
      .then((response) => response.json())
      .then((payload) => {
        window.location.replace(payload?.data?.next ?? "/");
      })
      .catch(() => {
        window.location.replace("/login?error=google_login_failed");
      });
  }, []);

  return null;
}
