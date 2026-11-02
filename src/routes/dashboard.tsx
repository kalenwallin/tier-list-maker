import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { DirectionalTransition } from "@/components/DirectionalTransition";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <DirectionalTransition name="dashboard-content">
      <AppShell hideDashboard>
        <DashboardClient />
      </AppShell>
    </DirectionalTransition>
  );
}
