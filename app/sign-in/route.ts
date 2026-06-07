import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { getWorkOSRedirectUri } from "@/lib/server/workos";
import { redirect } from "next/navigation";

export async function GET() {
  const signInUrl = await getSignInUrl({
    redirectUri: getWorkOSRedirectUri(),
    returnTo: "/dashboard",
  });
  redirect(signInUrl);
}
