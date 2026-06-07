import { AppShell } from "@/components/AppShell";
import { TierListEditor } from "@/components/TierListEditor";

export default async function ListEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <TierListEditor id={id} />
    </AppShell>
  );
}
