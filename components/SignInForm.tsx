"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type Mode = "signIn" | "signUp" | "emailCode" | "resetPassword";

// What the emailed code completes once it's entered.
type CodePurpose = "emailCode" | "verifyEmail" | "resetPassword";

const MODES: Record<
  Mode,
  {
    title: string;
    description: string;
    submitLabel: string;
    error: string;
    codePurpose: CodePurpose;
  }
> = {
  signIn: {
    title: "Sign in",
    description: "Sync your tier lists across devices and share view-only links.",
    submitLabel: "Sign in",
    error:
      "That email and password didn't match. Try again, use an email code, or reset your password.",
    // Accounts that never confirmed their email get a code instead of a session.
    codePurpose: "verifyEmail",
  },
  signUp: {
    title: "Create an account",
    description: "Sync your tier lists across devices and share view-only links.",
    submitLabel: "Create account",
    error: "Couldn't create that account. If you already have one, sign in instead.",
    codePurpose: "verifyEmail",
  },
  emailCode: {
    title: "Sign in with an email code",
    description: "We'll email you an 8-digit code. No password needed.",
    submitLabel: "Send code",
    error: "Couldn't send a code to that email. Check the address and try again.",
    codePurpose: "emailCode",
  },
  resetPassword: {
    title: "Reset your password",
    description: "We'll email you a code so you can choose a new password.",
    submitLabel: "Send code",
    error: "Couldn't send a reset code to that email. Check the address and try again.",
    codePurpose: "resetPassword",
  },
};

const CODE_ERROR = "That code didn't work. Check it and try again, or start over for a new one.";
const MIN_PASSWORD_LENGTH = 8;

export function SignInForm({ initialMode }: { initialMode: "signIn" | "signUp" }) {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pendingCode, setPendingCode] = useState<{
    email: string;
    purpose: CodePurpose;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = MODES[mode];

  useEffect(() => {
    if (isAuthenticated) void navigate({ to: "/dashboard", replace: true });
  }, [isAuthenticated, navigate]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setPendingCode(null);
    setError(null);
  }

  async function requestStep(email: string, password: string) {
    switch (mode) {
      case "signIn":
        return await signIn("password", { flow: "signIn", email, password });
      case "signUp":
        return await signIn("password", { flow: "signUp", email, password });
      case "emailCode":
        return await signIn("email-code", { email });
      case "resetPassword":
        return await signIn("password", { flow: "reset", email });
    }
  }

  async function redeemCode(
    { email, purpose }: { email: string; purpose: CodePurpose },
    code: string,
    newPassword: string,
  ) {
    switch (purpose) {
      case "emailCode":
        return await signIn("email-code", { email, code });
      case "verifyEmail":
        return await signIn("password", { flow: "email-verification", email, code });
      case "resetPassword":
        return await signIn("password", {
          flow: "reset-verification",
          email,
          code,
          newPassword,
        });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "");
    setError(null);
    setIsSubmitting(true);

    try {
      if (pendingCode) {
        const { signingIn } = await redeemCode(
          pendingCode,
          field("code").trim(),
          field("newPassword"),
        );
        if (!signingIn) setError(CODE_ERROR);
        return;
      }

      const email = field("email").trim().toLowerCase();
      const { signingIn } = await requestStep(email, field("password"));
      if (!signingIn) setPendingCode({ email, purpose: copy.codePurpose });
    } catch {
      setError(pendingCode ? CODE_ERROR : copy.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel panel-pad auth-panel">
      <h1>{pendingCode ? "Check your email" : copy.title}</h1>
      <p className="muted">
        {pendingCode
          ? `Enter the 8-digit code we sent to ${pendingCode.email}.`
          : copy.description}
      </p>
      <form key={pendingCode ? "code" : mode} onSubmit={(event) => void handleSubmit(event)}>
        {pendingCode ? (
          <>
            <label className="form-row">
              <span className="label">Code</span>
              <input
                autoComplete="one-time-code"
                className="input"
                inputMode="numeric"
                maxLength={8}
                name="code"
                pattern="[0-9]{8}"
                required
              />
            </label>
            {pendingCode.purpose === "resetPassword" ? (
              <label className="form-row">
                <span className="label">New password</span>
                <input
                  autoComplete="new-password"
                  className="input"
                  minLength={MIN_PASSWORD_LENGTH}
                  name="newPassword"
                  required
                  type="password"
                />
              </label>
            ) : null}
          </>
        ) : (
          <>
            <label className="form-row">
              <span className="label">Email</span>
              <input
                autoComplete="email"
                className="input"
                name="email"
                required
                type="email"
              />
            </label>
            {mode === "signIn" || mode === "signUp" ? (
              <label className="form-row">
                <span className="label">Password</span>
                <input
                  autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                  className="input"
                  minLength={mode === "signUp" ? MIN_PASSWORD_LENGTH : undefined}
                  name="password"
                  required
                  type="password"
                />
              </label>
            ) : null}
          </>
        )}
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button primary auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 size={16} /> : null}
          {pendingCode
            ? pendingCode.purpose === "resetPassword"
              ? "Set password"
              : "Continue"
            : copy.submitLabel}
        </button>
      </form>
      <div className="auth-links">
        {pendingCode ? (
          <button className="text-button" onClick={() => switchMode(mode)} type="button">
            Start over
          </button>
        ) : null}
        {!pendingCode && mode === "signIn" ? (
          <>
            <button
              className="text-button"
              onClick={() => switchMode("emailCode")}
              type="button"
            >
              Email me a code instead
            </button>
            <button
              className="text-button"
              onClick={() => switchMode("resetPassword")}
              type="button"
            >
              Forgot password?
            </button>
            <button className="text-button" onClick={() => switchMode("signUp")} type="button">
              Create an account
            </button>
          </>
        ) : null}
        {!pendingCode && mode !== "signIn" ? (
          <button className="text-button" onClick={() => switchMode("signIn")} type="button">
            {mode === "signUp" ? "Already have an account? Sign in" : "Sign in with a password"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
