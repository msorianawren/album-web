"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LandingAdminStoriesSettings, AdminStory } from "@/lib/types";
import { createAdminStory, deleteAdminStory, fetchAdminStories } from "./adminStoriesActions";
import { Trash2, Loader2, Upload, Video, Image as ImageIcon, Play, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

function extractPoster(videoFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2); // Grab frame at 0.5s or halfway if short
    };
    
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("Canvas context missing"));
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return reject(new Error("Blob generation failed"));
        resolve(new File([blob], videoFile.name.replace(/\.[^/.]+$/, "") + "-poster.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.85);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video loading failed"));
    };
  });
}

export function AdminStoryEditor({
  value,
  onChange,
  copy,
  onCopyChange,
  uploadVideo,
  uploadPoster,
}: {
  value: LandingAdminStoriesSettings;
  onChange: (value: LandingAdminStoriesSettings) => void;
  copy: { eyebrow: string; heading: string };
  onCopyChange: (copy: { eyebrow: string; heading: string }) => void;
  uploadVideo?: (file: File) => Promise<string | void>;
  uploadPoster?: (file: File) => Promise<string | void>;
}) {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  
  // Status states
  const [uploadState, setUploadState] = useState<"idle" | "extracting" | "uploading_video" | "uploading_poster" | "finalizing">("idle");
  const [posterPreview, setPosterPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStories().then(setStories).catch(console.error);
  }, []);

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    
    // Auto extract poster
    setUploadState("extracting");
    try {
      const extractedPoster = await extractPoster(file);
      setPosterFile(extractedPoster);
      setPosterPreview(URL.createObjectURL(extractedPoster));
    } catch (err) {
      console.error("Poster extraction failed:", err);
      // Let them pick manually if it fails
    } finally {
      setUploadState("idle");
    }
  }

  function handlePosterSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  }

  async function handleCreateStory() {
    if (!videoFile || !posterFile || !uploadVideo || !uploadPoster) return;
    try {
      setUploadState("uploading_video");
      const videoUrl = await uploadVideo(videoFile);
      if (!videoUrl) throw new Error("Video upload failed");

      setUploadState("uploading_poster");
      const posterUrl = await uploadPoster(posterFile);
      if (!posterUrl) throw new Error("Poster upload failed");
      
      setUploadState("finalizing");
      const newStory = await createAdminStory(videoUrl, posterUrl);
      setStories(prev => [newStory, ...prev]);
      
      onChange({
        ...value,
        selectedItemIds: [...value.selectedItemIds, newStory.id]
      });
      
      setVideoFile(null);
      setPosterFile(null);
      setPosterPreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to create story");
    } finally {
      setUploadState("idle");
    }
  }

  const isWorking = uploadState !== "idle";

  return (
    <div className="mt-12 pt-8">
      <div className="mb-8 flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h3 className="font-serif text-2xl text-text-primary">Founder Stories (Admin)</h3>
          <p className="mt-1 text-sm text-text-secondary">Manage full-screen portrait videos displayed on the landing page.</p>
        </div>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-[1rem] border border-border/50 bg-surface/30 p-6 backdrop-blur-md shadow-sm transition-all hover:bg-surface/50">
          <label className="mb-2 block text-sm font-medium text-text-secondary">Section Eyebrow</label>
          <Input 
            value={copy.eyebrow} 
            onChange={(e) => onCopyChange({ ...copy, eyebrow: e.target.value })} 
            placeholder="Behind the scenes" 
            maxLength={80} 
            className="bg-background/50 border-border/40 focus:border-text-primary"
          />
        </div>
        <div className="rounded-[1rem] border border-border/50 bg-surface/30 p-6 backdrop-blur-md shadow-sm transition-all hover:bg-surface/50">
          <label className="mb-2 block text-sm font-medium text-text-secondary">Section Heading</label>
          <Input 
            value={copy.heading} 
            onChange={(e) => onCopyChange({ ...copy, heading: e.target.value })} 
            placeholder="Founder Stories" 
            maxLength={140} 
            className="bg-background/50 border-border/40 focus:border-text-primary"
          />
        </div>
      </div>
      
      <div className="mb-12 overflow-hidden rounded-[1.25rem] border border-border/60 bg-gradient-to-b from-surface/80 to-surface/40 p-1 backdrop-blur-xl shadow-sm">
        <div className="rounded-[1.15rem] border border-white/5 bg-background/40 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-text-primary/10 text-text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-medium text-text-primary">Upload New Story</h4>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="group relative rounded-xl border-2 border-dashed border-border/60 bg-surface/30 p-6 text-center transition-all hover:border-text-primary/30 hover:bg-surface/60">
              <Input 
                type="file" 
                accept="video/mp4,video/webm" 
                onChange={handleVideoSelect}
                disabled={isWorking}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <Video className="mx-auto mb-3 h-8 w-8 text-text-secondary/60 group-hover:text-text-primary/70 transition-colors" />
              <p className="text-sm font-medium text-text-primary">Select Video (MP4/WebM)</p>
              <p className="mt-1 text-xs text-text-tertiary">{videoFile ? videoFile.name : "Drag & drop or click to browse"}</p>
            </div>

            <div className={clsx("group relative rounded-xl border-2 border-dashed p-6 text-center transition-all", posterFile ? "border-transparent bg-black" : "border-border/60 bg-surface/30 hover:border-text-primary/30 hover:bg-surface/60")}>
              <Input 
                type="file" 
                accept="image/jpeg,image/webp,image/png" 
                onChange={handlePosterSelect}
                disabled={isWorking}
                className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
              />
              {posterPreview ? (
                <>
                  <img src={posterPreview} className="absolute inset-0 h-full w-full object-cover rounded-xl opacity-60 mix-blend-screen" alt="Poster preview" />
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 rounded-xl transition-opacity group-hover:bg-black/60">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-white/90" />
                    <p className="text-sm font-medium text-white shadow-sm">Poster Ready</p>
                    <p className="text-xs text-white/70 shadow-sm mt-1">Click to override default frame</p>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="mx-auto mb-3 h-8 w-8 text-text-secondary/60 group-hover:text-text-primary/70 transition-colors" />
                  <p className="text-sm font-medium text-text-primary">Poster Image (Auto-generated)</p>
                  <p className="mt-1 text-xs text-text-tertiary">Select a video first, or upload custom</p>
                </>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 sm:flex-row">
            <div className="flex items-center gap-3 text-sm font-medium">
              {uploadState === "extracting" && <><Loader2 className="h-4 w-4 animate-spin text-text-secondary" /><span className="text-text-secondary">Extracting poster frame...</span></>}
              {uploadState === "uploading_video" && <><Loader2 className="h-4 w-4 animate-spin text-text-primary" /><span className="text-text-primary">Uploading video to edge storage...</span></>}
              {uploadState === "uploading_poster" && <><Loader2 className="h-4 w-4 animate-spin text-text-primary" /><span className="text-text-primary">Uploading poster image...</span></>}
              {uploadState === "finalizing" && <><Loader2 className="h-4 w-4 animate-spin text-text-primary" /><span className="text-text-primary">Finalizing story...</span></>}
            </div>
            
            <Button 
              onClick={handleCreateStory} 
              disabled={!videoFile || !posterFile || isWorking}
              className="min-w-[160px] rounded-full shadow-sm hover:shadow-md"
            >
              {isWorking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isWorking ? "Processing..." : "Publish Story"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="font-serif text-xl text-text-primary">Manage Stories</h4>
        {stories.length === 0 ? (
          <div className="rounded-[1rem] border border-border border-dashed p-12 text-center text-text-tertiary">
            <Play className="mx-auto mb-4 h-10 w-10 opacity-30" />
            <p>No stories found. Upload your first story above.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stories.map(story => {
              const isSelected = value.selectedItemIds.includes(story.id);
              return (
                <div key={story.id} className={clsx("group relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-md", isSelected ? 'border-text-primary shadow-sm' : 'border-border/60 hover:border-text-primary/40')}>
                  <div className="aspect-[9/16] relative bg-black">
                    <img 
                      src={story.thumbnail_url || (story as any).poster_url} 
                      alt="" 
                      className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3">
                      <Button
                        variant={isSelected ? "primary" : "secondary"}
                        className="w-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md"
                        onClick={() => {
                          onChange({
                            ...value,
                            selectedItemIds: isSelected 
                              ? value.selectedItemIds.filter(id => id !== story.id)
                              : [...value.selectedItemIds, story.id]
                          });
                        }}
                      >
                        {isSelected ? "Visible on Page" : "Hidden"}
                      </Button>
                      
                      <button
                        className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-red-400 transition-colors backdrop-blur-md hover:bg-red-500/20 hover:text-red-300"
                        onClick={async () => {
                          if (confirm("Permanently delete this story? This action cannot be undone.")) {
                            await deleteAdminStory(story.id);
                            setStories(s => s.filter(x => x.id !== story.id));
                            if (isSelected) {
                              onChange({
                                ...value,
                                selectedItemIds: value.selectedItemIds.filter(id => id !== story.id)
                              });
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
