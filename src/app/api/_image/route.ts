import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { normalizeMediaDeliveryUrl } from "@/lib/media/delivery";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const widthStr = req.nextUrl.searchParams.get("w");
  const qualityStr = req.nextUrl.searchParams.get("q");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  const normalizedUrl = normalizeMediaDeliveryUrl(url) || url;

  let width = widthStr ? parseInt(widthStr, 10) : undefined;
  const quality = qualityStr ? parseInt(qualityStr, 10) : 75;

  if (width && (isNaN(width) || width <= 0)) width = undefined;
  if (isNaN(quality) || quality <= 0 || quality > 100) return new NextResponse("Invalid quality", { status: 400 });

  try {
    const fetchResponse = await fetch(normalizedUrl, {
      // Don't forward cookies or authorization to external sources unless necessary
      // For R2 public URLs, this is fine.
    });

    if (!fetchResponse.ok) {
      return new NextResponse(`Failed to fetch upstream image: ${fetchResponse.status}`, { status: fetchResponse.status });
    }

    const buffer = await fetchResponse.arrayBuffer();

    try {
      let sharpInstance = sharp(Buffer.from(buffer));

      if (width) {
        sharpInstance = sharpInstance.resize({
          width,
          withoutEnlargement: true,
        });
      }

      // Try to serve webp
      const accept = req.headers.get("accept") || "";
      let format: "webp" | "jpeg" | "png" | "avif" = "jpeg";
      
      if (accept.includes("image/avif")) {
        format = "avif";
        sharpInstance = sharpInstance.avif({ quality });
      } else if (accept.includes("image/webp")) {
        format = "webp";
        sharpInstance = sharpInstance.webp({ quality });
      } else {
        sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
      }

      const optimizedBuffer = await sharpInstance.toBuffer();

      return new NextResponse(new Uint8Array(optimizedBuffer), {
        headers: {
          "Content-Type": `image/${format}`,
          "Cache-Control": "public, max-age=31536000, immutable", // Cache heavily on CDN
        },
      });
    } catch (sharpError) {
      console.warn("Sharp optimization failed, falling back to original image:", sharpError);
      const contentType = fetchResponse.headers.get("content-type") || "application/octet-stream";
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (error) {
    console.error("Internal image optimization error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
