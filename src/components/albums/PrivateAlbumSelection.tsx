"use client";

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SelectionContextType {
  selectedIds: Set<string>;
  toggleSelected: (album: { id: string; slug: string; title: string }) => void;
  selectablePrivateAlbums: { id: string; slug: string; title: string }[];
  registerSelectable: (album: { id: string; slug: string; title: string }) => void;
  clearSelection: () => void;
  openRequestModal: (scope: "selected_albums" | "all_private") => void;
}

const SelectionContext = createContext<SelectionContextType | null>(null);

export function PrivateAlbumSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectable, setSelectable] = useState<Map<string, { id: string; slug: string; title: string }>>(new Map());

  const selectablePrivateAlbums = useMemo(() => Array.from(selectable.values()), [selectable]);

  const toggleSelected = (album: { id: string; slug: string; title: string }) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(album.id)) next.delete(album.id);
      else next.add(album.id);
      return next;
    });
  };

  const registerSelectable = (album: { id: string; slug: string; title: string }) => {
    setSelectable((prev) => {
      if (prev.has(album.id)) return prev;
      const next = new Map(prev);
      next.set(album.id, album);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const openRequestModal = (scope: "selected_albums" | "all_private") => {
    const detail = scope === "all_private"
      ? { scope, albums: [] }
      : {
          scope,
          albums: Array.from(selectedIds).map(id => selectable.get(id)).filter(Boolean),
        };
    document.dispatchEvent(new CustomEvent("open-access-request", { detail }));
  };

  return (
    <SelectionContext.Provider value={{ selectedIds, toggleSelected, selectablePrivateAlbums, registerSelectable, clearSelection, openRequestModal }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function PrivateAlbumCheckbox({ album }: { album: { id: string; slug: string; title: string } }) {
  const context = useContext(SelectionContext);

  useEffect(() => {
    context?.registerSelectable(album);
  }, [album, context]);

  if (!context) return null;

  const isSelected = context.selectedIds.has(album.id);

  return (
    <button
      type="button"
      onClick={() => context.toggleSelected(album)}
      className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-text-primary shadow-sm backdrop-blur transition hover:scale-105"
      aria-label={isSelected ? "Remove album from request" : "Select album for private access request"}
    >
      {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
    </button>
  );
}

export function PrivateAlbumSelectionBar() {
  const context = useContext(SelectionContext);
  if (!context) return null;

  const { selectedIds, openRequestModal, clearSelection } = context;
  
  if (selectedIds.size === 0) return null;

  return (
    <div className="sticky bottom-4 z-40 mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-[1.5rem] border border-border bg-background/90 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-text-primary">
        <span className="font-semibold">{selectedIds.size}</span> album{selectedIds.size === 1 ? "" : "s"} selected
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openRequestModal("selected_albums")}>Request selected albums</Button>
        <Button variant="secondary" onClick={() => openRequestModal("all_private")}>Request all private albums</Button>
        <Button variant="ghost" onClick={clearSelection}>Clear selection</Button>
      </div>
    </div>
  );
}
