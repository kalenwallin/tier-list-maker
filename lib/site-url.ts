export const DEFAULT_PRODUCTION_URL = "https://tierlistmaker.win";

export function getPublicEnv(name: keyof ImportMetaEnv) {
  const viteValue = import.meta.env[name];
  if (viteValue) return viteValue;

  if (typeof process !== "undefined") {
    return process.env[name];
  }

  return undefined;
}

export function getSiteUrl() {
  const fallbackUrl =
    import.meta.env.PROD
      ? DEFAULT_PRODUCTION_URL
      : "http://localhost:3000";

  const rawUrl =
    getPublicEnv("NEXT_PUBLIC_SITE_URL") ??
    getPublicEnv("NEXT_PUBLIC_APP_URL") ??
    fallbackUrl;

  return (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(
    /\/$/,
    "",
  );
}
