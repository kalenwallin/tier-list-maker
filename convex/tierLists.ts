import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

const tierListFields = {
  ownerEmail: v.optional(v.string()),
  title: v.string(),
  description: v.string(),
  tiers: v.array(tier),
  items: v.array(tierItem),
  createdAt: v.number(),
  updatedAt: v.number(),
};

export const list = query({
  args: { ownerEmail: v.string() },
  handler: async (ctx, { ownerEmail }) => {
    return await ctx.db
      .query("tierLists")
      .withIndex("by_owner_updatedAt", (q) =>
        q.eq("ownerEmail", normalizeEmail(ownerEmail)),
      )
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("tierLists"), ownerEmail: v.string() },
  handler: async (ctx, { id, ownerEmail }) => {
    const list = await ctx.db.get(id);
    if (!list || list.ownerEmail !== normalizeEmail(ownerEmail)) {
      return null;
    }

    return list;
  },
});

export const create = mutation({
  args: {
    ownerEmail: v.string(),
    title: v.string(),
    description: v.string(),
    tiers: v.array(tier),
    items: v.array(tierItem),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, list) => {
    return await ctx.db.insert("tierLists", {
      ...list,
      ownerEmail: normalizeEmail(list.ownerEmail),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tierLists"),
    ownerEmail: v.string(),
    title: v.string(),
    description: v.string(),
    tiers: v.array(tier),
    items: v.array(tierItem),
    updatedAt: v.number(),
  },
  handler: async (ctx, { id, ownerEmail, ...updates }) => {
    await assertOwner(ctx, id, ownerEmail);
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("tierLists"), ownerEmail: v.string() },
  handler: async (ctx, { id, ownerEmail }) => {
    await assertOwner(ctx, id, ownerEmail);
    await ctx.db.delete(id);
  },
});

export const importMany = mutation({
  args: { ownerEmail: v.string(), lists: v.array(v.object(tierListFields)) },
  handler: async (ctx, { ownerEmail, lists }) => {
    const normalizedOwnerEmail = normalizeEmail(ownerEmail);

    for (const list of lists) {
      await ctx.db.insert("tierLists", {
        ...list,
        ownerEmail: normalizedOwnerEmail,
        updatedAt: Date.now(),
      });
    }

    return lists.length;
  },
});

export const claimLegacyLists = mutation({
  args: { ownerEmail: v.string() },
  handler: async (ctx, { ownerEmail }) => {
    const normalizedOwnerEmail = normalizeEmail(ownerEmail);
    const lists = await ctx.db.query("tierLists").collect();
    let migratedCount = 0;

    for (const list of lists) {
      if (list.ownerEmail !== undefined) continue;

      await ctx.db.patch(list._id, {
        ownerEmail: normalizedOwnerEmail,
        updatedAt: Date.now(),
      });
      migratedCount += 1;
    }

    return migratedCount;
  },
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function assertOwner(
  ctx: MutationCtx,
  id: Id<"tierLists">,
  ownerEmail: string,
) {
  const list = await ctx.db.get(id);
  if (!list || list.ownerEmail !== normalizeEmail(ownerEmail)) {
    throw new Error("Tier list not found.");
  }
}
