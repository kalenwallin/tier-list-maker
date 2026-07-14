import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { HomeClient } from "@/components/HomeClient";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <DirectionalTransition>
      <AppShell
        signedOutPrimaryHref="/lists/new"
        signedOutPrimaryLabel="Get Started"
      >
        <HomeClient />
      </AppShell>
    </DirectionalTransition>
  );
}
