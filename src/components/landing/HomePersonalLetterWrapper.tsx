import { getAboutProfile } from "@/lib/about";
import { HomePersonalLetter } from "@/components/landing/HomePersonalLetter";

export async function HomePersonalLetterWrapper() {
  const profile = await getAboutProfile();
  return <HomePersonalLetter profile={profile} />;
}
