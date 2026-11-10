"use client";

import { useItemImageSrc } from "@/lib/local-item-images";

// An item's image, or its initial when it has none. Handles images kept in
// this browser for signed-out lists as well as image links.
export function ItemImage({
  draggable,
  imageUrl,
  label,
}: {
  draggable?: boolean;
  imageUrl: string | undefined;
  label: string;
}) {
  const src = useItemImageSrc(imageUrl);

  if (src) return <img alt="" draggable={draggable} src={src} />;
  // An image kept in this browser is still being read. Exports wait for these;
  // see renderTierListPng.
  if (src === undefined && imageUrl) return <span data-item-image-loading="true" />;
  return label.slice(0, 1).toUpperCase();
}
