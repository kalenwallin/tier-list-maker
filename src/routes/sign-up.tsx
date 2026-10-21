import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { SignInForm } from "@/components/SignInForm";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Create an account | Tier List Maker" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <DirectionalTransition>
      <AppShell hideSignedOutActions>
        <SignInForm initialMode="signUp" />
      </AppShell>
    </DirectionalTransition>
  );
}
