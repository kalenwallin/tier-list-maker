import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { SignInForm } from "@/components/SignInForm";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign in | Tier List Maker" }] }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <DirectionalTransition>
      <AppShell hideSignedOutActions>
        <SignInForm initialMode="signIn" />
      </AppShell>
    </DirectionalTransition>
  );
}
