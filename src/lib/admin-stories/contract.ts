import { z } from "zod";

export const ADMIN_STORY_COLUMNS = "id,video_url,video_r2_key,poster_url,poster_r2_key,caption,mime_type,file_size,width,height,duration_seconds,is_published,sort_order,created_by,created_at,updated_at";
export const STORY_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export const STORY_POSTER_MIME_TYPE = "image/webp";
export const STORY_ASPECT_RATIO = 9 / 16;
export const STORY_ASPECT_TOLERANCE = 0.05;
const uuidSource = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const STORY_KEY_PATTERN = new RegExp(`^landing/stories/(${uuidSource})/(video\\.(?:mp4|webm)|poster\\.webp)$`, "i");

const videoMetadataSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(STORY_VIDEO_MIME_TYPES),
  size: z.number().int().positive(),
  width: z.number().int().positive().max(16384),
  height: z.number().int().positive().max(16384),
  durationSeconds: z.number().finite().positive().max(24 * 60 * 60),
}).strict();

const posterMetadataSchema = z.object({
  filename: z.literal("poster.webp"),
  mimeType: z.literal(STORY_POSTER_MIME_TYPE),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  width: z.literal(720),
  height: z.literal(1280),
}).strict();

export const storyPresignSchema = z.object({ video: videoMetadataSchema, poster: posterMetadataSchema }).strict();
export const storyFinalizeSchema = z.object({
  storyId: z.string().uuid(),
  video: videoMetadataSchema.extend({ r2Key: z.string().regex(STORY_KEY_PATTERN) }).strict(),
  poster: posterMetadataSchema.extend({ r2Key: z.string().regex(STORY_KEY_PATTERN) }).strict(),
  caption: z.string().trim().max(300).optional().nullable(),
}).strict();
export const storyCancelSchema = z.object({
  storyId: z.string().uuid(),
  videoR2Key: z.string().regex(STORY_KEY_PATTERN),
  posterR2Key: z.string().regex(STORY_KEY_PATTERN),
}).strict();

export const storyPatchSchema = z.object({
  caption: z.string().trim().max(300).optional().nullable(),
  is_published: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const storyReorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict()
  .refine((value) => new Set(value.ids).size === value.ids.length, "Story IDs must be unique.");

export function isPortraitStory(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
  return Math.abs(width / height - STORY_ASPECT_RATIO) / STORY_ASPECT_RATIO <= STORY_ASPECT_TOLERANCE;
}

export function validateStoryLimits(video: z.infer<typeof videoMetadataSchema>, limits: { maxVideoSizeBytes: number; maxDurationSeconds: number }) {
  if (video.size > limits.maxVideoSizeBytes) return `Video exceeds the ${Math.floor(limits.maxVideoSizeBytes / 1024 / 1024)} MB limit.`;
  if (video.durationSeconds > limits.maxDurationSeconds) return `Video exceeds the ${limits.maxDurationSeconds}-second duration limit.`;
  if (!isPortraitStory(video.width, video.height)) return "Founder Stories must be vertical 9:16 video (within 5% tolerance).";
  return null;
}

export function keysBelongToStory(storyId: string, videoKey: string, posterKey: string) {
  const video = STORY_KEY_PATTERN.exec(videoKey);
  const poster = STORY_KEY_PATTERN.exec(posterKey);
  return Boolean(video && poster && video[1] === storyId && poster[1] === storyId && video[2].startsWith("video.") && poster[2] === "poster.webp");
}

export function isProjectMediaUrl(value: string, mediaOrigin: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === new URL(mediaOrigin).origin && STORY_KEY_PATTERN.test(url.pathname.replace(/^\//, ""));
  } catch { return false; }
}
