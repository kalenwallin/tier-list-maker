import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { paginationOptsValidator, type PaginationResult } from "convex/server";
import { v } from "convex/values";
import { getViewerEmail, requireViewerEmail } from "./users";

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

const itemImageAspectRatio = v.union(
  v.literal("landscape"),
  v.literal("square"),
  v.literal("portrait"),
  v.literal("wide"),
);

const tierListContent = {
  title: v.string(),
  description: v.string(),
  itemImageAspectRatio: v.optional(itemImageAspectRatio),
  tiers: v.array(tier),
  items: v.array(tierItem),
};

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const ownerEmail = await getViewerEmail(ctx);
    if (ownerEmail === null) {
      const signedOut: PaginationResult<Doc<"tierLists">> = {
        page: [],
        isDone: true,
        continueCursor: "",
      };
      return signedOut;
    }

    return await ctx.db
      .query("tierLists")
      .withIndex("by_owner_updatedAt", (q) => q.eq("ownerEmail", ownerEmail))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("tierLists") },
  handler: async (ctx, { id }) => {
    const ownerEmail = await getViewerEmail(ctx);
    const list = await ctx.db.get(id);
    if (!list || ownerEmail === null || list.ownerEmail !== ownerEmail) {
      return null;
    }

    return list;
  },
});

export const getByLocalId = query({
  args: { localId: v.string() },
  handler: async (ctx, { localId }) => {
    const ownerEmail = await getViewerEmail(ctx);
    if (ownerEmail === null) return null;

    return await ctx.db
      .query("tierLists")
      .withIndex("by_owner_localId", (q) =>
        q.eq("ownerEmail", ownerEmail).eq("localId", localId),
      )
      .first();
  },
});

export const getShared = query({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    if (!shareId.trim()) return null;

    const list = await ctx.db
      .query("tierLists")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId.trim()))
      .first();
    return list ? await toSharedList(ctx, list) : null;
  },
});

// A list's editor URL doubles as a share link, so anyone who has it can read
// the list.
export const getPublic = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    // The id comes straight from the URL and may be a browser-only list id.
    const listId = ctx.db.normalizeId("tierLists", id);
    if (listId === null) return null;

    const list = await ctx.db.get(listId);
    return list ? await toSharedList(ctx, list) : null;
  },
});

export const create = mutation({
  args: {
    ...tierListContent,
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, list) => {
    const ownerEmail = await requireViewerEmail(ctx);
    return await ctx.db.insert("tierLists", { ...list, ownerEmail });
  },
});

export const createShareLink = mutation({
  args: { id: v.id("tierLists") },
  handler: async (ctx, { id }) => {
    const list = await assertOwner(ctx, id);
    if (list.shareId) return list.shareId;

    const shareId = crypto.randomUUID();
    await ctx.db.patch(id, {
      shareId,
      updatedAt: Date.now(),
    });
    return shareId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tierLists"),
    ...tierListContent,
    updatedAt: v.number(),
  },
  handler: async (ctx, { id, ...updates }) => {
    await assertOwner(ctx, id);
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("tierLists") },
  handler: async (ctx, { id }) => {
    await assertOwner(ctx, id);
    await ctx.db.delete(id);
  },
});

export const importMany = mutation({
  args: {
    lists: v.array(
      v.object({
        ...tierListContent,
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { lists }) => {
    const ownerEmail = await requireViewerEmail(ctx);

    for (const list of lists) {
      await ctx.db.insert("tierLists", {
        ...list,
        ownerEmail,
        updatedAt: Date.now(),
      });
    }

    return lists.length;
  },
});

export const syncLocalLists = mutation({
  args: {
    lists: v.array(
      v.object({
        localId: v.string(),
        ...tierListContent,
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { lists }) => {
    const ownerEmail = await requireViewerEmail(ctx);
    let syncedCount = 0;

    for (const list of lists) {
      const existing = await ctx.db
        .query("tierLists")
        .withIndex("by_owner_localId", (q) =>
          q.eq("ownerEmail", ownerEmail).eq("localId", list.localId),
        )
        .first();

      const updates = {
        localId: list.localId,
        ownerEmail,
        title: list.title.trim() || "Untitled tier list",
        description: list.description.trim(),
        ...(list.itemImageAspectRatio
          ? { itemImageAspectRatio: list.itemImageAspectRatio }
          : {}),
        tiers: list.tiers,
        items: list.items,
        createdAt: list.createdAt,
        updatedAt: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, updates);
      } else {
        await ctx.db.insert("tierLists", updates);
      }
      syncedCount += 1;
    }

    return syncedCount;
  },
});

// Anyone with the link can read the list, so tell them whether they own it
// rather than who does.
async function toSharedList(ctx: QueryCtx, list: Doc<"tierLists">) {
  const { ownerEmail, ...sharedList } = list;
  const viewerEmail = await getViewerEmail(ctx);
  return {
    ...sharedList,
    isOwner: viewerEmail !== null && viewerEmail === ownerEmail,
  };
}

async function assertOwner(ctx: MutationCtx, id: Id<"tierLists">) {
  const ownerEmail = await requireViewerEmail(ctx);
  const list = await ctx.db.get(id);
  if (!list || list.ownerEmail !== ownerEmail) {
    throw new Error("Tier list not found.");
  }
  return list;
}
