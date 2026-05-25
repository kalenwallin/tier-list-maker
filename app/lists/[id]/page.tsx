import { Shell } from "@/components/Shell";
import { TierListEditor } from "@/components/TierListEditor";

export default async function ListEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Shell>
      <TierListEditor id={id} />
    </Shell>
  );
}
