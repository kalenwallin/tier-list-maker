"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";

export function AuthNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return <span className="button button-secondary">Loading...</span>;
  }

  if (user) {
    return (
      <a className="button button-secondary" href="/auth/signout">
        Sign out
      </a>
    );
  }

  return (
    <>
      <a className="button" href="/sign-in">
        Sign in
      </a>
      <a className="button primary" href="/sign-up">
        Sign up
      </a>
    </>
  );
}
