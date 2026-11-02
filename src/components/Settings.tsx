import { useEffect, useState } from "react";
import { usePreferences, type Preferences } from "../settings/preferences";
export default function Settings({
  count,
  bytes,
  onBack,
  onClear,
}: {
  count: number;
  bytes: number;
  onBack: () => void;
  onClear: () => Promise<void>;
}) {
  const { preferences, setPreference } = usePreferences();
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [quota, setQuota] = useState<number | null>(null);
  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setQuota(e.quota ?? null))
      .catch(() => {});
  }, []);
  function choice<K extends keyof Preferences>(
    label: string,
    key: K,
    options: { label: string; value: Preferences[K] }[],
  ) {
    return (
      <label className="setting-row">
        <span>{label}</span>
        <select
          aria-label={label}
          value={String(preferences[key])}
          onChange={(e) => setPreference(key, e.target.value as Preferences[K])}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function toggle(
    label: string,
    key: "reduceMotion" | "metronome" | "countIn" | "showTracksPanel",
  ) {
    return (
      <label className="setting-row">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={preferences[key]}
          onChange={(e) => setPreference(key, e.target.checked)}
        />
      </label>
    );
  }
  return (
    <section className="settings">
      <button className="text-button" onClick={onBack}>
        ← Back to library
      </button>
      <h1>Settings</h1>
      <div className="settings-grid">
        <section>
          <h2>Appearance</h2>
          {choice("Theme", "theme", [
            { label: "Dark", value: "dark" },
            { label: "Light", value: "light" },
            { label: "System", value: "system" },
          ])}
          {toggle("Reduce motion", "reduceMotion")}
          {choice("Library view", "libraryView", [
            { label: "List", value: "list" },
            { label: "Grid", value: "grid" },
          ])}
        </section>
        <section>
          <h2>Notation</h2>
          {choice("Default layout", "notationLayout", [
            { label: "Page view", value: "page" },
            { label: "Line view", value: "horizontal" },
          ])}
          {choice("Notation display", "notationDisplay", [
            { label: "Both", value: "both" },
            { label: "Standard notation", value: "notation" },
            { label: "Tablature", value: "tabs" },
          ])}
          {toggle("Open track mixer by default", "showTracksPanel")}
        </section>
        <section>
          <h2>Practice defaults</h2>
          {toggle("Metronome", "metronome")}
          {toggle("Count-in", "countIn")}
          <label className="setting-row">
            <span>Playback speed</span>
            <select
              aria-label="Playback speed"
              value={preferences.playbackSpeed}
              onChange={(e) => setPreference("playbackSpeed", +e.target.value)}
            >
              {[0.25, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5].map(
                (s) => (
                  <option key={s} value={s}>
                    {Math.round(s * 100)}%
                  </option>
                ),
              )}
            </select>
          </label>
          <p>
            Space: play/pause · ←/→: previous/next measure · [ / ]: speed · L:
            loop · M: metronome · Esc: stop
          </p>
        </section>
        <section>
          <h2>Storage</h2>
          <p>
            {count} arrangements · {(bytes / 1024 / 1024).toFixed(2)} MB of
            original scores
            {quota
              ? ` · ${(quota / 1024 / 1024).toFixed(0)} MB browser quota`
              : ""}
          </p>
          <p>
            Keep copies of your original files. Clearing your library removes
            its files and metadata from this browser.
          </p>
          {!confirm ? (
            <button
              className="danger-button"
              disabled={!count}
              onClick={() => setConfirm(true)}
            >
              Clear library
            </button>
          ) : (
            <div className="notice">
              <p>Remove all {count} arrangements? This cannot be undone.</p>
              <button
                className="danger-button"
                onClick={async () => {
                  try {
                    await onClear();
                    setConfirm(false);
                  } catch {
                    setError("The library could not be cleared.");
                  }
                }}
              >
                Confirm clear library
              </button>
              <button onClick={() => setConfirm(false)}>Keep library</button>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
        </section>
        <section>
          <h2>About Fretless</h2>
          <p>
            Free, open source and local-first. No ads, tracking or accounts.
          </p>
          <a
            className="source-link"
            href="https://github.com/BroderickMiller/Fretless-Guitar-Tabs"
            target="_blank"
            rel="noreferrer"
          >
            Source and MIT licence ↗
          </a>
        </section>
      </div>
    </section>
  );
}
