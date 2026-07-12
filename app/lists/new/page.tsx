import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { NewTierListClient } from "@/components/NewTierListClient";

export default function NewTierListPage() {
  return (
    <DirectionalTransition>
      <AppShell hideSignOut>
        <NewTierListClient />
      </AppShell>
    </DirectionalTransition>
  );
}
