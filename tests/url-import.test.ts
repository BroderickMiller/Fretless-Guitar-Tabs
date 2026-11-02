import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { File as NodeFile } from "node:buffer";
import { webcrypto } from "node:crypto";
import {
  importFromUrl,
  parseImportUrl,
  sourceWebsite,
  droppedUrl,
} from "../src/services/url-import";
const fixture = readFileSync("fixtures/first-light.gp");
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal("crypto", webcrypto);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;
describe("URL imports", () => {
  it("parses a direct download and retains attribution without query tokens", async () => {
    fetchMock.mockResolvedValue(
      new Response(fixture, {
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    const tab = await importFromUrl(
      "https://example.com/first-light.gp?token=private",
      signal(),
    );
    expect(tab.title).toBe("First light");
    expect(tab.sourceUrl).toBe("https://example.com/first-light.gp");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/first-light.gp?token=private",
      expect.objectContaining({
        credentials: "omit",
        referrerPolicy: "no-referrer",
        mode: "cors",
      }),
    );
  });
  it("rejects unsafe URL protocols and embedded credentials before requesting", async () => {
    for (const url of [
      "file:///song.gp",
      "javascript:alert(1)",
      "https://user:secret@example.com/song.gp",
      "bad",
    ])
      await expect(importFromUrl(url, signal())).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("recognises provider links without fetching or confusing lookalike domains", async () => {
    expect(
      sourceWebsite(
        parseImportUrl("https://www.songsterr.com/a/wsa/example-tab-s23"),
      ),
    ).toBe("Songsterr");
    expect(
      sourceWebsite(parseImportUrl("https://songsterr.com.example.org/a.gp")),
    ).toBe(null);
    await expect(
      importFromUrl(
        "https://www.songsterr.com/a/wsa/example-tab-s23",
        signal(),
      ),
    ).rejects.toThrow("official Guitar Pro download");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("explains HTML pages and HTTP failures", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>login</html>", {
        headers: { "content-type": "text/html" },
      }),
    );
    await expect(
      importFromUrl("https://example.com/song.gp", signal()),
    ).rejects.toThrow("webpage");
    fetchMock.mockResolvedValueOnce(new Response("", { status: 403 }));
    await expect(
      importFromUrl("https://example.com/song.gp", signal()),
    ).rejects.toThrow("HTTP 403");
  });
  it("limits both declared and streamed download size", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("x", {
        headers: { "content-length": String(31 * 1024 * 1024) },
      }),
    );
    await expect(
      importFromUrl("https://example.com/song.gp", signal()),
    ).rejects.toThrow("30 MB");
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array(30 * 1024 * 1024 + 1)),
    );
    await expect(
      importFromUrl("https://example.com/song.gp", signal()),
    ).rejects.toThrow("30 MB");
  });
  it("handles CORS failures, corrupt files and cancellation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(
      importFromUrl("https://example.com/song.gp", signal()),
    ).rejects.toThrow("does not allow direct browser");
    fetchMock.mockResolvedValueOnce(new Response("broken"));
    await expect(
      importFromUrl("https://example.com/song.gp", signal()),
    ).rejects.toThrow("could not be read");
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockResolvedValueOnce(new Response(fixture));
    await expect(
      importFromUrl("https://example.com/song.gp", controller.signal),
    ).rejects.toThrow();
  });
  it("extracts dropped browser links including URI-list comments", () => {
    expect(
      droppedUrl({
        getData: (t) =>
          t === "text/uri-list"
            ? "# Comment\r\nhttps://example.com/song.gp"
            : "Other text",
      }),
    ).toBe("https://example.com/song.gp");
  });
});
