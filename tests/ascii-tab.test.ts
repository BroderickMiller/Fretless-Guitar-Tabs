import { describe, expect, it } from "vitest";
import {
  AsciiTabError,
  asciiTabToAlphaTex,
  asciiTabToGp7,
  parseAsciiTab,
} from "../src/services/ascii-tab";
import { importTab } from "../src/services/import";

const SIMPLE_TAB = `
Title: Midnight Drive
Artist: The Night Owls
Tempo: 96

e|-----------------|
B|-----------------|
G|-----------------|
D|--2--4--5--7--9--|
A|--3--5--7--9--10-|
E|-----------------|
`;

const CHORD_TAB = `
e|--0-----|
B|--1-----|
G|--0-----|
D|--2-----|
A|--3-----|
E|--0-----|
`;

const DROP_D_TAB = `
e|--0--0--|
B|--3--5--|
G|--0--2--|
D|--2--4--|
A|--3--5--|
D|--0--0--|
`;

describe("parseAsciiTab", () => {
  it("reads metadata, tuning and notes from a standard tab", () => {
    const document = parseAsciiTab(SIMPLE_TAB);

    expect(document.title).toBe("Midnight Drive");
    expect(document.artist).toBe("The Night Owls");
    expect(document.tempo).toBe(96);
    expect(document.tracks).toHaveLength(1);

    const track = document.tracks[0];
    expect(track.tuning).toEqual([64, 59, 55, 50, 45, 40]);
    expect(track.bars).toHaveLength(1);

    const notes = track.bars[0].beats.flatMap((beat) => beat.notes);
    expect(notes).toHaveLength(10);
    expect(notes.map((note) => `${note.fret}.${note.string}`)).toEqual([
      "2.4",
      "3.5",
      "4.4",
      "5.5",
      "5.4",
      "7.5",
      "7.4",
      "9.5",
      "9.4",
      "10.5",
    ]);
  });

  it("groups notes in the same column as a chord", () => {
    const document = parseAsciiTab(CHORD_TAB);
    const beats = document.tracks[0].bars[0].beats;

    expect(beats).toHaveLength(1);
    expect(beats[0].notes).toHaveLength(6);
    expect(beats[0].notes.map((note) => note.string).sort()).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("infers alternate tunings from string labels", () => {
    const document = parseAsciiTab(DROP_D_TAB);
    expect(document.tracks[0].tuning).toEqual([64, 59, 55, 50, 45, 38]);
  });

  it("supports several sections separated by blank lines", () => {
    const document = parseAsciiTab(`${SIMPLE_TAB}\n\n${SIMPLE_TAB}`);
    expect(document.tracks[0].bars).toHaveLength(2);
  });

  it("rejects empty input", () => {
    expect(() => parseAsciiTab("   ")).toThrow(AsciiTabError);
    try {
      parseAsciiTab("");
    } catch (error) {
      expect((error as AsciiTabError).code).toBe("empty");
    }
  });

  it("rejects prose without tablature", () => {
    expect(() =>
      parseAsciiTab(
        "This is a review of the song. It has a nice riff and a long solo.",
      ),
    ).toThrow(/No tablature was found/);
  });
});

describe("asciiTabToAlphaTex", () => {
  it("emits metadata, a tuning and tab notes", () => {
    const document = parseAsciiTab(SIMPLE_TAB);
    const tex = asciiTabToAlphaTex(document);

    expect(tex).toContain('\\title "Midnight Drive"');
    expect(tex).toContain('\\artist "The Night Owls"');
    expect(tex).toContain("\\tempo 96");
    expect(tex).toContain("\\tuning (e4 b3 g3 d3 a2 e2)");
    expect(tex).toContain("2.4");
  });

  it("escapes quotes in metadata", () => {
    const document = parseAsciiTab(CHORD_TAB, { title: 'Say "Hello"' });
    expect(asciiTabToAlphaTex(document)).toContain('\\title "Say \\"Hello\\""');
  });
});

describe("asciiTabToGp7", () => {
  it("converts text to a score that alphaTab can re-import", async () => {
    const { document, score, data } = await asciiTabToGp7(SIMPLE_TAB);

    expect(document.title).toBe("Midnight Drive");
    expect(score.tracks).toHaveLength(1);
    expect(score.masterBars.length).toBe(1);
    expect(Array.from(data.slice(0, 2))).toEqual([80, 75]);

    const parsed = await importTab({
      name: "midnight-drive.gp",
      size: data.byteLength,
      arrayBuffer: async () => new Uint8Array(data).buffer,
    } as File);
    expect(parsed.title).toBe("Midnight Drive");
    expect(parsed.artist).toBe("The Night Owls");
    expect(parsed.tracks.length).toBe(1);
    expect(parsed.tracks[0].instrument).toBe("Guitar");
  });
});

const STRUCTURED_TAB = `
Title: Night Drive
Artist: The Night Owls
Tempo: 96

[Intro]
e|-----------|
B|-----------|
G|-----------|
D|--2--4--5--|
A|--3--5--7--|
E|-----------|

[Verse 1]
Tempo: 132
e|-----------|
B|-----------|
G|-----------|
D|--0--0--0--|
A|--2--2--2--|
E|-----------|
`;

const REPEAT_TAB = `
e|:--0--|--2--:|
B|:--1--|--3--:|
G|:--0--|--2--:|
D|:--2--|--0--:|
A|:--3--|--2--:|
E|:--0--|--3--:|
`;

const DRIFTED_CHORD_TAB = `
e|--0---|
B|---1--|
G|------|
D|------|
A|------|
E|------|
`;

const TWO_TUNING_TAB = `
e|--0--|
B|--1--|
G|--0--|
D|--2--|
A|--3--|
E|--0--|

[Chorus]
e|--0--|
B|--1--|
G|--0--|
D|--0--|
A|--3--|
D|--0--|
`;

const ROUND_TRIP_TAB = `
Title: Structure Test
Artist: Test

[Intro]
e|-----------|
B|-----------|
G|-----------|
D|--2--4--5--|
A|--3--5--7--|
E|-----------|

[Verse]
Tempo: 120
e|:--0--|--2--:|
B|:--1--|--3--:|
G|:--0--|--2--:|
D|:--2--|--0--:|
A|:--3--|--2--:|
E|:--0--|--3--:|
`;

describe("headings and structure", () => {
  it("attaches section headings to the bars that follow them", () => {
    const document = parseAsciiTab(STRUCTURED_TAB);
    const bars = document.tracks[0].bars;

    expect(bars).toHaveLength(2);
    expect(bars[0].section).toBe("Intro");
    expect(bars[1].section).toBe("Verse 1");
  });

  it("carries tempo changes from heading lines", () => {
    const document = parseAsciiTab(STRUCTURED_TAB);
    const bars = document.tracks[0].bars;

    expect(document.tempo).toBe(96);
    expect(bars[0].tempo).toBe(96);
    expect(bars[1].tempo).toBe(132);
  });

  it("does not treat metadata keys as sections", () => {
    const document = parseAsciiTab(SIMPLE_TAB);
    expect(document.tracks[0].bars[0].section).toBeUndefined();
    expect(document.tracks[0].bars[0].tempo).toBe(96);
  });

  it("reads repeat markers from the barlines", () => {
    const document = parseAsciiTab(REPEAT_TAB);
    const bars = document.tracks[0].bars;

    expect(bars).toHaveLength(2);
    expect(bars[0].repeatStart).toBe(true);
    expect(bars[0].repeatEnd).toBeUndefined();
    expect(bars[1].repeatEnd).toBe(2);
  });

  it("emits section, tempo and repeat metadata in alphaTex", () => {
    const tex = asciiTabToAlphaTex(parseAsciiTab(STRUCTURED_TAB));
    expect(tex).toContain('\\section "Intro"');
    expect(tex).toContain('\\section "Verse 1"');
    expect(tex).toContain("\\tempo 132");

    const repeatTex = asciiTabToAlphaTex(parseAsciiTab(REPEAT_TAB));
    expect(repeatTex).toContain("\\ro");
    expect(repeatTex).toContain("\\rc 2");
  });

  it("drops a repeat close that has no opener", () => {
    const tex = asciiTabToAlphaTex(
      parseAsciiTab(`
e|--0--:|
B|--1--|
G|--0--|
D|--2--|
A|--3--|
E|--0--|
`),
    );
    expect(tex).not.toContain("\\rc");
  });

  it("merges chord notes that drift by a character", () => {
    const document = parseAsciiTab(DRIFTED_CHORD_TAB);
    const beats = document.tracks[0].bars[0].beats;

    expect(beats).toHaveLength(1);
    expect(beats[0].notes).toHaveLength(2);
  });

  it("separates tuning changes into tracks and warns about them", () => {
    const document = parseAsciiTab(TWO_TUNING_TAB);

    expect(document.tracks).toHaveLength(2);
    expect(document.tracks.map((track) => track.name)).toEqual([
      "Guitar",
      "Guitar 2",
    ]);
    expect(document.warnings.join(" ")).toMatch(/changes tuning/i);
  });

  it("keeps structure through the GP7 export and re-import", async () => {
    const { data } = await asciiTabToGp7(ROUND_TRIP_TAB);
    const alphaTab = await import("@coderline/alphatab");
    const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(data);

    expect(score.masterBars).toHaveLength(3);
    expect(score.masterBars[0].section?.text).toBe("Intro");
    expect(score.masterBars[1].section?.text).toBe("Verse");
    expect(score.masterBars[1].isRepeatStart).toBe(true);
    expect(score.masterBars[1].tempoAutomations[0]?.value).toBe(120);
    expect(score.masterBars[2].repeatCount).toBe(2);
  });
});
