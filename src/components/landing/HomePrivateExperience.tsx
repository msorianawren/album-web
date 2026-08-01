import Link from "next/link";
import { Lock } from "lucide-react";
import type { Album } from "@/lib/types";

export function HomePrivateExperience({ albums }: { albums: Album[] }) {
  const publicCovers = albums.filter((album) => album.status === "public" && album.cover_url).slice(0, 2);

  return (
    <section className="lcb-threshold" aria-labelledby="private-experience-heading">
      <div className="lcb-threshold__public">
        <p className="lcb-kicker">Open collection</p>
        <h2 id="private-experience-heading">Public Journals</h2>
        <div className="lcb-threshold__prints" aria-hidden="true">
          {publicCovers.map((album, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={album.id} src={album.cover_url!} alt="" loading="lazy" data-print={index + 1} />
          ))}
        </div>
      </div>

      <div className="lcb-threshold__private">
        <p className="lcb-kicker"><Lock aria-hidden="true" /> Discreet access</p>
        <h2>Private Archives</h2>
        <p>Exclusive client work and personal collections are protected to ensure discretion. Authenticate with your Google account, then request access to the albums you would like to view.</p>
        <Link href="/albums?status=private" prefetch={false} className="lcb-text-link">Request archive access</Link>
      </div>
    </section>
  );
}
