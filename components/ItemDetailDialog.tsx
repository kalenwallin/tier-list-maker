"use client";

import { ImageOff, ImageUp, Loader2, Trash2, X } from "lucide-react";
import { ClipboardEvent, useEffect, useId, useRef } from "react";
import {
  getHostedItemImageKey,
  getLocalItemImageKey,
  ITEM_IMAGE_ACCEPT,
} from "@/lib/item-images";
import {
  DEFAULT_ITEM_IMAGE_ASPECT_RATIO,
  ItemImageAspectRatio,
  Tier,
  TierItem,
} from "@/lib/tier-list";
import type { ItemImageStatus } from "@/lib/use-item-images";
import { useMobilePerformanceMode } from "@/lib/use-mobile-performance-mode";
import { useViewTransitionsEnabled } from "@/lib/view-transitions";
import { ItemImage } from "./ItemImage";

const MEDIA_ASPECT_RATIOS: Record<ItemImageAspectRatio, string> = {
  landscape: "3 / 2",
  square: "1",
  portrait: "2 / 3",
  wide: "16 / 9",
};

export type ItemDetailEditor = {
  canAddImages: boolean;
  imageStatus?: ItemImageStatus;
  onChange: (patch: Partial<Pick<TierItem, "label" | "description">>) => void;
  onImageUrlChange: (imageUrl: string | undefined) => void;
  onImagePaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onImageUpload: (file: File) => void;
  onRemove: () => void;
};

