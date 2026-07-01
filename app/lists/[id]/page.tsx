import { AppShell } from "@/components/AppShell";
import { NewTierListClient } from "@/components/NewTierListClient";
import { TierListEditor } from "@/components/TierListEditor";

export default async function ListEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;

  if (id === "new") {
    return (
      <AppShell hideSignOut>
        <NewTierListClient />
      </AppShell>
    );
  }

  return (
    <AppShell hideSignedOutActions hideSignOut>
      <TierListEditor id={id} previewMode={mode === "preview"} />
    </AppShell>
  );
}
