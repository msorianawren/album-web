import type { Media } from "@/lib/types";

export const mediaSortModes = [
  "smart",
  "manual",
  "taken_desc",
  "taken_asc",
  "uploaded_desc",
  "uploaded_asc",
  "filename_asc",
  "filename_desc",
  "portrait_first",
  "landscape_first",
  "aspect_group",
  "type",
  "liked_desc",
  "commented_desc",
  "viewed_desc",
  "featured",
  "shuffle",
] as const;

export type MediaSortMode = (typeof mediaSortModes)[number];

export const mediaSortLabels: Record<MediaSortMode, string> = {
  smart: "Smart Sort",
  manual: "Default order",
  taken_desc: "Date taken, newest",
  taken_asc: "Date taken, oldest",
  uploaded_desc: "Upload date, newest",
  uploaded_asc: "Upload date, oldest",
  filename_asc: "File name, A to Z",
  filename_desc: "File name, Z to A",
  portrait_first: "Portrait first",
  landscape_first: "Landscape first",
  aspect_group: "Aspect ratio groups",
  type: "Image / video",
  liked_desc: "Most liked",
  commented_desc: "Most commented",
  viewed_desc: "Most viewed",
  featured: "Featured first",
  shuffle: "Shuffle",
};

export function parseMediaSortMode(value: unknown, fallback: MediaSortMode = "smart"): MediaSortMode {
  return mediaSortModes.includes(value as MediaSortMode) ? (value as MediaSortMode) : fallback;
}

function timestamp(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function filename(value: Media) {
  return (value.safe_display_name ?? value.original_filename ?? value.title ?? value.id).toLocaleLowerCase();
}

function sortDate(value: Media) {
  return timestamp(value.sort_date ?? value.taken_at ?? value.created_at);
}

function stableTie(left: Media, right: Media) {
  const manual = left.sort_order - right.sort_order;
  if (manual !== 0) return manual;
  const created = timestamp(left.created_at) - timestamp(right.created_at);
  if (created !== 0) return created;
  return left.id.localeCompare(right.id);
}

function orientationRank(item: Media, preferred: "portrait" | "landscape") {
  const orientation =
    item.orientation ??
    (item.width && item.height ? (item.height > item.width ? "portrait" : item.width > item.height ? "landscape" : "square") : "unknown");
  if (orientation === preferred) return 0;
  if (orientation === "square") return 1;
  if (orientation === "unknown") return 3;
  return 2;
}

function aspectGroup(item: Media) {
  const ratio =
    item.aspect_ratio ??
    (item.width && item.height && item.height > 0 ? item.width / item.height : null);
  if (!ratio) return 9;
  if (ratio < 0.82) return 0;
  if (ratio < 1.12) return 1;
  if (ratio < 1.55) return 2;
  return 3;
}

function seededRank(seed: string, id: string) {
  let hash = 2166136261;
  const input = `${seed}:${id}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function sortMedia(media: Media[], mode: MediaSortMode, seed = "album"): Media[] {
  const items = [...media];
  const compare = (left: Media, right: Media) => {
    switch (mode) {
      case "smart": {
        const leftFeatured = left.featured_rank ?? 0;
        const rightFeatured = right.featured_rank ?? 0;
        if (leftFeatured !== rightFeatured) return rightFeatured - leftFeatured;
        const leftDate = sortDate(left);
        const rightDate = sortDate(right);
        if (leftDate || rightDate) return rightDate - leftDate || stableTie(left, right);
        return stableTie(left, right);
      }
      case "manual":
        return stableTie(left, right);
      case "taken_desc":
        return timestamp(right.taken_at ?? right.sort_date) - timestamp(left.taken_at ?? left.sort_date) || stableTie(left, right);
      case "taken_asc":
        return timestamp(left.taken_at ?? left.sort_date) - timestamp(right.taken_at ?? right.sort_date) || stableTie(left, right);
      case "uploaded_desc":
        return timestamp(right.uploaded_at ?? right.created_at) - timestamp(left.uploaded_at ?? left.created_at) || stableTie(left, right);
      case "uploaded_asc":
        return timestamp(left.uploaded_at ?? left.created_at) - timestamp(right.uploaded_at ?? right.created_at) || stableTie(left, right);
      case "filename_asc":
        return filename(left).localeCompare(filename(right)) || stableTie(left, right);
      case "filename_desc":
        return filename(right).localeCompare(filename(left)) || stableTie(left, right);
      case "portrait_first":
        return orientationRank(left, "portrait") - orientationRank(right, "portrait") || stableTie(left, right);
      case "landscape_first":
        return orientationRank(left, "landscape") - orientationRank(right, "landscape") || stableTie(left, right);
      case "aspect_group":
        return aspectGroup(left) - aspectGroup(right) || stableTie(left, right);
      case "type":
        return left.media_type.localeCompare(right.media_type) || stableTie(left, right);
      case "liked_desc":
        return (right.like_count ?? 0) - (left.like_count ?? 0) || stableTie(left, right);
      case "commented_desc":
        return (right.comment_count ?? 0) - (left.comment_count ?? 0) || stableTie(left, right);
      case "viewed_desc":
        return (right.view_count ?? 0) - (left.view_count ?? 0) || stableTie(left, right);
      case "featured":
        return (right.featured_rank ?? 0) - (left.featured_rank ?? 0) || stableTie(left, right);
      case "shuffle":
        return seededRank(seed, left.id) - seededRank(seed, right.id);
      default:
        return stableTie(left, right);
    }
  };

  return items.sort(compare);
}
