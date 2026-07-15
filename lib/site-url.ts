export const DEFAULT_PRODUCTION_URL = "https://tierlistmaker.win";

const CLOUDFLARE_WORKERS_HOST_SUFFIX = ".workers.dev";

export function getPublicEnv(name: keyof ImportMetaEnv) {
  const viteValue = import.meta.env[name];
  if (viteValue) return viteValue;

  if (typeof process !== "undefined") {
    return process.env[name];
  }

  return undefined;
}

export function getSiteUrl() {
  const fallbackUrl = import.meta.env.PROD
    ? DEFAULT_PRODUCTION_URL
    : "http://localhost:3000";

  const rawUrl =
    getPublicEnv("NEXT_PUBLIC_SITE_URL") ??
    getPublicEnv("NEXT_PUBLIC_APP_URL") ??
    fallbackUrl;

  const siteUrl = (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(
    /\/$/,
    "",
  );

  if (
    import.meta.env.PROD &&
    new URL(siteUrl).hostname.toLowerCase().endsWith(CLOUDFLARE_WORKERS_HOST_SUFFIX)
  ) {
    return DEFAULT_PRODUCTION_URL;
  }

  return siteUrl;
}

export function getShareUrl(shareId: string) {
  return `${getSiteUrl()}/share/${encodeURIComponent(shareId)}`;
}
