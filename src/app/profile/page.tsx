import { getLandingPage } from "@/lib/landing";
import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "My Profile & Rules",
  description: "View your memory album progress and site settings.",
};

export default async function ProfilePage() {
  const landing = await getLandingPage();
  
  return (
    <ProfileClient config={landing?.background_settings || {}} />
  );
}
