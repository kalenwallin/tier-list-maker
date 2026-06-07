import { handleAuth } from "@workos-inc/authkit-nextjs";
import { getWorkOSBaseUrl } from "@/lib/server/workos";

export const GET = handleAuth({ baseURL: getWorkOSBaseUrl() });
