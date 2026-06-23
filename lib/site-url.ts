export function getSiteUrl() {
  const fallbackUrl =
    process.env.NODE_ENV === "production"
      ? "https://tier-listmaker.netlify.app"
      : "http://localhost:3000";

  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    fallbackUrl;

  return rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
}
