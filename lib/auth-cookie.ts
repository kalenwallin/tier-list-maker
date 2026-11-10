import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

// Convex Auth keeps its tokens in localStorage, which the server can't see.
// This cookie only records that the browser has a session, so the server can
// send signed-in visitors from the landing page straight to the dashboard
// without a flash of the marketing page. It holds no credentials, and data
// access is still enforced by Convex.
export const AUTH_COOKIE_NAME = "tlm_signed_in";

// Renewed on every page load while signed in, so this only lapses after a
// month away. A stale cookie just lands someone on the dashboard, which works
// signed out and clears the cookie once auth finishes loading.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const hasAuthCookie = createIsomorphicFn()
  .server(() => getCookie(AUTH_COOKIE_NAME) === "1")
  .client(() =>
    document.cookie.split(";").some((part) => part.trim() === `${AUTH_COOKIE_NAME}=1`),
  );

export function setAuthCookie(isSignedIn: boolean) {
  if (typeof document === "undefined") return;

  const attributes = ["Path=/", "SameSite=Lax"];
  if (window.location.protocol === "https:") attributes.push("Secure");

  // biome-ignore lint/suspicious/noDocumentCookie: sign-out needs the write to land synchronously before navigating, and cookieStore is missing on older Safari and plain-HTTP dev hosts.
  document.cookie = isSignedIn
    ? [`${AUTH_COOKIE_NAME}=1`, `Max-Age=${MAX_AGE_SECONDS}`, ...attributes].join("; ")
    : [`${AUTH_COOKIE_NAME}=`, "Max-Age=0", ...attributes].join("; ");
}
