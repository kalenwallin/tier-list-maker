"use client";

import { useCallback, useEffect, useState } from "react";
import { createBlankTierList, db, StoredTierList } from "./db";

export function useTierLists() {
  const [lists, setLists] = useState<StoredTierList[] | undefined>();

  const refresh = useCallback(async () => {
    const nextLists = await db.tierLists.orderBy("updatedAt").reverse().toArray();
    setLists(nextLists);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function createList(title?: string) {
    const list = createBlankTierList(title);
    await db.tierLists.add(list);
    await refresh();
    return list.id;
  }

  async function removeList(id: string) {
    await db.tierLists.delete(id);
    await refresh();
  }

  return { lists, createList, removeList, refresh };
}

export function useTierList(id: string) {
  const [list, setList] = useState<StoredTierList | null | undefined>();

  const refresh = useCallback(async () => {
    const nextList = await db.tierLists.get(id);
    setList(nextList ?? null);
  }, [id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveList = useCallback(async (
    updates: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
  ) => {
    const nextList: StoredTierList = {
      id,
      createdAt: list?.createdAt ?? Date.now(),
      ...updates,
      title: updates.title.trim() || "Untitled tier list",
      description: updates.description.trim(),
      updatedAt: Date.now(),
    };
    await db.tierLists.put(nextList);
    setList(nextList);
  }, [id, list?.createdAt]);

  return { list, saveList, refresh };
}
