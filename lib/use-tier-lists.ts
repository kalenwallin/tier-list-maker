"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@workos/authkit-tanstack-react-start/client";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBackup,
  createBlankTierList,
  LocalDataBackup,
  parseBackupContents,
  StoredTierList,
} from "./db";
import {
  clearLocalTierLists,
  createLocalTierList,
  importLocalTierLists,
  isLocalTierListId,
  readLocalTierLists,
  removeLocalTierList,
  updateLocalTierList,
} from "./local-tier-lists";

export type SyncMode = "local" | "cloud";

type UseTierListsResult = {
  lists: StoredTierList[] | undefined;
  ownerEmail: string | undefined;
  syncMode: SyncMode;
  isMigratingLocalData: boolean;
  createList: (title?: string) => Promise<string>;
  removeList: (id: string) => Promise<void>;
  createShareLink: (id: string) => Promise<string>;
  exportData: () => Promise<LocalDataBackup>;
  importData: (contents: string) => Promise<number>;
};

type UseTierListResult = {
  list: StoredTierList | null | undefined;
  ownerEmail: string | undefined;
  syncMode: SyncMode;
  shareUrl: string | null;
  saveList: (
    updates: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
  ) => Promise<void>;
  removeList: () => Promise<void>;
  createShareLink: () => Promise<string>;
};

export function useTierLists(): UseTierListsResult {
  const { ownerEmail, authLoading } = useAuthState();
  const { localLists, localLoading, isMigratingLocalData } =
    useLocalListsMigration(ownerEmail);
  const remoteLists = useQuery(
    api.tierLists.list,
    ownerEmail ? { ownerEmail } : "skip",
  ) as
    | ConvexTierList[]
    | undefined;
  const createTierList = useMutation(api.tierLists.create);
  const removeTierList = useMutation(api.tierLists.remove);
  const createRemoteShareLink = useMutation(api.tierLists.createShareLink);
  const importTierLists = useMutation(api.tierLists.importMany);
  const lists = useMemo(() => {
    if (authLoading || localLoading) return undefined;
    if (!ownerEmail) return localLists;
    return remoteLists?.map(fromConvexTierList);
  }, [authLoading, localLists, localLoading, ownerEmail, remoteLists]);

  async function createList(title?: string) {
    if (!ownerEmail) {
      return createLocalTierList(title).id;
    }

    const list = createBlankTierList(title);
    return await createTierList({ ...list, ownerEmail });
  }

  async function removeList(id: string) {
    if (!ownerEmail) {
      removeLocalTierList(id);
      return;
    }

    await removeTierList({ id: id as Id<"tierLists">, ownerEmail });
  }

  async function createShareLink(id: string) {
    if (!ownerEmail) {
      throw new Error("Sign in to cloud sync before sharing tier lists.");
    }

    const shareId =
      lists?.find((list) => list.id === id)?.shareId ??
      (await createRemoteShareLink({ id: id as Id<"tierLists">, ownerEmail }));
    return `${window.location.origin}/share/${shareId}`;
  }

  async function exportData() {
    return createBackup(lists ?? []);
  }

  async function importData(contents: string) {
    if (!ownerEmail) {
      return importLocalTierLists(contents);
    }

    const parsedLists = parseBackupContents(contents);
    return await importTierLists({
      ownerEmail,
      lists: parsedLists.map(
        ({
          id: _id,
          ownerEmail: _ownerEmail,
          localId: _localId,
          shareId: _shareId,
          ...list
        }) => list,
      ),
    });
  }

  return {
    lists,
    ownerEmail,
    syncMode: ownerEmail ? "cloud" : "local",
    isMigratingLocalData,
    createList,
    removeList,
    createShareLink,
    exportData,
    importData,
  };
}

