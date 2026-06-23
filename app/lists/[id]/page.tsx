import { AppShell } from "@/components/AppShell";
import { NewTierListClient } from "@/components/NewTierListClient";
import { TierListEditor } from "@/components/TierListEditor";

export default async function ListEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <AppShell hideSignOut>
        <NewTierListClient />
      </AppShell>
    );
  }

  return (
    <AppShell hideSignedOutActions hideSignOut>
      <TierListEditor id={id} />
    </AppShell>
  );
}
