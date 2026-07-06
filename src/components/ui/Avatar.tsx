import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  className?: string;
}

export function Avatar({ name = "Guest", imageUrl, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part.at(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-secondary text-sm font-semibold text-text-primary",
        className,
      )}
      aria-label={`${name} avatar`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <User className="h-4 w-4" aria-hidden="true" />
      )}
    </div>
  );
}
