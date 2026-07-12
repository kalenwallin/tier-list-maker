import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// OpenNext currently supports Edge Middleware but not Next.js 16's Node.js
// proxy runtime, so keep this legacy filename until the adapter adds support.
export default authkitMiddleware();

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
