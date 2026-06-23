import { AppShell } from "@/components/AppShell";
import { NewTierListClient } from "@/components/NewTierListClient";

export default function NewTierListPage() {
  return (
    <AppShell hideSignOut>
      <NewTierListClient />
    </AppShell>
  );
}
