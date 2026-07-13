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

export function getWorkOSRedirectUri() {
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

  return new URL("/callback", "http://localhost:3000").toString();
}
