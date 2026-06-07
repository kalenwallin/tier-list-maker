import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { getWorkOSRedirectUri } from "@/lib/server/workos";
import { redirect } from "next/navigation";

export async function GET() {
  const signUpUrl = await getSignUpUrl({
    redirectUri: getWorkOSRedirectUri(),
    returnTo: "/dashboard",
  });
  redirect(signUpUrl);
}
