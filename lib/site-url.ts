export const DEFAULT_PRODUCTION_URL = "https://tierlistmaker.win";

export function getSiteUrl() {
  const fallbackUrl =
    process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_URL
      : "http://localhost:3000";

  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    fallbackUrl;

  return (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(
    /\/$/,
    "",
  );
}
