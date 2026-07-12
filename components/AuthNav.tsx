"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import Link from "next/link";

export function AuthNav({
  hideSignOut = false,
  hideSignedOutActions = false,
  signedOutPrimaryHref = "/sign-up",
  signedOutPrimaryLabel = "Sign Up",
}: {
  hideSignOut?: boolean;
  hideSignedOutActions?: boolean;
  signedOutPrimaryHref?: string;
  signedOutPrimaryLabel?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    if (hideSignedOutActions) {
      return null;
    }

    return <span className="button button-secondary">Loading...</span>;
  }

  if (user) {
    if (hideSignOut) {
      return null;
    }

    return (
      <a className="button button-secondary" href="/auth/signout">
        Sign out
      </a>
    );
  }

  return hideSignedOutActions ? null : (
    <>
      <a className="button" href="/sign-in">
        Sign in
      </a>
      {signedOutPrimaryHref === "/lists/new" ? (
        <Link
          className="button primary"
          href={signedOutPrimaryHref}
          transitionTypes={["nav-forward"]}
        >
          {signedOutPrimaryLabel}
        </Link>
      ) : (
        <a className="button primary" href={signedOutPrimaryHref}>
          {signedOutPrimaryLabel}
        </a>
      )}
    </>
  );
}
