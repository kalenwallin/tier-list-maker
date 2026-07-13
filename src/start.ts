import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { authkitMiddleware } from "@workos/authkit-tanstack-react-start";
import { getWorkOSRedirectUri } from "@/lib/server/workos";

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [
    csrfMiddleware,
    authkitMiddleware({ redirectUri: getWorkOSRedirectUri() }),
  ],
}));
