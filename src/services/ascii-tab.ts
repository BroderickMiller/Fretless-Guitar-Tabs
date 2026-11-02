/**
 * Converts plain-text (ASCII) guitar tablature into an alphaTab score.
 *
 * Most tab sites present tabs as fixed-width text. We read the string lines,
 * infer the tuning from their labels, and map note columns onto a 16th-note
 * grid. The result is playable notation rather than a screenshot of text.
 *
 * This parser is intentionally conservative: it only accepts recognisable
 * tablature blocks and caps the amount of music it will convert.
 */

import type { model } from "@coderline/alphatab";
// Adapted from the user's MIT-licensed local Fretless reference.
function midiToNoteName(midi: number, includeOctave = true): string {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  return (
    names[((midi % 12) + 12) % 12] +
    (includeOctave ? Math.floor(midi / 12) - 1 : "")
  );
}

export const MAX_ASCII_BARS = 400;
export const MAX_ASCII_NOTES = 6000;
const GRID_STEPS = 16;
const MIN_LINES = 4;
const MAX_LINES = 8;

export type AsciiTabErrorCode = "empty" | "no-tabs" | "too-large";

export class AsciiTabError extends Error {
  readonly code: AsciiTabErrorCode;

  constructor(code: AsciiTabErrorCode, message: string) {
    super(message);
    this.name = "AsciiTabError";
    this.code = code;
  }
}

export interface AsciiTabNote {
  /** 1 is the highest-pitched string, matching alphaTab. */
  string: number;
  fret: number;
}

export interface AsciiTabBeat {
  /** Position on a 16th-note grid, 0–15. */
  position: number;
  duration: number;
  notes: AsciiTabNote[];
}

export interface AsciiTabBar {
  beats: AsciiTabBeat[];
  /** Section label carried over from a heading line such as `[Verse]`. */
  section?: string;
  /** Tempo change carried over from a heading line such as `Tempo: 120`. */
  tempo?: number;
  /** True when the bar is opened by `|:`. */
  repeatStart?: boolean;
  /** Number of plays for a repeat closed by `:|`, matching alphaTab's `\rc`. */
  repeatEnd?: number;
}

export interface AsciiTabTrack {
  name: string;
  /** MIDI note numbers, highest string first. */
  tuning: number[];
  bars: AsciiTabBar[];
}

export interface AsciiTabDocument {
  title: string;
  artist: string;
  album: string;
  tempo: number;
  tracks: AsciiTabTrack[];
  warnings: string[];
}

export interface AsciiTabMetadata {
  title?: string;
  artist?: string;
  album?: string;
  tempo?: number;
}

interface BarSlice {
  text: string;
  repeatStart: boolean;
  repeatEnd: number;
}

interface BlockDirectives {
  section?: string;
  tempo?: number;
}

interface TabGroup {
  lines: string[];
  directives: BlockDirectives;
}

interface StringBlock {
  lineCount: number;
  tuning: number[];
  bars: string[][];
  directives: BlockDirectives;
  repeatStarts: boolean[];
  repeatEnds: number[];
}

interface NoteLabel {
  pitchClass: number;
  octave: number | null;
}

const DEFAULT_TUNINGS: Record<number, string[]> = {
  4: ["g2", "d2", "a1", "e1"],
  5: ["g2", "d2", "a1", "e1", "b0"],
  6: ["e4", "b3", "g3", "d3", "a2", "e2"],
  7: ["e4", "b3", "g3", "d3", "a2", "e2", "b1"],
  8: ["e4", "b3", "g3", "d3", "a2", "e2", "b1", "f#1"],
};

const PITCH_CLASSES: Record<string, number> = {
  c: 0,
  "c#": 1,
  db: 1,
  d: 2,
  "d#": 3,
  eb: 3,
  e: 4,
  f: 5,
  "f#": 6,
  gb: 6,
  g: 7,
  "g#": 8,
  ab: 8,
  a: 9,
  "a#": 10,
  bb: 10,
  b: 11,
};

