import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { NewTierListClient } from "@/components/NewTierListClient";

export const Route = createFileRoute("/lists/new")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: NewTierListPage,
});

function NewTierListPage() {
  return (
    <DirectionalTransition>
      <AppShell hideSignOut>
        <NewTierListClient />
      </AppShell>
    </DirectionalTransition>
  );
}
