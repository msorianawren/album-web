"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PuzzleChallenge } from "@/lib/puzzles/types";

export function PuzzleChallengeManager({ initialChallenges }: { initialChallenges: PuzzleChallenge[] }) {
  const router = useRouter();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");
  const visible = useMemo(() => challenges.filter((item) => (status === "all" || item.status === status) && `${item.title} ${item.collection}`.toLowerCase().includes(query.toLowerCase())), [challenges, query, status]);

  async function mutate(id: string, action: "duplicate" | "delete") {
    setMessage(action === "duplicate" ? "Duplicating challenge..." : "Removing challenge...");
    const response = await fetch(`/api/studio/games/${id}`, action === "duplicate" ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) } : { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok || !payload.success) { setMessage(payload.message ?? "Action failed."); return; }
    if (action === "duplicate") { router.push(`/studio/games/${payload.data.id}`); return; }
    setChallenges((current) => payload.data.archived
      ? current.map((item) => item.id === id ? { ...item, status: "archived" } : item)
      : current.filter((item) => item.id !== id));
    setMessage(payload.data.archived ? "Challenge archived because it has completion history." : "Draft removed.");
  }

  return <section className="grid gap-5">
    <div className="rounded-[1.4rem] border border-border bg-surface/82 p-4 shadow-lg shadow-text-primary/5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="relative"><span className="sr-only">Search puzzle challenges</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-11" placeholder="Search title or collection" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        <Link href="/studio/games/new"><Button><Plus className="h-4 w-4" />New challenge</Button></Link>
      </div>
      <p className="mt-3 text-sm text-text-secondary" aria-live="polite">{message || `${visible.length} challenge${visible.length === 1 ? "" : "s"} visible.`}</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {visible.map((challenge) => <article key={challenge.id} className="flex gap-4 rounded-[1.4rem] border border-border bg-surface/82 p-3 shadow-lg shadow-text-primary/5">
        {challenge.previewUrl ? <img src={challenge.previewUrl} alt="" className="h-28 w-24 shrink-0 rounded-xl object-cover" /> : <div className="h-28 w-24 shrink-0 rounded-xl bg-surface-secondary" />}
        <div className="min-w-0 flex-1"><p className="truncate font-serif text-2xl text-text-primary">{challenge.title}</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-secondary">{challenge.collection.replaceAll("_", " ")} · {challenge.status}</p><p className="mt-2 line-clamp-2 text-sm text-text-secondary">{challenge.description}</p><div className="mt-3 flex flex-wrap gap-2"><Link href={`/studio/games/${challenge.id}`}><Button variant="secondary"><Edit3 className="h-4 w-4" />Edit</Button></Link><Button variant="secondary" onClick={() => void mutate(challenge.id, "duplicate")}><Copy className="h-4 w-4" />Duplicate</Button><Button variant="icon" onClick={() => void mutate(challenge.id, "delete")} aria-label={`Archive or delete ${challenge.title}`}><Trash2 className="h-4 w-4" /></Button></div></div>
      </article>)}
      {!visible.length && <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/70 p-10 text-center text-text-secondary">No puzzle challenges match this view.</div>}
    </div>
  </section>;
}
