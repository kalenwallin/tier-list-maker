import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const tier = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
});

const tierItem = v.object({
  id: v.string(),
  label: v.string(),
  imageUrl: v.optional(v.string()),
  tierId: v.optional(v.string()),
});

export default defineSchema({
  tierLists: defineTable({
    ownerEmail: v.optional(v.string()),
    localId: v.optional(v.string()),
    shareId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    itemImageAspectRatio: v.optional(
      v.union(
        v.literal("landscape"),
        v.literal("square"),
        v.literal("portrait"),
        v.literal("wide"),
      ),
    ),
    tiers: v.array(tier),
    items: v.array(tierItem),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_updatedAt", ["ownerEmail", "updatedAt"])
    .index("by_owner_localId", ["ownerEmail", "localId"])
    .index("by_shareId", ["shareId"])
    .index("by_updatedAt", ["updatedAt"]),
});
