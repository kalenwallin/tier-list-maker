import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { getCanonicalRedirect } from "@/lib/canonical-redirect";

export default createServerEntry({
  fetch(request, opts) {
    return getCanonicalRedirect(request) ?? handler.fetch(request, opts);
  },
});
