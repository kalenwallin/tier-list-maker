"use client";

import { Tier, TierItem } from "@/lib/tier-list";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DragEvent, RefObject, useState } from "react";

type Props = {
  title?: string;
  description?: string;
  tiers: Tier[];
  items: TierItem[];
  className?: string;
  draggable?: boolean;
  onDropItem?: (tierId?: string) => void;
  onDragStart?: (itemId: string) => void;
  exportRef?: RefObject<HTMLDivElement | null>;
  expandableHeader?: boolean;
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
}: Props) {
  const unranked = items.filter((item) => !item.tierId);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const shouldCollapseHeader = expandableHeader && !isHeaderExpanded;
  const hasHeaderContent = Boolean(title || description);

  function allowDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.classList.add("drop-target");
  }

  function leaveDrop(event: DragEvent<HTMLDivElement>) {
    event.currentTarget.classList.remove("drop-target");
  }

  return (
    <section
      className={["panel tier-export-card", className].filter(Boolean).join(" ")}
      style={{ background: "#fff" }}
    >
      <div ref={exportRef} className="panel-pad tier-export-inner">
        {hasHeaderContent ? (
          <div className="toolbar preview-header">
            <div className="preview-heading">
              {title ? (
                <h1
                  className={shouldCollapseHeader ? "single-line-truncate" : undefined}
                  style={{ margin: 0 }}
                  title={title}
                >
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p
                  className={[
                    "muted",
                    "preview-description",
                    shouldCollapseHeader ? "single-line-truncate" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={description}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {expandableHeader ? (
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
                    <Tile
                      draggable={draggable}
                      item={item}
                      key={item.id}
                      onDragStart={onDragStart}
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
            {unranked.map((item) => (
              <Tile
                draggable={draggable}
                item={item}
                key={item.id}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
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
      onDragStart={() => onDragStart?.(item.id)}
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
