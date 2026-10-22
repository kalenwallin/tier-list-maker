import { createFileRoute } from "@tanstack/react-router";
import { renderTierListOpenGraphImage } from "@/app/share/[shareId]/opengraph-image";
import { getSharedTierList } from "@/lib/share-metadata";

export const Route = createFileRoute("/share/$shareId/opengraph-image")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        renderTierListOpenGraphImage(await getSharedTierList(params.shareId)),
    },
  },
});
