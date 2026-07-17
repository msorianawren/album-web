"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PuzzleChallenge, PuzzleGridSize, PuzzleMode, PuzzleTargets } from "@/lib/puzzles/types";

const defaultTargets: PuzzleTargets = { "3": { seconds: 180, moves: 40 }, "4": { seconds: 360, moves: 110 }, "5": { seconds: 720, moves: 260 } };
type PublicImage = { id: string; title: string | null; original_filename: string | null; thumbnail_url: string | null; medium_url: string | null; albums: { title: string } | null };

export function PuzzleChallengeEditor({ challenge }: { challenge?: PuzzleChallenge }) {
  const router = useRouter();
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [collection, setCollection] = useState(challenge?.collection ?? "featured");
  const [sourceType, setSourceType] = useState<"album_media" | "game_asset">(challenge?.sourceType ?? "album_media");
  const [sourceMediaId, setSourceMediaId] = useState(challenge?.sourceMediaId ?? "");
  const [asset, setAsset] = useState({ puzzleAssetKey: challenge?.puzzleAssetKey ?? "", previewAssetKey: challenge?.previewAssetKey ?? "", imageUrl: challenge?.imageUrl ?? "" });
  const [focalX, setFocalX] = useState(challenge?.focalX ?? 0.5);
  const [focalY, setFocalY] = useState(challenge?.focalY ?? 0.5);
  const [allowedModes, setAllowedModes] = useState<PuzzleMode[]>(challenge?.allowedModes ?? ["sliding", "swap"]);
  const [allowedGridSizes, setAllowedGridSizes] = useState<PuzzleGridSize[]>(challenge?.allowedGridSizes ?? [3, 4, 5]);
  const [visibility, setVisibility] = useState(challenge?.visibility ?? "public");
  const [rewardMultiplier, setRewardMultiplier] = useState(challenge?.rewardMultiplier ?? 1);
  const [baseSeed, setBaseSeed] = useState(challenge?.baseSeed ?? "");
  const [targets, setTargets] = useState<PuzzleTargets>(challenge?.targets ?? defaultTargets);
  const [images, setImages] = useState<PublicImage[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (sourceType !== "album_media" || images.length) return; fetch("/api/studio/games?media=public-images").then((response) => response.json()).then((payload) => setImages(payload.data?.media ?? [])).catch(() => setMessage("Could not load public album images.")); }, [images.length, sourceType]);

  function toggle<T>(values: T[], value: T, update: (next: T[]) => void) { update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]); }
  async function upload(file: File) {
    setMessage("Processing game image...");
    const form = new FormData(); form.set("file", file);
    const response = await fetch("/api/studio/games/upload", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok || !payload.success) { setMessage(payload.message ?? "Upload failed."); return; }
    setAsset(payload.data); setSourceType("game_asset"); setMessage("Game image processed.");
  }
  async function save(nextStatus: "draft" | "published") {
    setSaving(true); setMessage("Saving puzzle challenge...");
    const body = { title, description, collection, sourceType, sourceMediaId: sourceMediaId || null, puzzleAssetKey: asset.puzzleAssetKey || null, previewAssetKey: asset.previewAssetKey || null, focalX, focalY, allowedModes, allowedGridSizes, visibility, targets, rewardMultiplier, baseSeed: baseSeed || crypto.randomUUID().replaceAll("-", ""), status: nextStatus };
    const response = await fetch(challenge ? `/api/studio/games/${challenge.id}` : "/api/studio/games", { method: challenge ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json(); setSaving(false);
    if (!response.ok || !payload.success) { setMessage(payload.message ?? "Save failed."); return; }
    setMessage(nextStatus === "published" ? "Puzzle challenge published." : "Puzzle challenge saved.");
    router.push(`/studio/games/${payload.data.id ?? challenge?.id}`); router.refresh();
  }
  const selectedImage = images.find((image) => image.id === sourceMediaId);
  const preview = sourceType === "album_media" ? selectedImage?.medium_url ?? selectedImage?.thumbnail_url : asset.imageUrl;

  return <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="grid gap-5 rounded-[1.5rem] border border-border bg-surface/82 p-4 shadow-xl shadow-text-primary/5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium text-text-primary">Title<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium text-text-primary">Collection<select value={collection} onChange={(event) => setCollection(event.target.value as typeof collection)} className="h-11 rounded-xl border border-border bg-background px-3"><option value="featured">Featured Collections</option><option value="editorial_portraits">Editorial Portraits</option><option value="traditional_elegance">Traditional Elegance</option><option value="travel_stories">Travel Stories</option><option value="seasonal">Seasonal Collections</option></select></label></div>
      <label className="grid gap-2 text-sm font-medium text-text-primary">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-28 rounded-xl border border-border bg-background p-3" /></label>
      <fieldset className="grid gap-3"><legend className="text-sm font-semibold text-text-primary">Image source</legend><div className="flex flex-wrap gap-2"><Button variant={sourceType === "album_media" ? "primary" : "secondary"} onClick={() => setSourceType("album_media")}>Public album image</Button><Button variant={sourceType === "game_asset" ? "primary" : "secondary"} onClick={() => setSourceType("game_asset")}>Game-only image</Button></div>{sourceType === "album_media" ? <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{images.map((image) => <button key={image.id} type="button" onClick={() => setSourceMediaId(image.id)} className={`overflow-hidden rounded-xl border text-left ${sourceMediaId === image.id ? "border-accent ring-2 ring-accent/50" : "border-border"}`}>{image.thumbnail_url ? <img src={image.thumbnail_url} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-surface-secondary" />}<span className="block truncate p-2 text-xs text-text-primary">{image.title ?? image.original_filename ?? image.albums?.title}</span></button>)}</div> : <label className="flex min-h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-text-secondary"><Upload className="mr-2 h-4 w-4" />Upload JPG, PNG, WebP or AVIF<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>}</fieldset>
      <div className="grid gap-4 sm:grid-cols-2"><fieldset><legend className="text-sm font-semibold text-text-primary">Allowed modes</legend>{(["sliding", "swap"] as PuzzleMode[]).map((item) => <label key={item} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={allowedModes.includes(item)} onChange={() => toggle(allowedModes, item, setAllowedModes)} />{item}</label>)}</fieldset><fieldset><legend className="text-sm font-semibold text-text-primary">Allowed grids</legend>{([3, 4, 5] as PuzzleGridSize[]).map((item) => <label key={item} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={allowedGridSizes.includes(item)} onChange={() => toggle(allowedGridSizes, item, setAllowedGridSizes)} />{item} x {item}</label>)}</fieldset></div>
      <div className="grid gap-4 sm:grid-cols-3"><label className="grid gap-2 text-sm">Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "members")} className="h-11 rounded-xl border border-border bg-background px-3"><option value="public">Public</option><option value="members">Members</option></select></label><label className="grid gap-2 text-sm">Reward multiplier<Input type="number" min="0.5" max="2" step="0.1" value={rewardMultiplier} onChange={(event) => setRewardMultiplier(Number(event.target.value))} /></label><label className="grid gap-2 text-sm">Base seed<Input value={baseSeed} onChange={(event) => setBaseSeed(event.target.value)} /></label></div>
      <fieldset className="grid gap-3"><legend className="text-sm font-semibold text-text-primary">Targets by grid</legend><div className="grid gap-3 sm:grid-cols-3">{([3, 4, 5] as PuzzleGridSize[]).map((size) => <div key={size} className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/65 p-3"><p className="col-span-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{size} x {size}</p><label className="grid gap-1 text-xs text-text-secondary">Seconds<Input type="number" min="15" max="3600" value={targets[String(size)]?.seconds ?? ""} onChange={(event) => setTargets((current) => ({ ...current, [String(size)]: { seconds: Number(event.target.value), moves: current[String(size)]?.moves ?? 1 } }))} /></label><label className="grid gap-1 text-xs text-text-secondary">Moves<Input type="number" min="1" max="2000" value={targets[String(size)]?.moves ?? ""} onChange={(event) => setTargets((current) => ({ ...current, [String(size)]: { seconds: current[String(size)]?.seconds ?? 15, moves: Number(event.target.value) } }))} /></label></div>)}</div></fieldset>
      <div className="flex flex-wrap gap-2"><Button disabled={saving} onClick={() => void save("draft")}>Save draft</Button><Button variant="secondary" disabled={saving} onClick={() => void save("published")}>Publish</Button></div><p className="text-sm text-text-secondary" aria-live="polite">{message}</p>
    </div>
    <aside className="rounded-[1.5rem] border border-border bg-surface/82 p-4 shadow-xl shadow-text-primary/5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Preview</p>{preview ? <img src={preview} alt="Puzzle preview" className="mt-3 aspect-square w-full rounded-xl object-cover" style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }} /> : <div className="mt-3 aspect-square rounded-xl bg-surface-secondary" />}<div className="mt-4 grid grid-cols-2 gap-2"><label className="text-xs text-text-secondary">Focal X<Input type="number" min="0" max="1" step="0.05" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} /></label><label className="text-xs text-text-secondary">Focal Y<Input type="number" min="0" max="1" step="0.05" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} /></label></div><Button variant="secondary" className="mt-4 w-full" onClick={() => window.open("/games", "_blank")}><Eye className="h-4 w-4" />Public preview</Button></aside>
  </section>;
}
