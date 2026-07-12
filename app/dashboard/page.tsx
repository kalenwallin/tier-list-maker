import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { DirectionalTransition } from "@/components/DirectionalTransition";

export default function DashboardPage() {
  return (
    <DirectionalTransition>
      <AppShell hideDashboard>
        <DashboardClient />
      </AppShell>
    </DirectionalTransition>
  );
}
