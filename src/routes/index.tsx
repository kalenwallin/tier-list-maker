import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { HomeClient } from "@/components/HomeClient";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/")({
  head: () => ({ links: [{ rel: "canonical", href: `${getSiteUrl()}/` }] }),
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
