"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import {
  createBackup,
  createBlankTierList,
  LocalDataBackup,
  parseBackupContents,
  StoredTierList,
} from "./db";

type UseTierListsResult = {
  lists: StoredTierList[] | undefined;
  ownerEmail: string | undefined;
  createList: (title?: string) => Promise<string>;
  removeList: (id: string) => Promise<void>;
  exportData: () => Promise<LocalDataBackup>;
  importData: (contents: string) => Promise<number>;
};

type UseTierListResult = {
  list: StoredTierList | null | undefined;
  saveList: (
    updates: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
  ) => Promise<void>;
};

export function useTierLists(): UseTierListsResult {
  const { ownerEmail, authLoading } = useAuthState();
  const remoteLists = useQuery(
    api.tierLists.list,
    ownerEmail ? { ownerEmail } : "skip",
  ) as
    | ConvexTierList[]
    | undefined;
  const createTierList = useMutation(api.tierLists.create);
  const removeTierList = useMutation(api.tierLists.remove);
  const importTierLists = useMutation(api.tierLists.importMany);
  const lists = useMemo(() => {
    if (authLoading) return undefined;
    if (!ownerEmail) return [];
    return remoteLists?.map(fromConvexTierList);
  }, [authLoading, ownerEmail, remoteLists]);

  async function createList(title?: string) {
    if (!ownerEmail) throw new Error("Sign in to create tier lists.");
    const list = createBlankTierList(title);
    return await createTierList({ ...list, ownerEmail });
  }

  async function removeList(id: string) {
    if (!ownerEmail) throw new Error("Sign in to delete tier lists.");
    await removeTierList({ id: id as Id<"tierLists">, ownerEmail });
  }

  async function exportData() {
    return createBackup(lists ?? []);
  }

  async function importData(contents: string) {
    if (!ownerEmail) throw new Error("Sign in to import tier lists.");
    const parsedLists = parseBackupContents(contents);
    return await importTierLists({
      ownerEmail,
      lists: parsedLists.map(({ id: _id, ownerEmail: _ownerEmail, ...list }) => list),
    });
  }

  return { lists, ownerEmail, createList, removeList, exportData, importData };
}

export function useTierList(id: string): UseTierListResult {
  const { ownerEmail, authLoading } = useAuthState();
  const remoteList = useQuery(
    api.tierLists.get,
    ownerEmail ? { id: id as Id<"tierLists">, ownerEmail } : "skip",
  ) as ConvexTierList | null | undefined;
  const updateTierList = useMutation(api.tierLists.update);
  const list = useMemo(() => {
    if (authLoading) return undefined;
    if (!ownerEmail) return null;
    if (remoteList === undefined) return undefined;
    if (remoteList === null) return null;
    return fromConvexTierList(remoteList);
  }, [authLoading, ownerEmail, remoteList]);

  const saveList = useCallback(async (
    updates: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
  ) => {
    if (!ownerEmail) throw new Error("Sign in to save tier lists.");
    await updateTierList({
      id: id as Id<"tierLists">,
      ownerEmail,
      title: updates.title.trim() || "Untitled tier list",
      description: updates.description.trim(),
      tiers: updates.tiers,
      items: updates.items,
      updatedAt: Date.now(),
    });
  }, [id, ownerEmail, updateTierList]);

  return { list, saveList };
}

type ConvexTierList = StoredTierList & {
  _id: Id<"tierLists">;
  _creationTime: number;
};

function fromConvexTierList(list: ConvexTierList): StoredTierList {
  return {
    id: list._id,
    ownerEmail: list.ownerEmail,
    title: list.title,
    description: list.description,
    tiers: list.tiers,
    items: list.items,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}

function useAuthState() {
  const { user, loading } = useAuth();
  return {
    authLoading: loading,
    ownerEmail: loading ? undefined : user?.email?.trim().toLowerCase(),
  };
}
