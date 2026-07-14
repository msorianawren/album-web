"use client";

import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, AlertCircle, Save, RotateCcw, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AlbumStatusBadge } from "@/components/ui/Badge";
import type { Album, AlbumStatus } from "@/lib/types";

function SortableAlbumRow({
  album,
  index,
  onMoveUp,
  onMoveDown,
  onMoveTop,
  onMoveBottom
}: {
  album: Album;
  index: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveTop: (id: string) => void;
  onMoveBottom: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-4 rounded-xl border p-4 bg-background transition-colors ${
        isDragging ? "border-accent/50 shadow-lg" : "border-border/60 hover:border-border"
      }`}
    >
      <button
        type="button"
        className="cursor-grab p-1 text-text-secondary hover:text-text-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${album.title}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex h-12 w-16 shrink-0 overflow-hidden rounded bg-surface-secondary">
        {album.cover_url && (
          <img src={album.cover_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-text-primary">{album.title}</p>
        <p className="truncate text-xs text-text-secondary">/{album.slug}</p>
      </div>

      <div className="hidden sm:block text-xs text-text-secondary w-24 text-right">
        {album.media_count} media
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onMoveTop(album.id)} aria-label="Move to top">
          <ArrowUpToLine className="h-4 w-4 text-text-secondary hover:text-text-primary" />
        </Button>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onMoveUp(album.id)} aria-label="Move up">
          <ArrowUp className="h-4 w-4 text-text-secondary hover:text-text-primary" />
        </Button>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onMoveDown(album.id)} aria-label="Move down">
          <ArrowDown className="h-4 w-4 text-text-secondary hover:text-text-primary" />
        </Button>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onMoveBottom(album.id)} aria-label="Move to bottom">
          <ArrowDownToLine className="h-4 w-4 text-text-secondary hover:text-text-primary" />
        </Button>
      </div>

      <div className="w-10 text-right text-xs font-medium text-text-secondary">
        #{index + 1}
      </div>
    </div>
  );
}

export function AlbumOrderManager({ initialAlbums }: { initialAlbums: Album[] }) {
  const [activeTab, setActiveTab] = useState<AlbumStatus>("public");
  
  // Keep the original state to detect changes
  const [originalAlbums, setOriginalAlbums] = useState<Album[]>([]);
  
  // The current active sorted state
  const [albums, setAlbums] = useState<Album[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Initialize and group albums by status
  useEffect(() => {
    // Determine the sorting for each group based on the new logic
    const fallbackSort = (a: Album, b: Album) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    
    const sorted = [...initialAlbums].sort((a, b) => {
      if (a.status !== b.status) return 0;
      
      if (a.status === "public") {
        if (a.public_sort_order != null && b.public_sort_order != null) return a.public_sort_order - b.public_sort_order;
        if (a.public_sort_order != null) return -1;
        if (b.public_sort_order != null) return 1;
      } else if (a.status === "private") {
        if (a.private_sort_order != null && b.private_sort_order != null) return a.private_sort_order - b.private_sort_order;
        if (a.private_sort_order != null) return -1;
        if (b.private_sort_order != null) return 1;
      } else if (a.status === "updating") {
        if (a.updating_sort_order != null && b.updating_sort_order != null) return a.updating_sort_order - b.updating_sort_order;
        if (a.updating_sort_order != null) return -1;
        if (b.updating_sort_order != null) return 1;
      }
      
      return fallbackSort(a, b);
    });

    const timer = window.setTimeout(() => {
      setOriginalAlbums(sorted);
      setAlbums(sorted);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialAlbums]);

  const currentTabAlbums = useMemo(() => {
    return albums.filter((a) => a.status === activeTab);
  }, [albums, activeTab]);

  const currentTabOriginals = useMemo(() => {
    return originalAlbums.filter((a) => a.status === activeTab);
  }, [originalAlbums, activeTab]);

  const hasUnsavedChanges = useMemo(() => {
    if (currentTabAlbums.length !== currentTabOriginals.length) return true;
    for (let i = 0; i < currentTabAlbums.length; i++) {
      if (currentTabAlbums[i].id !== currentTabOriginals[i].id) return true;
    }
    return false;
  }, [currentTabAlbums, currentTabOriginals]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAlbums((items) => {
        const tabItems = items.filter(i => i.status === activeTab);
        const otherItems = items.filter(i => i.status !== activeTab);
        
        const oldIndex = tabItems.findIndex(i => i.id === active.id);
        const newIndex = tabItems.findIndex(i => i.id === over.id);
        
        const reordered = arrayMove(tabItems, oldIndex, newIndex);
        return [...reordered, ...otherItems];
      });
    }
  }

  function moveItem(id: string, direction: 'up' | 'down' | 'top' | 'bottom') {
    setAlbums((items) => {
      const tabItems = items.filter(i => i.status === activeTab);
      const otherItems = items.filter(i => i.status !== activeTab);
      
      const oldIndex = tabItems.findIndex(i => i.id === id);
      if (oldIndex < 0) return items;
      
      let newIndex = oldIndex;
      if (direction === 'up' && oldIndex > 0) newIndex = oldIndex - 1;
      else if (direction === 'down' && oldIndex < tabItems.length - 1) newIndex = oldIndex + 1;
      else if (direction === 'top') newIndex = 0;
      else if (direction === 'bottom') newIndex = tabItems.length - 1;
      
      if (newIndex === oldIndex) return items;
      
      const reordered = arrayMove(tabItems, oldIndex, newIndex);
      return [...reordered, ...otherItems];
    });
  }

  async function saveOrder() {
    setSaving(true);
    setMessage("Saving order...");
    
    try {
      const response = await fetch("/api/studio/albums/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: activeTab,
          albumIds: currentTabAlbums.map(a => a.id)
        }),
      });
      
      const payload = await response.json();
      
      if (!payload.success) {
        setMessage(payload.message ?? "Failed to save order");
      } else {
        setMessage("Order saved successfully");
        setOriginalAlbums(albums); // Reset dirty state
      }
    } catch {
      setMessage("Network error saving order");
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    if (window.confirm("Are you sure you want to discard unsaved changes?")) {
      setAlbums(originalAlbums);
      setMessage("");
    }
  }

  return (
    <div className="grid gap-6 pb-24">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border/60 pb-4">
        {(["public", "updating", "private"] as AlbumStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!window.confirm("You have unsaved changes. Discard and switch tabs?")) return;
                setAlbums(originalAlbums);
              }
              setActiveTab(status);
              setMessage("");
            }}
            className={`px-5 py-2 text-sm font-semibold rounded-full transition-colors ${
              activeTab === status
                ? "bg-text-primary text-background"
                : "bg-surface-secondary text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
          >
            <span className="capitalize">{status}</span>
            <span className="ml-2 text-[0.7rem] opacity-60">
              {albums.filter(a => a.status === status).length}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-[1.4rem] border border-border bg-surface/82 p-6 shadow-xl">
        {currentTabAlbums.length === 0 ? (
          <div className="p-10 text-center text-text-secondary">
            No {activeTab} albums found.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={currentTabAlbums.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-2">
                {currentTabAlbums.map((album, idx) => (
                  <SortableAlbumRow 
                    key={album.id} 
                    album={album} 
                    index={idx}
                    onMoveUp={(id) => moveItem(id, 'up')}
                    onMoveDown={(id) => moveItem(id, 'down')}
                    onMoveTop={(id) => moveItem(id, 'top')}
                    onMoveBottom={(id) => moveItem(id, 'bottom')}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Sticky Save Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full border border-border bg-background/90 px-6 py-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-medium text-accent">
            <AlertCircle className="h-4 w-4" />
            Unsaved changes
          </div>
          <div className="h-4 w-px bg-border"></div>
          <Button variant="ghost" className="h-9 px-4" onClick={discardChanges} disabled={saving}>
            <RotateCcw className="mr-2 h-4 w-4" /> Discard
          </Button>
          <Button className="h-9 px-4" onClick={saveOrder} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>
      )}

      {message && !hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full border border-border bg-background/90 px-6 py-3 text-sm shadow-2xl backdrop-blur-md">
          {message}
        </div>
      )}
    </div>
  );
}
