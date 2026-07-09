# Cloudflare R2 CORS Configuration

To support direct browser uploads to your Cloudflare R2 storage bucket, you must configure Cross-Origin Resource Sharing (CORS) rules on the bucket. Without this, browsers will block PUT requests with a CORS policy error.

## Recommended CORS Configuration

Apply the following JSON CORS rule in your Cloudflare R2 Bucket settings (under the **Settings** tab -> **CORS Policy**):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.vercel.app"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

> [!IMPORTANT]
> Make sure to replace `https://your-production-domain.vercel.app` with the actual custom or Vercel deployment URL of your website (`NEXT_PUBLIC_SITE_URL`).
> Do not use wildcard (`*`) origins in production for better security unless configuration limits force it.

## Troubleshooting

If you see errors like `Network error during direct storage upload` or `Storage server returned status 403/0` in the Studio dashboard:
1. Ensure the `AllowedOrigins` includes the exact protocol and port (e.g. `http://localhost:3000` for development).
2. Ensure the `AllowedMethods` includes `PUT`.
3. Ensure `AllowedHeaders` includes `Content-Type` (which is required since we pass the file's mime type as header).
