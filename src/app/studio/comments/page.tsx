import { CommentsModeration } from "@/components/studio/CommentsModeration";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getStudioAlbums, getStudioComments } from "@/lib/studio-data";

export default async function StudioCommentsPage() {
  const [comments, albums] = await Promise.all([getStudioComments(300), getStudioAlbums(300)]);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Moderation"
        title="Comments"
        description="Filter, hide, restore, bulk moderate, and delete comments. Comment text is rendered safely."
      />
      <CommentsModeration initialComments={comments} albums={albums} />
    </div>
  );
}
