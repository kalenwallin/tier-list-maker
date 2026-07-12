import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
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
      <DirectionalTransition>
        <AppShell hideSignOut>
          <NewTierListClient />
        </AppShell>
      </DirectionalTransition>
    );
  }

  return (
    <DirectionalTransition>
      <AppShell hideSignedOutActions hideSignOut>
        <TierListEditor id={id} key={id} previewMode={mode === "preview"} />
      </AppShell>
    </DirectionalTransition>
  );
}
