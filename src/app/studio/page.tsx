import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { StudioDashboard } from "@/components/studio/StudioDashboard";
import { getAlbums } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";

export default async function StudioPage() {
  const session = await getPublicSession();

  if (!session.userId) redirect("/login");

  if (!session.isAdmin) {
    return (
      <main className="min-h-screen bg-background">
        <AppHeader />
        <section className="mx-auto flex min-h-[70vh] w-full max-w-[720px] flex-col justify-center px-4 text-center sm:px-8">
          <h1 className="text-3xl font-semibold text-text-primary">
            Studio access denied
          </h1>
          <p className="mt-4 text-text-secondary">
            This account is not authorized to manage albums.
          </p>
        </section>
      </main>
    );
  }

  const albums = await getAlbums();

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <StudioDashboard initialAlbums={albums} />
    </main>
  );
}
