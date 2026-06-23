import { AppShell } from "@/components/AppShell";
import { SharedTierListView } from "@/components/SharedTierListView";

export default async function SharedTierListPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return (
    <AppShell>
      <SharedTierListView shareId={shareId} />
    </AppShell>
  );
}
