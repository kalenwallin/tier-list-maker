import {
  DEFAULT_PRODUCTION_URL,
  getPublicEnv,
} from "@/lib/site-url";

export function getWorkOSBaseUrl() {
  return (
    getPublicEnv("NEXT_PUBLIC_APP_URL") ??
    getPublicEnv("NEXT_PUBLIC_SITE_URL") ??
    (import.meta.env.PROD ? DEFAULT_PRODUCTION_URL : undefined)
  );
}

export function getWorkOSRedirectUri(request?: Request) {
  const requestRedirectUri = getDevelopmentRequestRedirectUri(request);
  if (requestRedirectUri) return requestRedirectUri;

  const configuredRedirectUri =
    process.env.WORKOS_REDIRECT_URI ??
    getPublicEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI");
  if (configuredRedirectUri) {
    const url = new URL(configuredRedirectUri);
    url.pathname = "/callback";
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  const appUrl = getWorkOSBaseUrl();

  if (appUrl) {
    return new URL("/callback", appUrl).toString();
  }

  return new URL("/callback", "http://localhost:3001").toString();
}

function getDevelopmentRequestRedirectUri(request?: Request) {
  if (!request || import.meta.env.PROD) return undefined;

  const requestUrl = new URL(request.url);
  if (!isTrustedDevelopmentHostname(requestUrl.hostname)) return undefined;

  return new URL("/callback", requestUrl.origin).toString();
}

function isTrustedDevelopmentHostname(hostname: string) {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "");

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".ts.net")
  ) {
    return true;
  }

  if (normalizedHostname.startsWith("fd7a:115c:a1e0:")) {
    return true;
  }

  const octets = normalizedHostname.split(".").map(Number);
  return (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
    octets[0] === 100 &&
    octets[1] >= 64 &&
    octets[1] <= 127
  );
}
