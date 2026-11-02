import { useState } from "react";
import type { TabEntry } from "../types";
import { importText } from "../services/text-import";
export default function TextImport({
  onSave,
  onClose,
  onBusy,
}: {
  onSave: (tab: TabEntry) => Promise<void>;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [text, setText] = useState(""),
    [title, setTitle] = useState(""),
    [artist, setArtist] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="url-import text-import" aria-label="Paste tab text">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          onBusy(true);
          setError("");
          try {
            await onSave(await importText(text, { title, artist }));
            onClose();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "The tab could not be saved.",
            );
          } finally {
            setBusy(false);
            onBusy(false);
          }
        }}
      >
        <h2>Paste tab text</h2>
        <p>
          Turn a text tab you have permission to use into playable notation.
          Conversion happens on this device.
        </p>
        <div className="text-metadata">
          <label>
            Title (optional)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </label>
          <label>
            Artist (optional)
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={200}
            />
          </label>
        </div>
        <label htmlFor="pasted-tab">Tab text</label>
        <textarea
          id="pasted-tab"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000000}
          spellCheck={false}
          wrap="off"
          placeholder={
            "Title: My riff\nTempo: 96\n\ne|----------------|\nB|----------------|\nG|----------------|\nD|--2---4---5---7--|\nA|----------------|\nE|----------------|"
          }
          required
          disabled={busy}
        />
        <p>
          Include 4–8 string lines with fret numbers. Tuning, section headings
          and repeat markers are recognised. Rhythm is estimated from spacing;
          techniques may be simplified.
        </p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="submit"
            className="primary"
            disabled={busy || !text.trim()}
          >
            {busy ? "Converting…" : "Convert and save tab"}
          </button>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
