import { getLandingPage } from "@/lib/landing";
import { getPublicSession, getUserProfile } from "@/lib/auth";
import { getAssistantPreferencesFromMetadata } from "@/lib/assistant/preferences";
import { getEnvironmentPreferencesFromMetadata } from "@/lib/environment/preferences";
import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "My Profile & Rules",
  description: "View your memory album progress and site settings.",
};

export default async function ProfilePage() {
  const [landing, session] = await Promise.all([
    getLandingPage(),
    getPublicSession(),
  ]);
  const profile = session.userId ? await getUserProfile(session.userId) : null;
  
  return (
    <ProfileClient
      config={landing?.background_settings || {}}
      userId={session.userId}
      initialAssistantPreferences={getAssistantPreferencesFromMetadata(profile?.metadata)}
      initialEnvironmentPreferences={getEnvironmentPreferencesFromMetadata(profile?.metadata)}
    />
  );
}
