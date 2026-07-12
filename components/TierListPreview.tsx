"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  DragEvent,
  RefObject,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { getSiteUrl } from "@/lib/site-url";
import { Tier, TierItem } from "@/lib/tier-list";

type Props = {
  title?: string;
  description?: string;
  tiers: Tier[];
  items: TierItem[];
  className?: string;
  draggable?: boolean;
  onDropItem?: (
    tierId?: string,
    targetItemId?: string,
    placement?: "before" | "after",
  ) => void;
  onDragStart?: (itemId: string) => void;
  exportRef?: RefObject<HTMLDivElement | null>;
  expandableHeader?: boolean;
  isExporting?: boolean;
  viewTransitionName?: string;
};

export function TierListPreview({
  title,
  description,
  tiers,
  items,
  className,
  draggable = false,
  onDropItem,
  onDragStart,
  exportRef,
  expandableHeader = false,
  isExporting = false,
  viewTransitionName,
}: Props) {
  const transitionNamespace = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const unranked = items.filter((item) => !item.tierId);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [headerCanExpand, setHeaderCanExpand] = useState(false);
  const previewHeaderRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const shouldCollapseHeader =
    expandableHeader && headerCanExpand && !isHeaderExpanded && !isExporting;
  const trimmedDescription = description?.trim();
  const hasDescription = Boolean(trimmedDescription);
  const hasHeaderContent = Boolean(title || hasDescription);
  const marketingUrl = getMarketingUrl();

  useLayoutEffect(() => {
    if (!expandableHeader || isExporting) {
      setHeaderCanExpand(false);
      return;
    }

    const previewHeader = previewHeaderRef.current;
    if (!previewHeader) return;

    function measureHeaderOverflow() {
      const headerWidth = previewHeaderRef.current?.clientWidth ?? 0;
      const nextHeaderCanExpand =
        headerWidth > 0 &&
        [titleRef.current, descriptionRef.current].some((element) =>
          overflowsSingleLine(element, headerWidth),
        );

      setHeaderCanExpand((current) =>
        current === nextHeaderCanExpand ? current : nextHeaderCanExpand,
      );
      if (!nextHeaderCanExpand) {
        setIsHeaderExpanded(false);
      }
    }

    measureHeaderOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureHeaderOverflow);
      return () => window.removeEventListener("resize", measureHeaderOverflow);
    }

    const observer = new ResizeObserver(measureHeaderOverflow);
    observer.observe(previewHeader);
    return () => observer.disconnect();
  }, [expandableHeader, isExporting, title, trimmedDescription]);

  function allowDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.classList.add("drop-target");
  }

  function leaveDrop(event: DragEvent<HTMLDivElement>) {
    event.currentTarget.classList.remove("drop-target");
  }

  return (
    <section
      className={[
        "panel tier-export-card",
        isExporting ? "is-exporting" : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ viewTransitionName }}
    >
      <div
        ref={exportRef}
        className={[
          "panel-pad tier-export-inner",
          isExporting ? "is-exporting" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {hasHeaderContent || isExporting ? (
          <div className="toolbar preview-header" ref={previewHeaderRef}>
            <div className="preview-heading">
              {title ? (
                <h1
                  className={shouldCollapseHeader ? "single-line-truncate" : undefined}
                  ref={titleRef}
                  style={{ margin: 0 }}
                  title={title}
                >
                  {title}
                </h1>
              ) : null}
              {hasDescription ? (
                <p
                  className={[
                    "muted",
                    "preview-description",
                    shouldCollapseHeader ? "single-line-truncate" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  ref={descriptionRef}
                  title={trimmedDescription}
                >
                  {trimmedDescription}
                </p>
              ) : null}
            </div>
            {isExporting ? <div className="marketing-url">{marketingUrl}</div> : null}
            {expandableHeader && headerCanExpand ? (
              <button
                aria-expanded={isHeaderExpanded}
                className="button preview-expand-button"
                data-export-exclude="true"
                onClick={() => setIsHeaderExpanded((current) => !current)}
                type="button"
              >
                {isHeaderExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isHeaderExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="tier-board">
          {tiers.map((tier) => (
            <div className="tier-row" key={tier.id}>
              <div className="tier-label" style={{ background: tier.color }}>
                {tier.name}
              </div>
              <div
                className="tier-items"
                onDragOver={draggable ? allowDrop : undefined}
                onDragLeave={draggable ? leaveDrop : undefined}
                onDrop={
                  draggable
                    ? (event) => {
                        leaveDrop(event);
                        onDropItem?.(tier.id);
                      }
                    : undefined
                }
              >
                {items
                  .filter((item) => item.tierId === tier.id)
                  .map((item) => (
                    <AnimatedTile
                      draggable={draggable}
                      item={item}
                      key={item.id}
                      onDragStart={onDragStart}
                      onDrop={() => onDropItem?.(tier.id, item.id, "before")}
                      transitionNamespace={transitionNamespace}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {draggable || unranked.length > 0 ? (
        <div className="panel-pad item-tray-pad">
          <div
            aria-label="Unranked item tray"
            className="item-tray"
            data-export-exclude="true"
            onDragOver={draggable ? allowDrop : undefined}
            onDragLeave={draggable ? leaveDrop : undefined}
            onDrop={
              draggable
                ? (event) => {
                    leaveDrop(event);
                    onDropItem?.(undefined);
                  }
                : undefined
            }
          >
            {unranked.length === 0 ? (
              <span className="item-tray-empty">Drop items here to unrank them</span>
            ) : null}
            {unranked.map((item) => (
              <AnimatedTile
                draggable={draggable}
                item={item}
                key={item.id}
                onDragStart={onDragStart}
                onDrop={() => onDropItem?.(undefined, item.id, "before")}
                transitionNamespace={transitionNamespace}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AnimatedTile({
  draggable,
  item,
  onDragStart,
  onDrop,
  transitionNamespace,
}: {
  draggable: boolean;
  item: TierItem;
  onDragStart?: (itemId: string) => void;
  onDrop: () => void;
  transitionNamespace: string;
}) {
  return (
    <ViewTransition
      default="none"
      enter="scale-in"
      exit="scale-out"
      name={`tier-item-${transitionNamespace}-${item.id}`}
      share="item-morph"
      update={{ "mode-change": "mode-morph", default: "auto" }}
    >
      <div className="tile-position">
        <ItemEdgeDropTarget draggable={draggable} onDrop={onDrop} />
        <Tile draggable={draggable} item={item} onDragStart={onDragStart} />
      </div>
    </ViewTransition>
  );
}

function ItemEdgeDropTarget({
  draggable,
  onDrop,
}: {
  draggable: boolean;
  onDrop: () => void;
}) {
  if (!draggable) return null;

  return (
    <div
      aria-hidden="true"
      className="item-edge-drop-target"
      onDragLeave={(event) => event.currentTarget.classList.remove("drop-target")}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add("drop-target");
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove("drop-target");
        onDrop();
      }}
    />
  );
}

function overflowsSingleLine(
  element: HTMLHeadingElement | HTMLParagraphElement | null,
  availableWidth: number,
) {
  if (!element) return false;

  const previousWhiteSpace = element.style.whiteSpace;
  element.style.whiteSpace = "nowrap";
  const overflows = element.scrollWidth > availableWidth + 1;
  element.style.whiteSpace = previousWhiteSpace;

  return overflows;
}

function getMarketingUrl() {
  return getSiteUrl()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function Tile({
  item,
  draggable,
  onDragStart,
}: {
  item: TierItem;
  draggable: boolean;
  onDragStart?: (itemId: string) => void;
}) {
  return (
    <article
      className="tile"
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragStart?.(item.id);
      }}
      title={item.label}
    >
      <div className="tile-media">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={item.imageUrl} />
        ) : (
          item.label.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="tile-label">{item.label}</div>
    </article>
  );
}
