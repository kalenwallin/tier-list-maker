const PRODUCTION_APP_URL = "https://tier-listmaker.netlify.app";

export function getWorkOSBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production" ? PRODUCTION_APP_URL : undefined)
  );
}

export function getWorkOSRedirectUri() {
  const appUrl = getWorkOSBaseUrl();

  if (appUrl) {
    return new URL("/callback", appUrl).toString();
  }

  const configuredRedirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  if (configuredRedirectUri) {
    const url = new URL(configuredRedirectUri);
    url.pathname = "/callback";
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  return new URL("/callback", "http://localhost:3000").toString();
}
