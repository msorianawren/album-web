import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { UploadManager } from "@/components/studio/UploadManager";
import { getSiteSettings } from "@/lib/site-settings";
import { getStudioAlbums, getStudioMedia } from "@/lib/studio-data";

export default async function StudioUploadsPage() {
  const [albums, recentMedia, settings] = await Promise.all([
    getStudioAlbums(300),
    getStudioMedia(24),
    getSiteSettings(),
  ]);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Upload manager"
        title="Uploads"
        description="Select an album, validate files, upload images and videos, and review partial successes safely."
      />
      <UploadManager albums={albums} recentMedia={recentMedia} settings={settings} />
    </div>
  );
}
