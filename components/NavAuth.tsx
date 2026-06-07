"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";

export function NavAuth() {
  const { user, loading, refreshAuth } = useAuth();

  if (loading) {
    return <span className="button button-secondary">Loading...</span>;
  }

  if (user) {
    return (
      <form
        action={async () => {
          // Sign out by navigating to the signout endpoint
          window.location.href = "/auth/signout";
        }}
      >
        <button type="submit" className="button button-secondary">
          Sign out
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      className="button"
      onClick={() => void refreshAuth({ ensureSignedIn: true })}
    >
      Sign in
    </button>
  );
}
