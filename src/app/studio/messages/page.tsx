import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { listAdminHelpThreads, type HelpSource, type HelpStatus } from "@/lib/help-chat";
import { HelpMessageList } from "./HelpMessageList";

const statuses = new Set<HelpStatus>(["open", "waiting_admin", "waiting_user", "closed", "archived", "blocked"]);
const sources = new Set<HelpSource>(["assistant", "contact", "private_access", "system"]);

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; source?: string; q?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = statuses.has(params.status as HelpStatus) ? params.status as HelpStatus : undefined;
  const source = sources.has(params.source as HelpSource) ? params.source as HelpSource : undefined;
  const query = params.q?.trim().slice(0, 100) || undefined;
  const inbox = await listAdminHelpThreads({ page, status, source, query });
  return <div className="grid gap-5"><StudioPageHeader eyebrow="Inbox" title="Messages" description="Unified Contact and Oriana Companion conversations. Admin replies always appear publicly as Oriana Wren." /><HelpMessageList initialThreads={inbox.threads} page={inbox.page} total={inbox.total} pageSize={inbox.pageSize} status={status} source={source} query={query} /></div>;
}
