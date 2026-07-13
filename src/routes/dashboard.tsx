import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { DirectionalTransition } from "@/components/DirectionalTransition";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <DirectionalTransition animateBackEntry={false}>
      <AppShell hideDashboard>
        <DashboardClient />
      </AppShell>
    </DirectionalTransition>
  );
}
