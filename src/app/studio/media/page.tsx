import { MediaLibrary } from "@/components/studio/MediaLibrary";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getStudioAlbums, getStudioMedia } from "@/lib/studio-data";

export default async function StudioMediaPage() {
  const [media, albums] = await Promise.all([getStudioMedia(400), getStudioAlbums(300)]);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Media library"
        title="Media Library"
        description="Browse, preview, copy URLs, edit metadata, set covers, move media, and delete R2-backed assets."
      />
      <MediaLibrary initialMedia={media} albums={albums} />
    </div>
  );
}
