const cacheProxy = {
  async fetch(request: Request, _env: Record<string, never>, ctx: ExecutionContext): Promise<Response> {
    // Pass through if not a GET request
    if (request.method !== "GET") {
      return fetch(request);
    }

    // Try to fetch from the cache first
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      // If not in cache, fetch from origin (Vercel)
      response = await fetch(request);

      // Only cache successful image/media responses
      if (response.status === 200 && response.headers.has("Content-Type")) {
        const contentType = response.headers.get("Content-Type") || "";
        
        // Ensure it's an image or media file (from /_next/image or /api/media)
        if (contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/")) {
          // Clone the response to modify headers
          response = new Response(response.body, response);
          
          // Overwrite Cache-Control to aggressively cache at the Edge for 1 year
          response.headers.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
          
          // Delete Next.js specific headers that might prevent caching
          response.headers.delete("x-vercel-cache");
          response.headers.delete("x-middleware-cache");
          
          // Put in Cloudflare Edge Cache for subsequent requests
          ctx.waitUntil(cache.put(request, response.clone()));
        }
      }
    }

    return response;
  }
};

export default cacheProxy;