// Shows one item's name, description, and image. Passing `editor` makes them
// editable; without it the dialog is read-only, as in preview and shared views.
export function ItemDetailDialog({
  editor,
  item,
  itemImageAspectRatio = DEFAULT_ITEM_IMAGE_ASPECT_RATIO,
  onClose,
  tier,
}: {
  editor?: ItemDetailEditor;
  // The dialog is open while this is set.
  item: TierItem | undefined;
  itemImageAspectRatio?: ItemImageAspectRatio;
  onClose: () => void;
  tier?: Tier;
}) {
  const viewTransitionsEnabled = useViewTransitionsEnabled();
  const isMobilePerformanceMode = useMobilePerformanceMode();
  const isAnimated = viewTransitionsEnabled && !isMobilePerformanceMode;
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pointerDownOnBackdrop = useRef(false);
  const isOpen = item !== undefined;
  // A new item has no name yet, so start there.
  const focusNameOnOpen = Boolean(editor && item && !item.label.trim());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    if (dialog.open) return;
    dialog.showModal();
    if (focusNameOnOpen) nameInputRef.current?.focus();
  }, [focusNameOnOpen, isOpen]);

  function close() {
    dialogRef.current?.close();
  }

  const name = item?.label.trim() || "Untitled item";
  const description = item?.description?.trim();
  const imageStatus = editor?.imageStatus;
  const isAddingImage =
    imageStatus?.state === "uploading" || imageStatus?.state === "saving";

  return (
    <dialog
      aria-labelledby={titleId}
      className={isAnimated ? "item-dialog is-animated" : "item-dialog"}
      onClick={(event) => {
        // Only a click that starts and ends on the backdrop closes the dialog,
        // so selecting text past the card's edge doesn't.
        if (event.target === event.currentTarget && pointerDownOnBackdrop.current) {
          close();
        }
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
      onPointerDown={(event) => {
        pointerDownOnBackdrop.current = event.target === event.currentTarget;
      }}
      ref={dialogRef}
    >
      {item ? (
        <div className="item-dialog-card">
          <header className="item-dialog-header">
            <div className="item-dialog-heading">
              <span
                className={tier ? "item-dialog-tier" : "item-dialog-tier is-unranked"}
                style={tier ? { background: tier.color } : undefined}
              >
                {tier ? tier.name : "Unranked"}
              </span>
              <h2 id={titleId}>{editor ? "Edit item" : name}</h2>
            </div>
            <button
              aria-label="Close"
              className="button icon ghost item-dialog-close"
              onClick={close}
              type="button"
            >
              <X size={18} />
            </button>
          </header>

          <div className="item-dialog-body">
            <div
              className="item-dialog-media"
              style={{ aspectRatio: MEDIA_ASPECT_RATIOS[itemImageAspectRatio] }}
            >
              <ItemImage imageUrl={item.imageUrl} label={item.label} />
            </div>

            {editor ? (
              <div className="item-dialog-fields">
                <label className="form-row">
                  <span className="label">Name</span>
                  <input
                    className="input"
                    onChange={(event) => editor.onChange({ label: event.target.value })}
                    placeholder="Item name"
                    ref={nameInputRef}
                    value={item.label}
                  />
                </label>
                <label className="form-row">
                  <span className="label">Description</span>
                  <textarea
                    className="textarea item-dialog-description-input"
                    onChange={(event) =>
                      editor.onChange({ description: event.target.value || undefined })
                    }
                    placeholder="Notes, thoughts, or why it ranks here"
                    value={item.description ?? ""}
                  />
                </label>
                <div className="form-row">
                  <span className="label">Image</span>
                  <div className="inline-row">
                    <input
                      aria-label="Image link"
                      className="input"
                      onChange={(event) =>
                        editor.onImageUrlChange(event.target.value.trim() || undefined)
                      }
                      onPaste={editor.onImagePaste}
                      placeholder={getImageLinkPlaceholder(item.imageUrl, editor)}
                      value={getEditableImageLink(item.imageUrl)}
                    />
                    {editor.canAddImages ? (
                      <button
                        aria-label="Upload image"
                        className="button icon"
                        disabled={isAddingImage}
                        onClick={() => imageInputRef.current?.click()}
                        title="Upload image"
                        type="button"
                      >
                        <ImageUp size={16} />
                      </button>
                    ) : null}
                    {item.imageUrl ? (
                      <button
                        aria-label="Remove image"
                        className="button icon"
                        onClick={() => editor.onImageUrlChange(undefined)}
                        title="Remove image"
                        type="button"
                      >
                        <ImageOff size={16} />
                      </button>
                    ) : null}
                  </div>
                  {imageStatus ? <ItemImageStatusMessage status={imageStatus} /> : null}
                  <input
                    accept={ITEM_IMAGE_ACCEPT}
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) editor.onImageUpload(file);
                    }}
                    ref={imageInputRef}
                    type="file"
                  />
                </div>
              </div>
            ) : (
              <div className="item-dialog-fields">
                {description ? (
                  <p className="item-dialog-description">{description}</p>
                ) : (
                  <p className="muted item-dialog-description is-empty">
                    No description yet.
                  </p>
                )}
              </div>
            )}
          </div>

          <footer className="item-dialog-actions">
            {editor ? (
              <button
                className="button danger"
                onClick={() => {
                  // Close first, so the tile's exit animation isn't hidden
                  // behind the dialog.
                  close();
                  editor.onRemove();
                }}
                type="button"
              >
                <Trash2 size={16} /> Remove item
              </button>
            ) : null}
            <button className="button primary" onClick={close} type="button">
              {editor ? "Done" : "Close"}
            </button>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}

export function ItemImageStatusMessage({
  status,
  text,
}: {
  status: ItemImageStatus;
  text?: string;
}) {
  if (status.state === "error") {
    return (
      <p className="item-image-status is-error" role="status">
        {status.message}
      </p>
    );
  }

  return (
    <p className="item-image-status" role="status">
      <Loader2 size={14} />
      {text ??
        (status.state === "uploading"
          ? "Uploading image"
          : status.state === "saving"
            ? "Saving image"
            : "Saving a copy of the linked image")}
    </p>
  );
}

// Uploaded images are stored under an internal path rather than a link worth
// showing, so the field stays empty for them and typing a link replaces them.
function isStoredImage(imageUrl: string | undefined) {
  return Boolean(
    getLocalItemImageKey(imageUrl) ||
      (imageUrl?.startsWith("/") && getHostedItemImageKey(imageUrl)),
  );
}

function getEditableImageLink(imageUrl: string | undefined) {
  return isStoredImage(imageUrl) ? "" : (imageUrl ?? "");
}

function getImageLinkPlaceholder(imageUrl: string | undefined, editor: ItemDetailEditor) {
  if (isStoredImage(imageUrl)) return "Saved image. Paste a link to swap";
  return editor.canAddImages ? "Image URL or paste image" : "Image URL";
}