function parseNoteLabel(label: string): NoteLabel | null {
  const match = label.trim().match(/^([a-g])([#b]?)(\d?)$/i);
  if (!match) return null;
  const pitchClass =
    PITCH_CLASSES[`${match[1].toLowerCase()}${match[2].toLowerCase()}`];
  if (pitchClass === undefined) return null;
  return {
    pitchClass,
    octave: match[3] ? Number(match[3]) : null,
  };
}

function noteNameToMidi(note: string): number {
  const match = note.trim().match(/^([a-g])([#b]?)(\d)$/i);
  if (!match) return 60;
  const pitchClass =
    PITCH_CLASSES[`${match[1].toLowerCase()}${match[2].toLowerCase()}`] ?? 0;
  return (Number(match[3]) + 1) * 12 + pitchClass;
}

function alphaTexNote(midi: number): string {
  return midiToNoteName(midi, true).toLowerCase();
}

function nearestMidiForPitchClass(
  pitchClass: number,
  reference: number,
): number {
  let best = reference;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let midi = reference - 7; midi <= reference + 7; midi += 1) {
    if (((midi % 12) + 12) % 12 !== pitchClass) continue;
    const distance = Math.abs(midi - reference);
    if (distance < bestDistance) {
      best = midi;
      bestDistance = distance;
    }
  }
  return best;
}

function inferTuning(
  labels: Array<NoteLabel | null>,
  stringCount: number,
): number[] {
  const defaults =
    DEFAULT_TUNINGS[stringCount] ?? DEFAULT_TUNINGS[6].slice(0, stringCount);
  return defaults.map((note, index) => {
    const reference = noteNameToMidi(note);
    const label = labels[index];
    if (!label) return reference;
    if (label.octave !== null) {
      return (label.octave + 1) * 12 + label.pitchClass;
    }
    return nearestMidiForPitchClass(label.pitchClass, reference);
  });
}

/**
 * A line is a candidate when it is mostly tab punctuation and contains a run of
 * dashes. This rejects lyrics and prose that happen to include a pipe.
 */
function looksLikeTabLine(line: string): boolean {
  const trimmed = line.trimEnd();
  if (!trimmed || !trimmed.includes("|")) return false;
  if ((trimmed.match(/-/g) ?? []).length < 3) return false;
  if (!/^[\sA-Ga-g0-9#b|:.\-–—hpb/\\~xX()<>*+_=vVtT]+$/.test(trimmed))
    return false;
  const afterBar = trimmed.replace(/^[^|:]*[|:]/, "");
  const letters = afterBar.replace(/[^A-Za-z]/g, "");
  return letters.length <= 10;
}

function linePrefixAndBody(line: string): {
  prefix: string;
  body: string;
  leadingRepeat: boolean;
} {
  const separator = line.search(/[|:‖║]/);
  if (separator === -1) return { prefix: "", body: line, leadingRepeat: false };

  const isBarline = /[|‖║]/.test(line[separator]);
  const leadingRepeat = isBarline && line[separator + 1] === ":";
  return {
    prefix: line.slice(0, separator).trim(),
    body: line.slice(separator + (leadingRepeat ? 2 : 1)),
    leadingRepeat,
  };
}

/**
 * Splits one string line into bars while keeping repeat markers.
 *
 * `|:` opens a repeat, `:|` closes it (played twice), and `:|:` does both.
 * Repeat flags are read from the barlines rather than guessed, so the
 * converted score can carry the same structure as the text.
 */
function splitBars(body: string, leadingRepeat = false): BarSlice[] {
  const slices: BarSlice[] = [];
  let repeatStart = leadingRepeat;
  let start = 0;
  const barline = /:?[|‖║]:?/g;
  let match: RegExpExecArray | null;

  while ((match = barline.exec(body)) !== null) {
    const token = match[0];
    const text = body.slice(start, match.index);
    if (text.trim() !== "" || repeatStart || slices.length > 0) {
      slices.push({ text, repeatStart, repeatEnd: 0 });
    }

    if (token.startsWith(":") && slices.length > 0) {
      slices[slices.length - 1].repeatEnd = 2;
    }
    repeatStart = token.endsWith(":");
    start = match.index + token.length;
  }

  const tail = body.slice(start);
  if (tail.trim() !== "") {
    slices.push({ text: tail, repeatStart, repeatEnd: 0 });
  }

  while (slices.length > 0 && slices[slices.length - 1].text.trim() === "")
    slices.pop();
  while (slices.length > 0 && slices[0].text.trim() === "") slices.shift();
  return slices;
}

const METADATA_PREFIX =
  /^(title|song|artist|album|tempo|bpm|tuning|key|capo|track|instrument|time|time signature|tabbed by|transcribed by|author|submitted by|difficulty)\b/i;

const SECTION_KEYWORD =
  /^(intro|verse|pre[- ]?chorus|chorus|post[- ]?chorus|bridge|solo|guitar solo|outro|interlude|breakdown|riff|main riff|head|instrumental|coda|tag|ending|refrain|hook|theme|variation)\b/i;

function normaliseSection(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[:.\-–—]+$/, "")
    .trim()
    .slice(0, 60);
}

/**
 * Reads a line that is not itself tablature and may therefore be a heading.
 *
 * Recognised shapes: `[Verse 1]`, `Verse 1:`, `Chorus`, `Tempo: 96`,
 * `[Tempo 96]`, `BPM 120`. Metadata keys such as `Title:` and `Tuning:` are
 * deliberately rejected so they do not become sections.
 */
function parseDirective(raw: string): BlockDirectives {
  const line = raw.trim();
  if (!line || line.length > 80) return {};

  const directives: BlockDirectives = {};
  const plain = line
    .replace(/^[[(]+/, "")
    .replace(/[\])]+$/, "")
    .trim();
  const tempoMatch = plain.match(/^(?:tempo|bpm)\s*[:=]?\s*(\d{2,3})/i);
  if (tempoMatch) {
    const tempo = Number(tempoMatch[1]);
    if (tempo > 20 && tempo < 320) directives.tempo = tempo;
  }

  let candidate: string | null = null;
  const bracketed = line.match(/^[[(]\s*([^[\]()]{1,60}?)\s*[\])]\s*:?$/);
  if (bracketed) {
    candidate = bracketed[1];
  } else if (!line.includes("|")) {
    const labelled = line.match(/^([^:]{1,40}):\s*$/);
    if (labelled) candidate = labelled[1];
    else if (SECTION_KEYWORD.test(line)) candidate = line;
  }

  if (candidate) {
    const section = normaliseSection(candidate);
    if (
      section &&
      !METADATA_PREFIX.test(section) &&
      !/^(tempo|bpm)$/i.test(section) &&
      !/^\d+$/.test(section)
    ) {
      directives.section = section;
    }
  }

  return directives;
}

function collectGroups(lines: string[]): TabGroup[] {
  const groups: TabGroup[] = [];
  let current: string[] = [];
  let pending: BlockDirectives = {};

  const pushChunk = (chunk: string[], directives: BlockDirectives) => {
    if (chunk.length >= MIN_LINES) groups.push({ lines: chunk, directives });
  };

  const flush = () => {
    if (current.length >= MIN_LINES) {
      if (current.length <= MAX_LINES) {
        pushChunk(current, pending);
      } else {
        let first = true;
        for (let index = 0; index + MIN_LINES <= current.length; index += 6) {
          pushChunk(current.slice(index, index + 6), first ? pending : {});
          first = false;
        }
      }
    }
    current = [];
    pending = {};
  };

  for (const line of lines) {
    if (looksLikeTabLine(line)) {
      current.push(line);
      continue;
    }
    if (current.length > 0) flush();

    const directive = parseDirective(line);
    if (directive.section) pending.section = directive.section;
    if (directive.tempo !== undefined) pending.tempo = directive.tempo;
  }
  flush();
  return groups;
}

function buildBlock(group: TabGroup): StringBlock | null {
  const { lines } = group;
  const parsed = lines.map(linePrefixAndBody);
  const labels = parsed.map((entry) =>
    entry.prefix ? parseNoteLabel(entry.prefix) : null,
  );
  const stringCount = lines.length;
  const tuning = inferTuning(labels, stringCount);
  const bodies = parsed.map((entry) =>
    entry.body.replace(/\t/g, "    ").trimEnd(),
  );
  const width = Math.max(...bodies.map((body) => body.length), 1);
  const padded = bodies.map((body) => body.padEnd(width, " "));
  const slices = padded.map((body, index) =>
    splitBars(body, parsed[index].leadingRepeat),
  );
  const barCount = Math.max(...slices.map((bar) => bar.length), 0);

  const columns: string[][] = [];
  const repeatStarts: boolean[] = [];
  const repeatEnds: number[] = [];
  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const barSlices = slices.map((bar) => bar[barIndex]);
    columns.push(barSlices.map((slice) => slice?.text ?? ""));
    repeatStarts.push(barSlices.some((slice) => slice?.repeatStart === true));
    repeatEnds.push(
      Math.max(0, ...barSlices.map((slice) => slice?.repeatEnd ?? 0)),
    );
  }

  return {
    lineCount: stringCount,
    tuning,
    bars: columns,
    directives: group.directives,
    repeatStarts,
    repeatEnds,
  };
}

function beatDurationUnits(gap: number, from: number): number {
  return Math.max(1, Math.min(GRID_STEPS - from, gap));
}

function buildBar(
  stringBodies: string[],
  maxNotes: { remaining: number },
): AsciiTabBar {
  const width = Math.max(...stringBodies.map((body) => body.length), 0);
  if (width === 0 || stringBodies.every((body) => !/\d/.test(body))) {
    return { beats: [] };
  }

  const step = width / GRID_STEPS;

  interface NoteColumn {
    anchor: number;
    notes: AsciiTabNote[];
    strings: Set<number>;
  }

  const columns: NoteColumn[] = [];

  stringBodies.forEach((body, stringIndex) => {
    const string = stringIndex + 1;
    const frets = body.matchAll(/\d{1,2}/g);
    for (const match of frets) {
      if (maxNotes.remaining <= 0)
        throw new AsciiTabError(
          "too-large",
          "This tab exceeds the 6,000-note conversion limit. Import a shorter section.",
        );
      const fret = Number(match[0]);
      if (fret > 36) continue;
      const column = match.index ?? 0;

      // Chord notes share a column, but text copied from a proportional font
      // can drift by a character. Merge only across strings, so two notes in a
      // row on the same string stay separate beats.
      let nearest: NoteColumn | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of columns) {
        if (candidate.strings.has(string)) continue;
        const distance = Math.abs(candidate.anchor - column);
        if (distance <= 1 && distance < nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      }

      if (nearest) {
        nearest.notes.push({ string, fret });
        nearest.strings.add(string);
      } else {
        columns.push({
          anchor: column,
          notes: [{ string, fret }],
          strings: new Set([string]),
        });
      }
      maxNotes.remaining -= 1;
    }
  });

  const positions = new Map<number, AsciiTabNote[]>();
  for (const column of columns.sort((a, b) => a.anchor - b.anchor)) {
    const unit = Math.max(
      0,
      Math.min(GRID_STEPS - 1, Math.round(column.anchor / step)),
    );
    const notes = positions.get(unit) ?? [];
    for (const note of column.notes) {
      if (!notes.some((existing) => existing.string === note.string))
        notes.push(note);
    }
    positions.set(unit, notes);
  }

  const ordered = [...positions.entries()].sort(([a], [b]) => a - b);
  const beats: AsciiTabBeat[] = [];
  let cursor = 0;

  for (let index = 0; index < ordered.length; index += 1) {
    const [position, notes] = ordered[index];
    const start = Math.max(position, cursor);
    const nextPosition = ordered[index + 1]?.[0] ?? GRID_STEPS;
    const duration = beatDurationUnits(nextPosition - start, start);
    beats.push({ position: start, duration, notes });
    cursor = start + duration;
  }

  return { beats };
}

function blockInstrument(tuning: number[]): string {
  const lowest = Math.min(...tuning);
  return tuning.length <= 5 && lowest < 36 ? "Bass" : "Guitar";
}

function groupBlocksByTuning(blocks: StringBlock[]): AsciiTabTrack[] {
  const groups = new Map<string, StringBlock[]>();
  for (const block of blocks) {
    const key = `${block.tuning.join(",")}:${block.lineCount}`;
    const list = groups.get(key) ?? [];
    list.push(block);
    groups.set(key, list);
  }

  const tracks: AsciiTabTrack[] = [];
  const usedNames = new Map<string, number>();

  for (const group of groups.values()) {
    const first = group[0];
    const maxNotes = {
      remaining:
        MAX_ASCII_NOTES -
        tracks.reduce((sum, track) => sum + countNotes(track), 0),
    };
    const bars: AsciiTabBar[] = [];

    for (const block of group) {
      for (let index = 0; index < block.bars.length; index += 1) {
        if (bars.length >= MAX_ASCII_BARS)
          throw new AsciiTabError(
            "too-large",
            "This tab exceeds the 400-measure conversion limit. Import a shorter section.",
          );
        const bar = buildBar(block.bars[index], maxNotes);
        if (index === 0) {
          if (block.directives.section) bar.section = block.directives.section;
          if (block.directives.tempo !== undefined)
            bar.tempo = block.directives.tempo;
        }
        if (block.repeatStarts[index]) bar.repeatStart = true;
        if (block.repeatEnds[index] > 0)
          bar.repeatEnd = block.repeatEnds[index];
        bars.push(bar);
      }
    }

    if (bars.length === 0) continue;

    const base = blockInstrument(first.tuning);
    const seen = (usedNames.get(base) ?? 0) + 1;
    usedNames.set(base, seen);

    tracks.push({
      name: seen === 1 ? base : `${base} ${seen}`,
      tuning: first.tuning,
      bars,
    });
  }
  return tracks;
}

function countNotes(track: AsciiTabTrack): number {
  return track.bars.reduce(
    (total, bar) =>
      total + bar.beats.reduce((sum, beat) => sum + beat.notes.length, 0),
    0,
  );
}

function inferMetadata(
  text: string,
  supplied: AsciiTabMetadata,
): Omit<AsciiTabDocument, "tracks" | "warnings"> {
  const lines = text.split(/\r?\n/).slice(0, 40);
  let title = "";
  let artist = "";
  let album = "";
  let tempo = supplied.tempo;

  for (const line of lines) {
    const match = line.match(
      /^\s*(title|song|artist|album|tempo)\s*[:-]\s*(.+?)\s*$/i,
    );
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2];
    if ((key === "title" || key === "song") && !title) title = value;
    if (key === "artist" && !artist) artist = value;
    if (key === "album" && !album) album = value;
    if (key === "tempo" && tempo === undefined) {
      const parsed = Number(value.match(/\d{2,3}/)?.[0]);
      if (Number.isFinite(parsed) && parsed > 20 && parsed < 320)
        tempo = parsed;
    }
  }

  title = supplied.title?.trim() || title;
  artist = supplied.artist?.trim() || artist;
  album = album || supplied.album?.trim() || "";

  return {
    title: title || "Pasted tab",
    artist: artist || "Unknown artist",
    album,
    tempo: tempo && tempo > 20 && tempo < 320 ? Math.round(tempo) : 100,
  };
}

/**
 * Parses ASCII tablature. Supports guitar, bass and extended-range tab blocks,
 * chords, multi-digit frets and multiple sections. Returns a normalised
 * document that can be rendered or converted to alphaTex.
 */
export function parseAsciiTab(
  text: string,
  metadata: AsciiTabMetadata = {},
): AsciiTabDocument {
  const normalised = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
  if (!normalised.trim()) {
    throw new AsciiTabError("empty", "Paste some tablature first.");
  }
  if (normalised.length > 1_000_000) {
    throw new AsciiTabError("too-large", "That tab is too large to convert.");
  }

  const lines = normalised.split("\n");
  const groups = collectGroups(lines);
  if (groups.length === 0) {
    throw new AsciiTabError(
      "no-tabs",
      "No tablature was found. Include at least four string lines with dashes and fret numbers.",
    );
  }

  const blocks = groups
    .map(buildBlock)
    .filter((block): block is StringBlock => block !== null);
  const tracks = groupBlocksByTuning(blocks);
  if (tracks.length === 0 || tracks.every((track) => countNotes(track) === 0)) {
    throw new AsciiTabError(
      "no-tabs",
      "That text contains tab lines but no fret numbers to play.",
    );
  }

  const inferred = inferMetadata(normalised, metadata);
  const warnings: string[] = [
    "Timing is estimated from text spacing on a 4/4 grid. Playing techniques such as bends, slides and hammer-ons are not reconstructed.",
  ];
  if (tracks.some((track) => track.bars.length > 120)) {
    warnings.push(
      "The tab is long, so only the first part may be comfortable to practise.",
    );
  }
  if (new Set(tracks.map((track) => track.tuning.join(","))).size > 1) {
    warnings.push(
      "This tab changes tuning. Each tuning is stored as its own track, so play them one at a time.",
    );
  }

  return { ...inferred, tracks, warnings };
}

function escapeAlphaTex(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function durationToken(units: number): string {
  if (units >= 16) return ":1";
  if (units >= 8) return ":2";
  if (units >= 4) return ":4";
  if (units >= 2) return ":8";
  return ":16";
}

/** Splits a duration into power-of-two tokens so the beat grid stays intact. */
function durationTokens(units: number): string[] {
  const tokens: string[] = [];
  let remaining = Math.max(1, units);
  while (remaining > 0) {
    const chunk =
      remaining >= 16
        ? 16
        : remaining >= 8
          ? 8
          : remaining >= 4
            ? 4
            : remaining >= 2
              ? 2
              : 1;
    tokens.push(durationToken(chunk));
    remaining -= chunk;
  }
  return tokens;
}

/**
 * Drops repeat markers that do not pair up, so alphaTab never receives an
 * unclosed `\ro` or an orphaned `\rc`.
 */
function normaliseRepeats(bars: AsciiTabBar[]): AsciiTabBar[] {
  const copy = bars.map((bar) => ({ ...bar }));
  const open: number[] = [];

  for (let index = 0; index < copy.length; index += 1) {
    if (copy[index].repeatStart) open.push(index);
    if (copy[index].repeatEnd) {
      if (open.length === 0) delete copy[index].repeatEnd;
      else open.pop();
    }
  }
  for (const index of open) delete copy[index].repeatStart;

  return copy;
}

function alphaTexBar(bar: AsciiTabBar, includeScoreMeta: boolean): string {
  const meta: string[] = [];
  if (bar.section && includeScoreMeta)
    meta.push(`\\section "${escapeAlphaTex(bar.section)}"`);
  if (bar.tempo !== undefined && includeScoreMeta)
    meta.push(`\\tempo ${bar.tempo}`);
  if (bar.repeatStart) meta.push("\\ro");
  if (bar.repeatEnd) meta.push(`\\rc ${bar.repeatEnd}`);

  const tokens: string[] = [];
  let cursor = 0;

  for (const beat of bar.beats) {
    if (beat.position > cursor) {
      for (const token of durationTokens(beat.position - cursor))
        tokens.push(`${token} r`);
    }

    const noteText = beat.notes
      .slice()
      .sort((a, b) => a.string - b.string)
      .map((note) => `${note.fret}.${note.string}`)
      .join(" ");
    const chord = beat.notes.length > 1 ? `(${noteText})` : noteText;
    const duration = durationTokens(beat.duration);
    tokens.push(`${duration[0]} ${chord}`);
    for (const token of duration.slice(1)) tokens.push(`${token} r`);
    cursor = beat.position + beat.duration;
  }

  if (cursor < GRID_STEPS) {
    for (const token of durationTokens(GRID_STEPS - cursor))
      tokens.push(`${token} r`);
  }

  const content = tokens.length > 0 ? tokens.join(" ") : ":1 r";
  return [...meta, content].join(" ");
}

/** Builds alphaTex source from a parsed ASCII tab document. */
export function asciiTabToAlphaTex(document: AsciiTabDocument): string {
  const lines: string[] = [
    `\\title "${escapeAlphaTex(document.title)}"`,
    `\\artist "${escapeAlphaTex(document.artist)}"`,
  ];
  if (document.album) lines.push(`\\album "${escapeAlphaTex(document.album)}"`);
  lines.push(`\\tempo ${document.tempo}`);

  document.tracks.forEach((track, trackIndex) => {
    lines.push(`\\track "${escapeAlphaTex(track.name)}"`);
    lines.push(`\\instrument ${track.name.startsWith("Bass") ? 34 : 25}`);
    lines.push(
      `\\staff{score tabs} \\tuning (${track.tuning.map(alphaTexNote).join(" ")})`,
    );
    const bars = normaliseRepeats(track.bars).map((bar) =>
      alphaTexBar(bar, trackIndex === 0),
    );
    lines.push(bars.join(" |\n"));
  });

  return lines.join("\n");
}

/** Converts ASCII tablature directly into an in-memory alphaTab score. */
export async function asciiTabToScore(
  text: string,
  metadata: AsciiTabMetadata = {},
): Promise<{ document: AsciiTabDocument; score: model.Score }> {
  const document = parseAsciiTab(text, metadata);
  const alphaTab = await import("@coderline/alphatab");
  const score = alphaTab.importer.ScoreLoader.loadAlphaTex(
    asciiTabToAlphaTex(document),
  );
  return { document, score };
}

/** Serialises ASCII tablature as a GP7 file so the normal import pipeline can store it. */
export async function asciiTabToGp7(
  text: string,
  metadata: AsciiTabMetadata = {},
): Promise<{
  document: AsciiTabDocument;
  score: model.Score;
  data: Uint8Array;
}> {
  const { document, score } = await asciiTabToScore(text, metadata);
  const alphaTab = await import("@coderline/alphatab");
  const data = new alphaTab.exporter.Gp7Exporter().export(score);
  return { document, score, data };
}
