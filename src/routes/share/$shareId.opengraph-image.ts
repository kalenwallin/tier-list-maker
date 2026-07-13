import { createFileRoute } from "@tanstack/react-router";
import { renderShareOpenGraphImage } from "@/app/share/[shareId]/opengraph-image";

export const Route = createFileRoute("/share/$shareId/opengraph-image")({
  server: {
    handlers: {
      GET: async ({ params }) => renderShareOpenGraphImage(params.shareId),
    },
  },
});
