import { createFileRoute } from "@tanstack/react-router";
import { renderTierListOpenGraphImage } from "@/app/share/[shareId]/opengraph-image";
import { getPublicTierList } from "@/lib/share-metadata";

export const Route = createFileRoute("/lists/$id/opengraph-image")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        renderTierListOpenGraphImage(await getPublicTierList(params.id)),
    },
  },
});
