"use client";

import { useState, type FormEvent } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next: new URLSearchParams(window.location.search).get("next") ?? "/" }),
    });
    const payload = await response.json();

    if (payload.success && payload.data.url) {
      window.location.href = payload.data.url;
    } else {
      setMessage(payload.message ?? "Login failed.");
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Button type="submit" disabled={isLoading}>
        <Chrome className="h-4 w-4" aria-hidden="true" />
        {isLoading ? "Connecting Google..." : "Continue with Google"}
      </Button>
      {message ? (
        <p className="text-sm text-text-secondary" aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
}
