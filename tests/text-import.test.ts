import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { File as NodeFile } from "node:buffer";
import { importText, extractTextTab } from "../src/services/text-import";
import { importFromUrl } from "../src/services/url-import";
import { saveTab, getTab, deleteTab } from "../src/storage/library";
import { readPreferences, defaults } from "../src/settings/preferences";
const text =
  "Title: Evening exercise\nArtist: Fretless\nTempo: 96\n[Intro]\ne|----------------|\nB|----------------|\nG|----------------|\nD|--2---4---5---7--|\nA|----------------|\nE|----------------|";
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("File", NodeFile);
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());
describe("text tab conversion and storage", () => {
  it("creates a playable, persisted GP score without changing the library schema", async () => {
    const t = await importText(text);
    expect(t.format).toBe("text");
    expect(t.title).toBe("Evening exercise");
    expect(t.warnings?.[0]).toMatch(/Timing is estimated/);
    expect(Array.from(new Uint8Array(t.data).slice(0, 2))).toEqual([80, 75]);
    await saveTab(t);
    const stored = await getTab(t.id);
    expect(stored?.originalText).toBe(text);
    expect(stored?.tracks[0].instrument).toBe("Guitar");
    await deleteTab(t.id);
  });
  it("deduplicates text across line-ending differences and honours user metadata", async () => {
    expect((await importText(text)).id).toBe(
      (await importText(text.replace(/\n/g, "\r\n"))).id,
    );
    const t = await importText(text, { title: "My practice", artist: "Me" });
    expect(t.title).toBe("My practice");
    expect(t.artist).toBe("Me");
  });
  it("extracts inert preformatted page text without including embedded scripts", () => {
    const page = extractTextTab(
      `<title>Exercise</title><script>window.bad = true</script><pre>${text}</pre><img src="https://example.com/tracker"/><style>bad</style>`,
    );
    expect(page.text).toBe(text);
    expect(page.title).toBe("Exercise");
    expect(page.text).not.toContain("window.bad");
  });
  it("converts a CORS-readable HTML tab page through the URL pipeline", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(`<title>Page</title><pre>${text}</pre>`, {
            headers: { "content-type": "text/html" },
          }),
        ),
    );
    const t = await importFromUrl(
      "https://example.com/exercise",
      new AbortController().signal,
    );
    expect(t.sourceUrl).toBe("https://example.com/exercise");
    expect(t.format).toBe("text");
    expect(t.title).toBe("Page");
  });
  it("rejects empty prose and oversized text instead of fabricating notes", async () => {
    await expect(importText("hello")).rejects.toThrow("No tablature");
    await expect(importText("x".repeat(1000001))).rejects.toThrow("too large");
  });
});
it("validates preferences and migrates the existing theme key", () => {
  expect(readPreferences()).toEqual(defaults);
  localStorage.setItem("fretless-theme", "light");
  expect(readPreferences().theme).toBe("light");
  localStorage.setItem(
    "fretless-preferences",
    JSON.stringify({
      theme: "system",
      playbackSpeed: 999,
      notationDisplay: "tabs",
      libraryView: "grid",
    }),
  );
  expect(readPreferences()).toMatchObject({
    theme: "system",
    playbackSpeed: 1,
    notationDisplay: "tabs",
    libraryView: "grid",
  });
});
