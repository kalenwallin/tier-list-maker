import { createFileRoute } from "@tanstack/react-router";
import { getSignUpUrl } from "@workos/authkit-tanstack-react-start";
import { getWorkOSRedirectUri } from "@/lib/server/workos";

export const Route = createFileRoute("/sign-up")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = await getSignUpUrl({
          data: {
            redirectUri: getWorkOSRedirectUri(request),
            returnPathname: "/dashboard",
          },
        });
        return new Response(null, {
          status: 307,
          headers: { Location: url },
        });
      },
    },
  },
});
