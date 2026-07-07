"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Album, StudioCommentItem } from "@/lib/types";

type VisibilityFilter = "all" | "visible" | "hidden";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CommentsModeration({
  initialComments,
  albums,
}: {
  initialComments: StudioCommentItem[];
  albums: Album[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [albumId, setAlbumId] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [referenceNow] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return comments.filter((comment) => {
      const matchesSearch = needle
        ? `${comment.body} ${comment.author_name ?? ""} ${comment.album_title ?? ""}`.toLowerCase().includes(needle)
        : true;
      const matchesVisibility =
        visibility === "all" ? true : visibility === "hidden" ? comment.is_hidden : !comment.is_hidden;
      const matchesAlbum = albumId === "all" ? true : comment.album_id === albumId;
      return matchesSearch && matchesVisibility && matchesAlbum;
    });
  }, [albumId, comments, query, visibility]);

  const counters = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    return {
      total: comments.length,
      hidden: comments.filter((comment) => comment.is_hidden).length,
      today: comments.filter((comment) => referenceNow - new Date(comment.created_at).getTime() <= day).length,
      week: comments.filter((comment) => referenceNow - new Date(comment.created_at).getTime() <= 7 * day).length,
    };
  }, [comments, referenceNow]);

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function setHidden(id: string, isHidden: boolean) {
    const response = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: isHidden }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Update failed.");
      return;
    }
    setComments((current) =>
      current.map((comment) => (comment.id === id ? { ...comment, is_hidden: isHidden } : comment)),
    );
    setMessage(isHidden ? "Comment hidden." : "Comment restored.");
  }

  async function deleteComment(id: string, confirm = true) {
    if (confirm && !window.confirm("Delete this comment permanently?")) return;
    const response = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!payload.success) {
      setMessage(payload.message ?? "Delete failed.");
      return;
    }
    setComments((current) => current.filter((comment) => comment.id !== id));
    setSelected((current) => current.filter((item) => item !== id));
    setMessage("Comment deleted.");
  }

  async function bulkHide(isHidden: boolean) {
    if (!selected.length) return;
    for (const id of selected) await setHidden(id, isHidden);
    setSelected([]);
  }

  async function bulkDelete() {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected comment(s)?`)) return;
    for (const id of selected) await deleteComment(id, false);
    setSelected([]);
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total" value={counters.total} />
        <Stat label="Hidden" value={counters.hidden} />
        <Stat label="Today" value={counters.today} />
        <Stat label="This week" value={counters.week} />
      </div>

      <div className="rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-11" placeholder="Search comment body, author, album" />
          </label>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as VisibilityFilter)} className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary">
            <option value="all">All comments</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
          <select value={albumId} onChange={(event) => setAlbumId(event.target.value)} className="h-12 rounded-2xl border border-border bg-surface/80 px-4 text-sm text-text-primary">
            <option value="all">All albums</option>
            {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <p aria-live="polite">{message || `${filtered.length} comment${filtered.length === 1 ? "" : "s"} visible.`}</p>
          {selected.length ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => bulkHide(true)}>Hide selected</Button>
              <Button variant="secondary" onClick={() => bulkHide(false)}>Unhide selected</Button>
              <Button variant="secondary" onClick={bulkDelete}>Delete selected</Button>
            </div>
          ) : null}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((comment) => (
            <article key={comment.id} className="rounded-[1.2rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
              <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-start">
                <input
                  type="checkbox"
                  checked={selected.includes(comment.id)}
                  onChange={() => toggleSelected(comment.id)}
                  className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  aria-label="Select comment"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <span>{comment.author_name || "Anonymous"}</span>
                    <span>{formatDate(comment.created_at)}</span>
                    <span>{comment.is_hidden ? "Hidden" : "Visible"}</span>
                    {comment.album_slug ? (
                      <Link href={`/albums/${comment.album_slug}`} className="text-text-primary underline-offset-4 hover:underline">
                        {comment.album_title ?? "Open album"}
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-primary">{comment.body}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={() => setHidden(comment.id, !comment.is_hidden)}>
                    {comment.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {comment.is_hidden ? "Unhide" : "Hide"}
                  </Button>
                  <Button variant="icon" onClick={() => deleteComment(comment.id)} aria-label="Delete comment">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/70 p-10 text-center">
          <p className="text-lg font-semibold text-text-primary">No comments match this view.</p>
          <p className="mt-2 text-sm text-text-secondary">Comments render as text only, including script-like content.</p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[1.2rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </article>
  );
}
