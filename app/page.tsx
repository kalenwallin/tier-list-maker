import { HomeClient } from "@/components/HomeClient";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <AppShell
      signedOutPrimaryHref="/lists/new"
      signedOutPrimaryLabel="Get Started"
    >
      <HomeClient />
    </AppShell>
  );
}
