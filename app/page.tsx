import { HomeClient } from "@/components/HomeClient";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";

export default function Home() {
  return (
    <DirectionalTransition>
      <AppShell
        dashboardTransitionType="nav-forward"
        signedOutPrimaryHref="/lists/new"
        signedOutPrimaryLabel="Get Started"
      >
        <HomeClient />
      </AppShell>
    </DirectionalTransition>
  );
}
