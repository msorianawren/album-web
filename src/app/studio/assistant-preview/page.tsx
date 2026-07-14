import { AssistantMascotPreview } from "@/components/assistant/AssistantMascotPreview";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";

export default function StudioAssistantPreviewPage() {
  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Internal Preview"
        title="Oriana Companion"
        description="Inspect the first mascot asset pack and mood rendering foundation. This page is protected by the existing Studio admin layout."
      />
      <AssistantMascotPreview />
    </div>
  );
}
