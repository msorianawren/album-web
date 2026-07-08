"use client";

import { useState, type FormEvent } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n-client";

type AuthMode = "login" | "register";

export function LoginForm() {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [loadingMode, setLoadingMode] = useState<AuthMode | null>(null);

  async function startGoogleAuth(mode: AuthMode) {
    setLoadingMode(mode);
    setMessage("");

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        next: new URLSearchParams(window.location.search).get("next") ?? "/",
      }),
    });
    const payload = await response.json();

    if (payload.success && payload.data.url) {
      window.location.href = payload.data.url;
    } else {
      setMessage(payload.message ?? t("login.failed"));
      setLoadingMode(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startGoogleAuth("login");
  }

  return (
    <form className="grid min-w-0 gap-3 sm:gap-4" onSubmit={onSubmit}>
      <Button type="submit" disabled={Boolean(loadingMode)} className="w-full px-3 text-center">
        <Chrome className="h-4 w-4" aria-hidden="true" />
        {loadingMode === "login" ? t("login.connecting") : t("login.signInGoogle")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={Boolean(loadingMode)}
        onClick={() => startGoogleAuth("register")}
        className="w-full px-3 text-center"
      >
        <Chrome className="h-4 w-4" aria-hidden="true" />
        {loadingMode === "register" ? t("login.creating") : t("login.registerGoogle")}
      </Button>
      {message ? (
        <p className="text-sm text-text-secondary" aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
}
