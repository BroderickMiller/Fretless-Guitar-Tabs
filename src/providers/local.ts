import { getTab, listTabs } from "../storage/library";
import type { TabProvider, TabEntry } from "../types";
export function searchTabs(tabs: TabEntry[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  return tabs.filter((t) =>
    `${t.title} ${t.artist}`.toLocaleLowerCase().includes(q),
  );
}
export const localProvider: TabProvider = {
  id: "local",
  name: "Your library",
  getTab,
  async search(query) {
    return searchTabs(await listTabs(), query).map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      source: "local",
    }));
  },
};
