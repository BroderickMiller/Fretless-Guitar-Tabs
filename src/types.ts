export interface TabEntry {
  id: string;
  title: string;
  artist: string;
  filename: string;
  sourceUrl?: string;
  sourceKind?: "text";
  originalText?: string;
  warnings?: string[];
  format: string;
  tracks: { name: string; instrument: string; tuning: string }[];
  favourite: boolean;
  added: number;
  opened: number;
  data: ArrayBuffer;
}
export interface TabSearchResult {
  id: string;
  title: string;
  artist: string;
  source: string;
}
export interface TabProvider {
  id: string;
  name: string;
  search(query: string): Promise<TabSearchResult[]>;
  getTab(id: string): Promise<TabEntry | undefined>;
  getDownload?(
    id: string,
  ): Promise<{ data: ArrayBuffer; filename: string } | null>;
}
