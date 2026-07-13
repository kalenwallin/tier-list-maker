import { createFileRoute } from "@tanstack/react-router";
import { getSignUpUrl } from "@workos/authkit-tanstack-react-start";

export const Route = createFileRoute("/sign-up")({
  server: {
    handlers: {
      GET: async () => {
        const url = await getSignUpUrl({ data: { returnPathname: "/dashboard" } });
        return new Response(null, {
          status: 307,
          headers: { Location: url },
        });
      },
    },
  },
});