export function useTierList(id: string): UseTierListResult {
  const { ownerEmail, authLoading } = useAuthState();
  const { localLists, localLoading, isMigratingLocalData } =
    useLocalListsMigration(ownerEmail);
  const shouldQueryByLocalId = ownerEmail && isLocalTierListId(id);
  const remoteListById = useQuery(
    api.tierLists.get,
    ownerEmail && !shouldQueryByLocalId
      ? { id: id as Id<"tierLists">, ownerEmail }
      : "skip",
  ) as ConvexTierList | null | undefined;
  const remoteListByLocalId = useQuery(
    api.tierLists.getByLocalId,
    shouldQueryByLocalId ? { localId: id, ownerEmail } : "skip",
  ) as ConvexTierList | null | undefined;
  const updateTierList = useMutation(api.tierLists.update);
  const removeTierList = useMutation(api.tierLists.remove);
  const createRemoteShareLink = useMutation(api.tierLists.createShareLink);
  const remoteList = shouldQueryByLocalId ? remoteListByLocalId : remoteListById;
  const [recoveredLocalList, setRecoveredLocalList] =
    useState<StoredTierList | null>(null);

  useEffect(() => {
    if (authLoading || ownerEmail || localLoading || !isLocalTierListId(id)) return;
    if (recoveredLocalList?.id === id) return;

    const existingLocalList = readLocalTierLists().find(
      (candidate) => candidate.id === id,
    );
    setRecoveredLocalList(existingLocalList ?? createLocalTierList("New tier list", id));
  }, [authLoading, id, localLoading, ownerEmail, recoveredLocalList?.id]);

  const list = useMemo(() => {
    if (authLoading) return undefined;
    if (!ownerEmail) {
      const localList =
        localLists.find((candidate) => candidate.id === id) ??
        (recoveredLocalList?.id === id ? recoveredLocalList : undefined) ??
        (isLocalTierListId(id)
          ? readLocalTierLists().find((candidate) => candidate.id === id)
          : undefined);
      if (localList) return localList;
      return localLoading || isLocalTierListId(id) ? undefined : null;
    }
    if (localLoading) return undefined;
    if (isMigratingLocalData && shouldQueryByLocalId) return undefined;
    if (remoteList === undefined) return undefined;
    if (remoteList === null) return null;
    return fromConvexTierList(remoteList);
  }, [
    authLoading,
    id,
    isMigratingLocalData,
    localLists,
    localLoading,
    ownerEmail,
    recoveredLocalList,
    remoteList,
    shouldQueryByLocalId,
  ]);

  const saveList = useCallback(async (
    updates: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
  ) => {
    if (!ownerEmail) {
      updateLocalTierList(id, updates);
      return;
    }
    const remoteId = remoteList?._id ?? id;
    await updateTierList({
      id: remoteId as Id<"tierLists">,
      ownerEmail,
      title: updates.title.trim() || "Untitled tier list",
      description: updates.description.trim(),
      tiers: updates.tiers,
      items: updates.items,
      updatedAt: Date.now(),
    });
  }, [id, ownerEmail, remoteList?._id, updateTierList]);

  const createShareLink = useCallback(async () => {
    if (!ownerEmail || !remoteList) {
      throw new Error("Sign in to cloud sync before sharing tier lists.");
    }

    const shareId =
      remoteList.shareId ??
      (await createRemoteShareLink({
        id: remoteList._id,
        ownerEmail,
      }));
    return `${window.location.origin}/share/${shareId}`;
  }, [createRemoteShareLink, ownerEmail, remoteList]);

  const removeList = useCallback(async () => {
    if (!ownerEmail) {
      removeLocalTierList(id);
      return;
    }

    const remoteId = remoteList?._id ?? id;
    await removeTierList({
      id: remoteId as Id<"tierLists">,
      ownerEmail,
    });
  }, [id, ownerEmail, remoteList?._id, removeTierList]);

  return {
    list,
    ownerEmail,
    syncMode: ownerEmail ? "cloud" : "local",
    shareUrl:
      ownerEmail && remoteList?.shareId && typeof window !== "undefined"
        ? `${window.location.origin}/share/${remoteList.shareId}`
        : null,
    saveList,
    removeList,
    createShareLink,
  };
}

type ConvexTierList = StoredTierList & {
  _id: Id<"tierLists">;
  _creationTime: number;
  localId?: string;
  shareId?: string;
};

function fromConvexTierList(list: ConvexTierList): StoredTierList {
  return {
    id: list._id,
    ownerEmail: list.ownerEmail,
    localId: list.localId,
    shareId: list.shareId,
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

function useLocalListsMigration(ownerEmail: string | undefined) {
  const [localLists, setLocalLists] = useState<StoredTierList[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [isMigratingLocalData, setIsMigratingLocalData] = useState(false);
  const syncLocalLists = useMutation(api.tierLists.syncLocalLists);

  useEffect(() => {
    function refreshLocalLists() {
      setLocalLists(readLocalTierLists());
      setLocalLoading(false);
    }

    refreshLocalLists();
    window.addEventListener("storage", refreshLocalLists);
    window.addEventListener("tier-list-maker:local-lists-changed", refreshLocalLists);

    return () => {
      window.removeEventListener("storage", refreshLocalLists);
      window.removeEventListener(
        "tier-list-maker:local-lists-changed",
        refreshLocalLists,
      );
    };
  }, []);

  useEffect(() => {
    if (!ownerEmail || localLoading || localLists.length === 0) return;

    let cancelled = false;
    async function migrate() {
      setIsMigratingLocalData(true);
      try {
        await syncLocalLists({
          ownerEmail: ownerEmail!,
          lists: localLists.map(
            ({
              id,
              ownerEmail: _ownerEmail,
              localId: _localId,
              shareId: _shareId,
              ...list
            }) => ({
              localId: id,
              ...list,
            }),
          ),
        });
        if (!cancelled) {
          clearLocalTierLists();
          setLocalLists([]);
        }
      } finally {
        if (!cancelled) setIsMigratingLocalData(false);
      }
    }

    void migrate();

    return () => {
      cancelled = true;
    };
  }, [localLists, localLoading, ownerEmail, syncLocalLists]);

  return { localLists, localLoading, isMigratingLocalData };
}
