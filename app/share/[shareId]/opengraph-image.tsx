import {
  getShareDescription,
  getSharedTierList,
  truncateText,
} from "@/lib/share-metadata";
import { getSiteUrl } from "@/lib/site-url";
import { DEFAULT_TIERS, type Tier } from "@/lib/tier-list";
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{ shareId: string }>;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { shareId } = await params;
  const list = await getSharedTierList(shareId);
  const title = truncateText(list?.title || "Shared tier list", 28);
  const description = truncateText(getShareDescription(list), 78);
  const tiers = list?.tiers.length ? list.tiers : DEFAULT_TIERS;
  const websiteUrl = getMarketingUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f7f7f2",
          color: "#111",
          fontFamily: "Inter, Arial, sans-serif",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            marginBottom: 22,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: getTitleFontSize(title),
                fontWeight: 900,
                lineHeight: 0.9,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
            <div
              style={{
                marginTop: 22,
                color: "#575750",
                fontSize: 40,
                lineHeight: 1.18,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {description}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <BrandRow websiteUrl={websiteUrl} />
        <div style={{ height: 28 }} />
        <TierStrip tiers={tiers} />
      </div>
    ),
    size,
  );
}

function WebsiteUrl({ url }: { url: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        border: "4px solid #111",
        borderRadius: 999,
        background: "#fff",
        boxShadow: "6px 6px 0 #111",
        color: "#111",
        fontSize: 28,
        fontWeight: 900,
        lineHeight: 1,
        padding: "16px 22px",
      }}
    >
      {url}
    </div>
  );
}

function FaviconMark({ size = 140 }: { size?: number }) {
  return (
    <svg
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        fill="#ffd166"
        height="54"
        rx="8"
        stroke="#111111"
        strokeWidth="4"
        width="54"
        x="5"
        y="5"
      />
      <path
        d="M23 18h18v9c0 6-4 11-9 11s-9-5-9-11v-9Z"
        fill="none"
        stroke="#111111"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M23 22h-7v3c0 5 4 9 9 9M41 22h7v3c0 5-4 9-9 9M32 38v8M24 50h16M28 46h8"
        fill="none"
        stroke="#111111"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function BrandRow({ websiteUrl }: { websiteUrl: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <FaviconMark size={52} />
        <div
          style={{
            color: "#111",
            fontSize: 34,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          Tier List Maker
        </div>
      </div>
      <WebsiteUrl url={websiteUrl} />
    </div>
  );
}

function TierStrip({ tiers }: { tiers: Tier[] }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: 190,
        overflow: "hidden",
        border: "4px solid #111",
        borderRadius: 16,
        background: "#111",
        boxShadow: "8px 8px 0 #111",
      }}
    >
      {tiers.map((tier, index) => (
        <div
          key={tier.id}
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRight: index === tiers.length - 1 ? "0" : "4px solid #111",
            background: getTierColor(tier.color),
            color: "#111",
            fontSize: getTierFontSize(tier.name, tiers.length),
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {truncateText(tier.name, 8)}
        </div>
      ))}
      {tiers.length === 0 ? (
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            fontSize: 46,
            fontWeight: 900,
          }}
        >
          Tier List
        </div>
      ) : null}
    </div>
  );
}

function getTierFontSize(name: string, tierCount: number) {
  if (name.length <= 2 && tierCount <= 8) return 74;
  if (name.length <= 4) return 54;
  return 38;
}

function getTitleFontSize(title: string) {
  if (title.length <= 14) return 116;
  if (title.length <= 24) return 96;
  return 78;
}

function getMarketingUrl() {
  return getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getTierColor(color: string) {
  return /^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(color)
    ? color
    : "#ffd166";
}
