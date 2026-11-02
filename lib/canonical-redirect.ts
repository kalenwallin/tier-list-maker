import { DEFAULT_PRODUCTION_URL } from "./site-url";

const CANONICAL_HOSTNAME = new URL(DEFAULT_PRODUCTION_URL).hostname;
const WWW_HOSTNAME = `www.${CANONICAL_HOSTNAME}`;

// Search engines count `www` and plain HTTP as separate pages, so send both to
// the address the canonical tags name. Other hosts, such as localhost and
// preview URLs, pass through.
export function getCanonicalRedirect(request: Request) {
  const url = new URL(request.url);
  const isWww = url.hostname === WWW_HOSTNAME;
  const isPlainHttp =
    url.hostname === CANONICAL_HOSTNAME && url.protocol === "http:";
  if (!isWww && !isPlainHttp) return null;

  url.protocol = "https:";
  url.hostname = CANONICAL_HOSTNAME;
  return Response.redirect(url.href, 301);
}
