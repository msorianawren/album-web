"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LandingAdminStoriesSettings, AdminStory } from "@/lib/types";
import { createAdminStory, deleteAdminStory, fetchAdminStories } from "./adminStoriesActions";
import { Trash2, Loader2, Upload } from "lucide-react";

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
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchAdminStories().then(setStories).catch(console.error);
  }, []);

  async function handleCreateStory() {
    if (!videoFile || !posterFile || !uploadVideo || !uploadPoster) return;
    setIsUploading(true);
    try {
      const videoUrl = await uploadVideo(videoFile);
      const posterUrl = await uploadPoster(posterFile);
      if (!videoUrl || !posterUrl) throw new Error("Upload failed");
      
      const newStory = await createAdminStory(videoUrl, posterUrl);
      setStories(prev => [newStory, ...prev]);
      
      onChange({
        ...value,
        selectedItemIds: [...value.selectedItemIds, newStory.id]
      });
      
      setVideoFile(null);
      setPosterFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to create story");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-8">
      <h3 className="mb-4 font-serif text-xl text-text-primary">Founder Stories (Admin)</h3>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Eyebrow</label>
          <Input 
            value={copy.eyebrow} 
            onChange={(e) => onCopyChange({ ...copy, eyebrow: e.target.value })} 
            placeholder="Behind the scenes" 
            maxLength={80} 
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Heading</label>
          <Input 
            value={copy.heading} 
            onChange={(e) => onCopyChange({ ...copy, heading: e.target.value })} 
            placeholder="Founder Stories" 
            maxLength={140} 
          />
        </div>
      </div>
      
      <div className="mb-8 rounded-[1rem] border border-border bg-surface/50 p-6">
        <h4 className="mb-4 font-medium text-text-primary">Upload New Story</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Video File (MP4/WebM)</label>
            <Input 
              type="file" 
              accept="video/mp4,video/webm" 
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              disabled={isUploading}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Poster Image (JPG/WebP/PNG)</label>
            <Input 
              type="file" 
              accept="image/jpeg,image/webp,image/png" 
              onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
              disabled={isUploading}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleCreateStory} 
            disabled={!videoFile || !posterFile || isUploading}
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Story
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-text-primary">Manage Stories</h4>
        {stories.length === 0 ? (
          <p className="text-sm text-text-secondary">No stories found. Upload one above.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stories.map(story => {
              const isSelected = value.selectedItemIds.includes(story.id);
              return (
                <div key={story.id} className={`group relative overflow-hidden rounded-[1rem] border ${isSelected ? 'border-text-primary' : 'border-border'} bg-surface/80`}>
                  <div className="aspect-[9/16] relative">
                    <img 
                      src={story.thumbnail_url || (story as any).poster_url} 
                      alt="" 
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <Button
                        variant={isSelected ? "primary" : "secondary"}
                        className="text-xs"
                        onClick={() => {
                          onChange({
                            ...value,
                            selectedItemIds: isSelected 
                              ? value.selectedItemIds.filter(id => id !== story.id)
                              : [...value.selectedItemIds, story.id]
                          });
                        }}
                      >
                        {isSelected ? "Shown on Landing" : "Show on Landing"}
                      </Button>
                      
                      <button
                        className="text-red-400 hover:text-red-300 bg-black/40 hover:bg-black/60 p-2 rounded-full transition-colors backdrop-blur-sm"
                        onClick={async () => {
                          if (confirm("Delete this story?")) {
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
