"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2, X } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  target_url: string | null;
  status: "unread" | "read" | "dismissed";
  created_at: string;
  read_at?: string | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications?mode=count", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(typeof data.count === "number" ? data.count : 0);
      }
    } catch {
      // Keep the existing badge if a transient refresh fails.
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load notifications.");
      const data = await res.json();
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list);
      setUnreadCount(list.filter((n: Notification) => n.status === "unread").length);
    } catch {
      setError("Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void fetchUnreadCount();
    }, 0);
    const interval = setInterval(fetchUnreadCount, 45000);
    const onFocus = () => fetchUnreadCount();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchUnreadCount();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialRefresh);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    const current = notifications.find((n) => n.id === id);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
      );
      if (current?.status === "unread") setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const dismiss = async (id: string) => {
    const current = notifications.find((n) => n.id === id);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (current?.status === "unread") setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
      setUnreadCount(0);
    } catch {}
  };

  const toggleOpen = () => {
    setIsOpen((value) => !value);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface transition-colors"
      >
        <Bell className="h-5 w-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-accent">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 rounded-[1.5rem] border border-border bg-surface shadow-lg overflow-hidden sm:w-96">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">Notifications</h3>
                <p className="text-xs text-text-secondary">Latest 20 updates</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-medium text-accent hover:text-text-primary">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-text-secondary">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading notifications...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-sm text-text-secondary">
                  {error}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-text-secondary">
                  You have no notifications.
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`relative flex flex-col gap-1 rounded-xl p-3 transition-colors ${
                        n.status === "unread" ? "bg-accent/5 hover:bg-accent/10" : "hover:bg-surface-secondary"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <Link
                          href={n.target_url && n.target_url.startsWith("/") ? n.target_url : "/"}
                          onClick={() => {
                            if (n.status === "unread") markAsRead(n.id);
                            setIsOpen(false);
                          }}
                          className="flex-1"
                        >
                          <h4 className={`text-sm ${n.status === "unread" ? "font-semibold text-text-primary" : "font-medium text-text-secondary"}`}>
                            {n.title}
                          </h4>
                          {n.body && (
                            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-text-tertiary">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </Link>
                        {n.status === "unread" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="ml-2 rounded-full p-1 text-accent hover:bg-accent/20 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(n.id);
                          }}
                          className="ml-2 rounded-full p-1 text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
                          title="Dismiss"
                          aria-label="Dismiss notification"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
