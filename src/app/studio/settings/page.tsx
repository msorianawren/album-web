import { SettingsCenter } from "@/components/studio/SettingsCenter";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicSession } from "@/lib/auth";
import { getSystemHealth } from "@/lib/studio-data";

export default async function StudioSettingsPage() {
  const session = await getPublicSession();
  const [settings, systemHealth] = await Promise.all([getSiteSettings(), getSystemHealth(session)]);

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Edit runtime site settings safely. Environment-managed values are read-only and masked."
      />
      <SettingsCenter initialSettings={settings} systemHealth={systemHealth} />
    </div>
  );
}
