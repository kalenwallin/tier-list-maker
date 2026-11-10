import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { HomeClient } from "@/components/HomeClient";
import { hasAuthCookie } from "@/lib/auth-cookie";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/")({
  head: () => ({ links: [{ rel: "canonical", href: `${getSiteUrl()}/` }] }),
  // Runs on the server for full page loads and in the browser for in-app
  // navigation, so signed-in visitors never see the landing page.
  beforeLoad: () => {
    if (hasAuthCookie()) throw redirect({ to: "/dashboard", replace: true });
  },
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
