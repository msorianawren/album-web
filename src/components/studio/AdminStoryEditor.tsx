"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AdminStory } from "@/lib/types";
import { isPortraitStory } from "@/lib/admin-stories/contract";
import { readApiData, uploadBlobDirectly, type StoryListResponse } from "@/lib/admin-stories/client";
import { createStoryPoster, inspectStoryVideo, type StoryVideoMetadata } from "@/lib/admin-stories/video";

interface UploadDraft { file: File; poster: Blob; posterPreview: string; metadata: StoryVideoMetadata }
interface PresignResponse { storyId: string; video: { uploadUrl: string; r2Key: string }; poster: { uploadUrl: string; r2Key: string } }
type UploadState = "idle" | "reading_metadata" | "generating_poster" | "ready" | "requesting_upload" | "uploading_video" | "uploading_poster" | "finalizing" | "success" | "error";

function formatBytes(value: number | null) {
  if (value === null) return "Legacy metadata";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminStoryEditor({ copy, onCopyChange }: { copy: { eyebrow: string; heading: string }; onCopyChange: (copy: { eyebrow: string; heading: string }) => void }) {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [limits, setLimits] = useState<StoryListResponse["limits"] | null>(null);
  const [draft, setDraft] = useState<UploadDraft | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState({ video: 0, poster: 0, total: 0 });
  const [message, setMessage] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const uploadController = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/stories", { cache: "no-store" })
      .then((response) => readApiData<StoryListResponse>(response))
      .then((data) => { if (active) { setStories(data.stories); setLimits(data.limits); } })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Stories could not be loaded."); });
    return () => { active = false; };
  }, []);
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.posterPreview); }, [draft]);

  async function refreshStories() {
    const data = await readApiData<StoryListResponse>(await fetch("/api/admin/stories", { cache: "no-store" }));
    setStories(data.stories); setLimits(data.limits);
  }

  function clearDraft() {
    uploadController.current?.abort();
    setDraft(null); setCaption(""); setProgress({ video: 0, poster: 0, total: 0 }); setUploadState("idle"); setFileInputKey((key) => key + 1);
  }

  async function chooseVideo(file: File | null) {
    if (!file) return;
    setMessage("Reading video metadata…"); setUploadState("reading_metadata"); setBusy(true);
    try {
      if (file.type !== "video/mp4" && file.type !== "video/webm") throw new Error("Choose an MP4 or WebM video.");
      if (limits && file.size > limits.maxVideoSizeBytes) throw new Error(`Video exceeds the ${formatBytes(limits.maxVideoSizeBytes)} limit.`);
      const metadata = await inspectStoryVideo(file);
      if (limits && metadata.durationSeconds > limits.maxDurationSeconds) throw new Error(`Video exceeds the ${limits.maxDurationSeconds}-second limit.`);
      if (!isPortraitStory(metadata.width, metadata.height)) throw new Error("Choose a vertical 9:16 video. Landscape videos are not accepted.");
      setUploadState("generating_poster"); setMessage("Generating a WebP poster…");
      const poster = await createStoryPoster(file);
      setDraft({ file, poster, posterPreview: URL.createObjectURL(poster), metadata });
      setUploadState("ready"); setMessage("Poster generated. Review it, then upload.");
    } catch (error) {
      setDraft(null); setUploadState("error"); setMessage(error instanceof Error ? error.message : "Video validation failed.");
    } finally { setBusy(false); }
  }

  async function uploadStory() {
    if (!draft) return;
    setBusy(true); setProgress({ video: 0, poster: 0, total: 0 }); setUploadState("requesting_upload"); setMessage("Preparing direct upload…");
    const controller = new AbortController(); uploadController.current = controller;
    let slots: PresignResponse | null = null;
    try {
      const metadata = {
        video: { filename: draft.file.name, mimeType: draft.file.type, size: draft.file.size, width: draft.metadata.width, height: draft.metadata.height, durationSeconds: draft.metadata.durationSeconds },
        poster: { filename: "poster.webp", mimeType: "image/webp", size: draft.poster.size, width: 720, height: 1280 },
      };
      slots = await readApiData<PresignResponse>(await fetch("/api/admin/stories/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metadata), signal: controller.signal }));
      setUploadState("uploading_video"); setMessage("Uploading video directly to media storage…");
      await uploadBlobDirectly({ uploadUrl: slots.video.uploadUrl, body: draft.file, contentType: draft.file.type, signal: controller.signal, onProgress: (value) => setProgress({ video: Math.round(value * 100), poster: 0, total: Math.round(value * 90) }) });
      setUploadState("uploading_poster"); setMessage("Uploading generated poster…");
      await uploadBlobDirectly({ uploadUrl: slots.poster.uploadUrl, body: draft.poster, contentType: "image/webp", signal: controller.signal, onProgress: (value) => setProgress({ video: 100, poster: Math.round(value * 100), total: 90 + Math.round(value * 10) }) });
      setUploadState("finalizing"); setMessage("Verifying media…");
      const finalized = await readApiData<{ story: AdminStory }>(await fetch("/api/admin/stories/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storyId: slots.storyId, video: { ...metadata.video, r2Key: slots.video.r2Key }, poster: { ...metadata.poster, r2Key: slots.poster.r2Key }, caption }), signal: controller.signal }));
      setStories((current) => [...current, finalized.story]);
      clearDraft(); setProgress({ video: 100, poster: 100, total: 100 }); setUploadState("success"); setMessage("Story uploaded and published. Enable Founder Stories and Save Landing if the section is still hidden.");
    } catch (error) {
      setUploadState("error");
      let cleanupFailed = false;
      if (slots) {
        const cleanup = await fetch("/api/admin/stories/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storyId: slots.storyId, videoR2Key: slots.video.r2Key, posterR2Key: slots.poster.r2Key }) }).catch(() => null);
        cleanupFailed = !cleanup?.ok;
      }
      const reason = error instanceof DOMException && error.name === "AbortError" ? "Upload cancelled." : error instanceof Error ? error.message : "Upload failed. You can retry.";
      setMessage(cleanupFailed ? `${reason} Temporary storage cleanup needs attention.` : reason);
    } finally { setBusy(false); uploadController.current = null; }
  }

  async function updateStory(id: string, patch: { caption?: string | null; is_published?: boolean }) {
    try {
      const data = await readApiData<{ story: AdminStory }>(await fetch(`/api/admin/stories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }));
      setStories((current) => current.map((story) => story.id === id ? data.story : story));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Story update failed.");
      await refreshStories().catch(() => undefined);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stories.length) return;
    const reordered = [...stories]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStories(reordered);
    try {
      await readApiData(await fetch("/api/admin/stories/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: reordered.map((story) => story.id) }) }));
    } catch (error) { setStories(stories); setMessage(error instanceof Error ? error.message : "Reordering failed."); await refreshStories().catch(() => undefined); }
  }

  async function remove(story: AdminStory) {
    if (!window.confirm("Delete this story and its video/poster from media storage?")) return;
    try {
      await readApiData<{ cleanupPending: boolean }>(await fetch(`/api/admin/stories/${story.id}`, { method: "DELETE" }));
      setStories((current) => current.filter((item) => item.id !== story.id));
      setMessage("Story and its media were deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Story deletion failed.");
      await refreshStories().catch(() => undefined);
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-8" aria-labelledby="founder-stories-admin-heading">
      <div className="mb-6"><h3 id="founder-stories-admin-heading" className="font-serif text-2xl text-text-primary">Founder Stories</h3><p className="mt-2 max-w-2xl text-sm text-text-secondary">Upload a vertical video once. The browser creates its poster and sends both files directly to media storage. Visibility and order update immediately; heading changes use Save Landing.</p></div>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-text-secondary">Eyebrow<Input className="mt-1.5" value={copy.eyebrow} onChange={(event) => onCopyChange({ ...copy, eyebrow: event.target.value })} maxLength={80} /></label>
        <label className="text-sm font-medium text-text-secondary">Heading<Input className="mt-1.5" value={copy.heading} onChange={(event) => onCopyChange({ ...copy, heading: event.target.value })} maxLength={140} /></label>
      </div>
      <div className="mb-10 rounded-[1.25rem] border border-border bg-surface/55 p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <div>
            <label className="text-sm font-medium text-text-primary">Vertical video (MP4 or WebM)<Input key={fileInputKey} className="mt-2" type="file" accept="video/mp4,video/webm" disabled={busy} onChange={(event) => void chooseVideo(event.target.files?.[0] ?? null)} /></label>
            <label className="mt-4 block text-sm font-medium text-text-primary">Caption (optional)<Input className="mt-2" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} disabled={busy} /></label>
            {draft ? <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-secondary"><div><dt>Dimensions</dt><dd className="text-text-primary">{draft.metadata.width} × {draft.metadata.height}</dd></div><div><dt>Duration</dt><dd className="text-text-primary">{draft.metadata.durationSeconds.toFixed(1)}s</dd></div><div><dt>Video</dt><dd className="text-text-primary">{formatBytes(draft.file.size)}</dd></div><div><dt>Poster</dt><dd className="text-text-primary">WebP · {formatBytes(draft.poster.size)}</dd></div></dl> : null}
            {busy || progress.total > 0 ? <div className="mt-5" aria-label={`Upload progress ${progress.total}%`}><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent transition-[width]" style={{ width: `${progress.total}%` }} /></div><p className="mt-2 text-xs text-text-secondary">Video {progress.video}% · Poster {progress.poster}% · Total {progress.total}%</p></div> : null}
            {message ? <p role="status" data-upload-state={uploadState} className="mt-4 text-sm text-text-secondary">{message}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => void uploadStory()} disabled={!draft || busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Upload Story</Button>{["requesting_upload", "uploading_video", "uploading_poster"].includes(uploadState) ? <Button variant="secondary" onClick={() => uploadController.current?.abort()}><X className="size-4" />Cancel upload</Button> : null}{draft && !busy ? <Button variant="ghost" onClick={clearDraft}><RotateCcw className="size-4" />Clear selection</Button> : null}</div>
          </div>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[13rem] overflow-hidden rounded-[1rem] border border-border bg-background/60">{draft ? <Image src={draft.posterPreview} alt="Generated story poster preview" fill sizes="208px" unoptimized className="object-cover" /> : <div className="grid size-full place-items-center px-5 text-center text-xs text-text-secondary">Your generated 9:16 poster will appear here.</div>}</div>
        </div>
      </div>
      <div className="space-y-3"><h4 className="font-medium text-text-primary">Manage stories</h4>{stories.length === 0 ? <p className="text-sm text-text-secondary">No stories yet.</p> : stories.map((story, index) => { const legacy = !story.video_r2_key || !story.poster_r2_key; return <article key={story.id} className="grid gap-4 rounded-[1rem] border border-border bg-surface/55 p-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"><div className="relative aspect-[9/16] w-20 overflow-hidden rounded-xl"><Image src={story.poster_url} alt="" fill sizes="80px" unoptimized className="object-cover" /></div><div className="min-w-0"><Input aria-label="Story caption" defaultValue={story.caption ?? ""} maxLength={300} onBlur={(event) => { if (event.target.value.trim() !== (story.caption ?? "")) void updateStory(story.id, { caption: event.target.value }); }} /><p className="mt-2 text-xs text-text-secondary">{story.width && story.height ? `${story.width} × ${story.height}` : "Legacy dimensions"} · {story.duration_seconds === null ? "Legacy duration" : `${story.duration_seconds.toFixed(1)}s`} · {formatBytes(story.file_size)} · {story.mime_type ?? "Legacy MIME"}</p><p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${legacy ? "text-amber-600" : story.is_published ? "text-emerald-600" : "text-text-secondary"}`}>{legacy ? "Legacy — storage keys unavailable" : story.is_published ? "Published" : "Hidden"}</p></div><div className="flex flex-wrap gap-2 sm:justify-end"><Button variant="secondary" onClick={() => void updateStory(story.id, { is_published: !story.is_published })}>{story.is_published ? "Hide" : "Publish"}</Button><Button variant="icon" aria-label="Move story up" disabled={index === 0} onClick={() => void move(index, -1)}><ArrowUp className="size-4" /></Button><Button variant="icon" aria-label="Move story down" disabled={index === stories.length - 1} onClick={() => void move(index, 1)}><ArrowDown className="size-4" /></Button><Button variant="icon" aria-label="Delete story" onClick={() => void remove(story)}><Trash2 className="size-4 text-red-500" /></Button></div></article>; })}</div>
    </section>
  );
}
