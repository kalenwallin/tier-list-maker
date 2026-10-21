"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

export function AuthNav({
  hideSignOut = false,
  hideSignedOutActions = false,
  signedOutPrimaryHref = "/sign-up",
  signedOutPrimaryLabel = "Sign Up",
}: {
  hideSignOut?: boolean;
  hideSignedOutActions?: boolean;
  signedOutPrimaryHref?: "/sign-up" | "/lists/new";
  signedOutPrimaryLabel?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  if (isLoading) {
    if (hideSignedOutActions) {
      return null;
    }

    return <span className="button button-secondary">Loading...</span>;
  }

  if (isAuthenticated) {
    if (hideSignOut) {
      return null;
    }

    return (
      <button
        className="button button-secondary"
        onClick={() => void signOut().then(() => navigate({ to: "/" }))}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return hideSignedOutActions ? null : (
    <>
      <Link className="button" to="/sign-in">
        Sign in
      </Link>
      <Link className="button primary" to={signedOutPrimaryHref}>
        {signedOutPrimaryLabel}
      </Link>
    </>
  );
}
