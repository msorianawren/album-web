import { z } from "zod";

export const albumSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional().nullable(),
  is_public: z.boolean().default(true),
  owner_id: z.string().uuid().optional(),
});

export const albumUpdateSchema = albumSchema
  .omit({ owner_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const supportedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/avif",
] as const;

export const maxUploadSize = 50 * 1024 * 1024;
