import type { TabEntry } from "../types";
export const extensions = ["gp3", "gp4", "gp5", "gpx", "gp"];
export async function importTab(file: File): Promise<TabEntry> {
  const format = file.name.split(".").pop()?.toLowerCase() || "";
  if (!extensions.includes(format))
    throw new Error(
      `${file.name}: choose a Guitar Pro file (.gp3, .gp4, .gp5, .gpx or .gp).`,
    );
  if (file.size > 30 * 1024 * 1024)
    throw new Error(`${file.name}: files must be smaller than 30 MB.`);
  const data = await file.arrayBuffer();
  const at = await import("@coderline/alphatab");
  let score;
  try {
    score = at.importer.ScoreLoader.loadScoreFromBytes(
      new Uint8Array(data),
      new at.Settings(),
    );
  } catch {
    throw new Error(
      `${file.name}: this file could not be read. It may be damaged or an unsupported Guitar Pro variant.`,
    );
  }
  if (!score.tracks.length)
    throw new Error(`${file.name}: no playable tracks found.`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const id = Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  return {
    id,
    title: score.title.trim() || file.name.replace(/\.[^.]+$/, ""),
    artist: score.artist.trim() || "Unknown artist",
    filename: file.name,
    format,
    tracks: score.tracks.map((t) => ({
      name: t.name,
      instrument: t.isPercussion
        ? "Drums"
        : t.playbackInfo.program >= 32 && t.playbackInfo.program <= 39
          ? "Bass"
          : t.playbackInfo.program >= 24 && t.playbackInfo.program <= 31
            ? "Guitar"
            : "Other",
      tuning: t.isPercussion
        ? ""
        : t.staves
            .map((s) =>
              s.stringTuning.tunings
                .map((n) => at.model.Tuning.getTextForTuning(n, false))
                .join(" "),
            )
            .filter(Boolean)
            .join(" / "),
    })),
    favourite: false,
    added: Date.now(),
    opened: 0,
    data,
  };
}
