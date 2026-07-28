"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { LandingMetaFeedSettings } from "@/lib/types";
import type { MetaFeedItem } from "@/lib/meta/types";

function SelectedRow({ item, value, onRemove, onFeatured, onOverride }: { item: MetaFeedItem; value: LandingMetaFeedSettings; onRemove: () => void; onFeatured: () => void; onOverride: (next: LandingMetaFeedSettings) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const override = value.itemOverrides?.[item.id] ?? {};
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-xl border border-border bg-surface p-3">
    <div className="flex items-center gap-3"><button type="button" className="cursor-grab text-text-secondary active:cursor-grabbing" aria-label={`Drag to reorder ${item.title ?? "video"}`} {...attributes} {...listeners}><GripVertical className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-text-primary">{item.title || item.message || "Untitled Facebook video"}</p><p className="text-xs text-text-secondary">{item.item_type.replace("_", " ")}{item.duration_seconds ? ` · ${item.duration_seconds}s` : ""}</p></div><label className="flex items-center gap-2 text-xs text-text-secondary"><input type="radio" name="featured-meta-item" checked={value.featuredItemId === item.id} onChange={onFeatured} />Featured</label><button type="button" className="text-xs font-medium text-text-secondary underline underline-offset-4 hover:text-text-primary" onClick={onRemove}>Remove</button></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><Input aria-label="Video title override" placeholder="Website title override" value={override.title ?? ""} maxLength={180} onChange={(event) => onOverride({ ...value, itemOverrides: { ...value.itemOverrides, [item.id]: { ...override, title: event.target.value } } })} /><Textarea aria-label="Video caption override" placeholder="Website caption override" value={override.caption ?? ""} maxLength={600} onChange={(event) => onOverride({ ...value, itemOverrides: { ...value.itemOverrides, [item.id]: { ...override, caption: event.target.value } } })} /></div>
  </div>;
}

export function MetaFeedLandingEditor({ value, onChange, copy, onCopyChange }: { value: LandingMetaFeedSettings; onChange: (value: LandingMetaFeedSettings) => void; copy: Pick<LandingMetaFeedSettings, "eyebrow" | "heading" | "description">; onCopyChange: (copy: Pick<LandingMetaFeedSettings, "eyebrow" | "heading" | "description">) => void }) {
  const [items, setItems] = useState<MetaFeedItem[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/integrations/meta/feed?limit=50&search=${encodeURIComponent(search)}`, { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) { setItems(payload.data.items); setMessage(payload.data.total ? "" : "No videos are cached yet. Connect a Page and sync first."); }
    else setMessage(payload.message ?? "Could not load the cached Facebook videos.");
  }, [search]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const selected = useMemo(() => value.selectedItemIds.flatMap((id) => items.find((item) => item.id === id) ? [items.find((item) => item.id === id)!] : []), [items, value.selectedItemIds]);
  function setSelection(ids: string[]) {
    const selectedItemIds = ids.slice(0, 6);
    onChange({ ...value, selectedItemIds, featuredItemId: value.featuredItemId && selectedItemIds.includes(value.featuredItemId) ? value.featuredItemId : selectedItemIds[0] ?? null });
  }
  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = value.selectedItemIds.indexOf(String(event.active.id)); const to = value.selectedItemIds.indexOf(String(event.over.id));
    if (from >= 0 && to >= 0) setSelection(arrayMove(value.selectedItemIds, from, to));
  }
  return <div className="mt-8 grid gap-6 border-t border-border pt-8">
    <div><h3 className="font-serif text-xl text-text-primary">Facebook video feed</h3><p className="mt-2 text-sm leading-6 text-text-secondary">Select up to six cached public videos. The landing page uses this saved data even when Facebook is unavailable.</p></div>
    <div className="grid gap-4 md:grid-cols-3"><label className="flex items-center gap-3 rounded-xl bg-surface-secondary/50 p-4 text-sm text-text-primary"><input type="checkbox" checked={value.enabled} onChange={(event) => onChange({ ...value, enabled: event.target.checked })} />Show section</label><label className="text-sm text-text-secondary">Layout<select value={value.layout} onChange={(event) => onChange({ ...value, layout: event.target.value as LandingMetaFeedSettings["layout"] })} className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-text-primary"><option value="editorial">Editorial</option><option value="filmstrip">Filmstrip</option><option value="carousel">Carousel</option></select></label><label className="text-sm text-text-secondary">Playback<select value={value.playMode} onChange={(event) => onChange({ ...value, playMode: event.target.value as LandingMetaFeedSettings["playMode"] })} className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-text-primary"><option value="inline">Play in website</option><option value="facebook">Open Facebook</option></select></label></div>
    <div className="grid gap-4 md:grid-cols-2"><Input aria-label="Facebook feed eyebrow" value={copy.eyebrow} maxLength={80} onChange={(event) => onCopyChange({ ...copy, eyebrow: event.target.value })} /><Input aria-label="Facebook feed heading" value={copy.heading} maxLength={140} onChange={(event) => onCopyChange({ ...copy, heading: event.target.value })} /></div><Textarea aria-label="Facebook feed description" value={copy.description} maxLength={500} onChange={(event) => onCopyChange({ ...copy, description: event.target.value })} />
    <div className="grid gap-3 sm:grid-cols-4"><label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={value.showCaption} onChange={(event) => onChange({ ...value, showCaption: event.target.checked })} />Captions</label><label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={value.showPublishedDate} onChange={(event) => onChange({ ...value, showPublishedDate: event.target.checked })} />Dates</label><label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={value.showFacebookBranding} onChange={(event) => onChange({ ...value, showFacebookBranding: event.target.checked })} />Facebook source</label><label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={value.autoFillLatest} onChange={(event) => onChange({ ...value, autoFillLatest: event.target.checked })} />Fill newest</label></div>
    <div className="grid gap-4 lg:grid-cols-2"><div><div className="mb-3 flex items-center gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search caption" /><button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-border text-text-secondary" aria-label="Search cached Facebook videos" onClick={() => void load()}><Search className="h-4 w-4" /></button></div><div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1">{items.map((item) => { const checked = value.selectedItemIds.includes(item.id); return <label key={item.id} className={`flex gap-3 rounded-xl border p-3 ${item.is_available && item.is_public ? "border-border bg-surface" : "border-red-500/30 bg-red-500/5 opacity-60"}`}><input type="checkbox" disabled={!item.is_available || !item.is_public || (!checked && value.selectedItemIds.length >= 6)} checked={checked} onChange={() => setSelection(checked ? value.selectedItemIds.filter((id) => id !== item.id) : [...value.selectedItemIds, item.id])} /><div className="min-w-0"><p className="line-clamp-2 text-sm font-medium text-text-primary">{item.title || item.message || "Untitled Facebook video"}</p><p className="mt-1 text-xs text-text-secondary">{item.item_type.replace("_", " ")}{!item.is_available ? " · unavailable" : ""}</p></div></label>; })}</div></div><div><p className="mb-3 text-sm font-medium text-text-primary">Selected order ({selected.length}/6)</p><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}><SortableContext items={selected.map((item) => item.id)} strategy={verticalListSortingStrategy}><div className="grid gap-3">{selected.map((item) => <SelectedRow key={item.id} item={item} value={value} onRemove={() => setSelection(value.selectedItemIds.filter((id) => id !== item.id))} onFeatured={() => onChange({ ...value, featuredItemId: item.id })} onOverride={onChange} />)}</div></SortableContext></DndContext>{!selected.length ? <p className="rounded-xl bg-surface-secondary/45 p-5 text-sm text-text-secondary">No selected videos.</p> : null}</div></div>
    {message ? <p className="text-sm text-text-secondary" role="status">{message}</p> : null}
  </div>;
}
