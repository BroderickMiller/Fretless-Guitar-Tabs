import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { importTab } from "../src/services/import";
import { listTabs, saveTab, getTab, deleteTab } from "../src/storage/library";
import { searchTabs } from "../src/providers/local";
const fixture = readFileSync("fixtures/first-light.gp");
const file = (name = "first-light.gp", bytes = fixture) =>
  ({
    name,
    size: bytes.length,
    arrayBuffer: async () => Uint8Array.from(bytes).buffer,
  }) as File;
beforeEach(async () => {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
  for (const t of await listTabs()) await deleteTab(t.id);
});
describe("Guitar Pro import and persistent library", () => {
  it("parses a real GP7 file and persists original bytes and metadata", async () => {
    const tab = await importTab(file());
    expect(tab.title).toBe("First light");
    expect(tab.artist).toBe("Fretless");
    expect(tab.tracks[0].instrument).toBe("Guitar");
    await saveTab(tab);
    const stored = await getTab(tab.id);
    expect(new Uint8Array(stored!.data)).toEqual(new Uint8Array(tab.data));
    expect(searchTabs(await listTabs(), "FIRST LIGHT")).toHaveLength(1);
    expect(searchTabs(await listTabs(), "fretless")).toHaveLength(1);
    expect(searchTabs(await listTabs(), "missing")).toHaveLength(0);
  });
  it("identifies identical content independent of filename", async () => {
    expect((await importTab(file("renamed.gp"))).id).toBe(
      (await importTab(file())).id,
    );
  });
  it("rejects unsupported and malformed files without adding records", async () => {
    await expect(importTab(file("song.pdf"))).rejects.toThrow(
      "choose a Guitar Pro",
    );
    await expect(
      importTab(file("corrupt.gp", Buffer.from("broken"))),
    ).rejects.toThrow("could not be read");
    expect(await listTabs()).toHaveLength(0);
  });
  it("updates favourites without duplicating and removes files", async () => {
    const t = await importTab(file());
    await saveTab(t);
    await saveTab({ ...t, favourite: true });
    expect(await listTabs()).toHaveLength(1);
    expect((await getTab(t.id))?.favourite).toBe(true);
    await deleteTab(t.id);
    expect(await listTabs()).toHaveLength(0);
  });
});

it("recognises multi-track guitar, five-string bass and percussion metadata", async () => {
  const band = await importTab(
    file("three-piece.gp", readFileSync("fixtures/three-piece.gp")),
  );
  expect(band.tracks.map((t) => t.instrument)).toEqual([
    "Guitar",
    "Bass",
    "Drums",
  ]);
  expect(band.tracks[1].tuning.split(" ")).toHaveLength(5);
  expect(band.tracks[2].tuning).toBe("");
});
