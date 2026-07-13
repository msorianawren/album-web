"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  target_url: string | null;
  status: "unread" | "read" | "dismissed";
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: any) => n.status === "unread").length || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const dismiss = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => prev > 0 ? prev - 1 : 0);
    } catch (e) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
              <h3 className="font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-accent">{unreadCount} unread</span>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {notifications.length === 0 ? (
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
                          href={n.target_url || "#"}
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
                        {n.status === "read" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismiss(n.id);
                            }}
                            className="ml-2 rounded-full p-1 text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
                            title="Dismiss"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
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
