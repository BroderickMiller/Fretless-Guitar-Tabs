import { openDB } from "idb";
import type { TabEntry } from "../types";
const db = () =>
  openDB("fretless", 1, {
    upgrade(db) {
      db.createObjectStore("tabs", { keyPath: "id" });
    },
  });
export async function listTabs(): Promise<TabEntry[]> {
  return (await db()).getAll("tabs");
}
export async function saveTab(tab: TabEntry) {
  await (await db()).put("tabs", tab);
}
export async function deleteTab(id: string) {
  await (await db()).delete("tabs", id);
}
export async function getTab(id: string): Promise<TabEntry | undefined> {
  return (await db()).get("tabs", id);
}
export async function clearTabs(){await (await db()).clear('tabs');}
