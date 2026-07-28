export class FacebookFeedInputError extends Error {}

export function validateFacebookPosterUrl(input: string, r2PublicUrl = process.env.R2_PUBLIC_URL): string {
  let poster: URL;
  let allowedOrigin: URL;
  try {
    poster = new URL(input.trim());
    allowedOrigin = new URL(r2PublicUrl ?? "");
  } catch {
    throw new FacebookFeedInputError("Upload a poster to the project media library before saving this item.");
  }
  if (
    poster.protocol !== "https:" || poster.username || poster.password || poster.port || poster.origin !== allowedOrigin.origin ||
    poster.pathname === "/"
  ) {
    throw new FacebookFeedInputError("Use a poster uploaded to the project media library.");
  }
  return poster.toString();
}
