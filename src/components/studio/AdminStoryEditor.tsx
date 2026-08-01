"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LandingAdminStoriesSettings } from "@/lib/types";

export function AdminStoryEditor({
  value,
  onChange,
  copy,
  onCopyChange,
}: {
  value: LandingAdminStoriesSettings;
  onChange: (value: LandingAdminStoriesSettings) => void;
  copy: { eyebrow: string; heading: string };
  onCopyChange: (copy: { eyebrow: string; heading: string }) => void;
}) {
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
      <p className="text-sm text-text-secondary">
        Story management and uploads are available in the dedicated Stories dashboard.
      </p>
    </div>
  );
}
