import { useEffect, useRef, useState } from "react";
import type { AlphaTabApi, model } from "@coderline/alphatab";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Maximize,
  Minimize,
  Repeat2,
  Volume2,
} from "lucide-react";
import type { TabEntry } from "../types";
const clock = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
export default function Player({
  tab,
  onClose,
}: {
  tab: TabEntry;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<AlphaTabApi | null>(null);
  const [score, setScore] = useState<model.Score | null>(null),
    [ready, setReady] = useState(false),
    [rendering, setRendering] = useState(true),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const [position, setPosition] = useState({ currentTime: 0, endTime: 0 }),
    [speed, setSpeed] = useState(1),
    [track, setTrack] = useState(0),
    [practice, setPractice] = useState(false),
    [loop, setLoop] = useState(false),
    [range, setRange] = useState([1, 1]);
  const [metro, setMetro] = useState(false),
    [count, setCount] = useState(false),
    [mix, setMix] = useState<
      Record<number, { mute: boolean; solo: boolean; volume: number }>
    >({});
  useEffect(() => {
    let cancelled = false;
    let instance: AlphaTabApi | undefined;
    import("@coderline/alphatab")
      .then((at) => {
        if (cancelled || !host.current) return;
        instance = new at.AlphaTabApi(host.current, {
          core: { fontDirectory: `${import.meta.env.BASE_URL}font/` },
          display: { scale: window.innerWidth < 600 ? 0.75 : 1 },
          player: {
            enablePlayer: true,
            enableCursor: true,
            enableUserInteraction: true,
            soundFont: `${import.meta.env.BASE_URL}soundfont/sonivox.sf2`,
          },
        });
        api.current = instance;
        instance.scoreLoaded.on((s) => {
          setScore(s);
          setRange([1, s.masterBars.length]);
        });
        instance.renderFinished.on(() => setRendering(false));
        instance.playerReady.on(() => setReady(true));
        instance.playerStateChanged.on((e) =>
          setPlaying(e.state === at.synth.PlayerState.Playing),
        );
        instance.playerPositionChanged.on((e) =>
          setPosition({ currentTime: e.currentTime, endTime: e.endTime }),
        );
        instance.error.on((e) => {
          setError(
            `Unable to load this arrangement or its audio: ${e.message}`,
          );
          setRendering(false);
        });
        instance.load(new Uint8Array(tab.data), [0]);
      })
      .catch(() =>
        setError(
          "The notation engine could not load. Reconnect and reload the app.",
        ),
      );
    return () => {
      cancelled = true;
      instance?.destroy();
      api.current = null;
    };
  }, [tab]);
  useEffect(() => {
    document.body.classList.toggle("practising", practice);
    return () => document.body.classList.remove("practising");
  }, [practice]);
  function updateLoop(enabled: boolean, start = range[0], end = range[1]) {
    setLoop(enabled);
    const a = api.current;
    if (!a || !score) return;
    a.playbackRange = enabled
      ? {
          startTick: score.masterBars[start - 1].start,
          endTick:
            score.masterBars[end - 1].start +
            score.masterBars[end - 1].calculateDuration(),
        }
      : null;
    a.isLooping = enabled;
  }
  function changeMix(
    index: number,
    key: "mute" | "solo" | "volume",
    value: boolean | number,
  ) {
    const a = api.current,
      t = score?.tracks[index];
    if (!a || !t) return;
    const settings = {
      ...(mix[index] ?? { mute: false, solo: false, volume: 1 }),
      [key]: value,
    };
    setMix({ ...mix, [index]: settings });
    a.changeTrackMute([t], settings.mute);
    a.changeTrackSolo([t], settings.solo);
    a.changeTrackVolume([t], settings.volume);
  }
  return (
    <section
      className={`player ${practice ? "practice" : ""}`}
      aria-label="Score player"
    >
      <div className="player-heading">
        <button className="text-button" onClick={onClose}>
          <ArrowLeft size={18} /> Library
        </button>
        <button className="text-button" onClick={() => setPractice(!practice)}>
          {practice ? <Minimize size={18} /> : <Maximize size={18} />}{" "}
          {practice ? "Exit practice" : "Practice mode"}
        </button>
      </div>
      <div className="score-heading">
        <div>
          <p className="eyebrow">ON THE MUSIC STAND</p>
          <h1>{tab.title}</h1>
          <p>{tab.artist}</p>
        </div>
        <span className="format">{tab.format.toUpperCase()}</span>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div className="score-options">
        <label>
          Track
          <select
            aria-label="Notation track"
            value={track}
            onChange={(e) => {
              const i = +e.target.value;
              setTrack(i);
              if (score) api.current?.renderTracks([score.tracks[i]]);
            }}
          >
            {tab.tracks.map((t, i) => (
              <option key={i} value={i}>
                {t.name || `Track ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <div className="score-meta">
          <span>{score?.tempo ?? "—"} BPM</span>
          <span>
            {tab.tracks[track]?.tuning || tab.tracks[track]?.instrument}
          </span>
          <span>{score?.masterBars.length ?? "—"} measures</span>
        </div>
      </div>
      {rendering && (
        <p role="status" className="notice">
          Preparing your notation…
        </p>
      )}
      <div className="score-paper">
        <div ref={host} />
      </div>
      <div className="transport">
        <div className="transport-main">
          <button
            className="play-button"
            disabled={!ready}
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => api.current?.playPause()}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button
            aria-label="Stop"
            disabled={!ready}
            onClick={() => api.current?.stop()}
          >
            <Square size={18} />
          </button>
          <span className="time">
            {clock(position.currentTime)} / {clock(position.endTime)}
          </span>
          <label className="speed">
            Speed
            <select
              value={speed}
              onChange={(e) => {
                const s = +e.target.value;
                setSpeed(s);
                if (api.current) api.current.playbackSpeed = s;
              }}
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
        </div>
        <input
          aria-label="Playback position"
          className="seek"
          type="range"
          min="0"
          max={position.endTime || 1}
          value={position.currentTime}
          disabled={!ready}
          onChange={(e) => {
            if (api.current) api.current.timePosition = +e.target.value;
          }}
        />
        <div className="practice-controls">
          <button
            aria-pressed={metro}
            onClick={() => {
              setMetro(!metro);
              if (api.current) api.current.metronomeVolume = metro ? 0 : 1;
            }}
          >
            Metronome
          </button>
          <button
            aria-pressed={count}
            onClick={() => {
              setCount(!count);
              if (api.current) api.current.countInVolume = count ? 0 : 1;
            }}
          >
            Count-in
          </button>
          <button aria-pressed={loop} onClick={() => updateLoop(!loop)}>
            <Repeat2 size={17} /> Loop
          </button>
          <label>
            From{" "}
            <input
              aria-label="Loop start measure"
              type="number"
              min="1"
              max={range[1]}
              value={range[0]}
              onChange={(e) => {
                const n = Math.max(1, Math.min(+e.target.value || 1, range[1]));
                setRange([n, range[1]]);
                updateLoop(loop, n, range[1]);
              }}
            />
          </label>
          <label>
            to{" "}
            <input
              aria-label="Loop end measure"
              type="number"
              min={range[0]}
              max={score?.masterBars.length || 1}
              value={range[1]}
              onChange={(e) => {
                const n = Math.min(
                  score?.masterBars.length || 1,
                  Math.max(range[0], +e.target.value || range[0]),
                );
                setRange([range[0], n]);
                updateLoop(loop, range[0], n);
              }}
            />
          </label>
        </div>
        {!ready && !error && (
          <p className="audio-status" role="status">
            Loading bundled audio… notation is available while you wait.
          </p>
        )}
      </div>
      <details className="mixer">
        <summary>
          <Volume2 size={18} /> Track mixer <span>Mute, solo and balance</span>
        </summary>
        {tab.tracks.map((t, i) => (
          <div className="mixer-row" key={i}>
            <span>{t.name || `Track ${i + 1}`}</span>
            <button
              aria-label={`Mute ${t.name}`}
              aria-pressed={mix[i]?.mute ?? false}
              onClick={() => changeMix(i, "mute", !mix[i]?.mute)}
            >
              M
            </button>
            <button
              aria-label={`Solo ${t.name}`}
              aria-pressed={mix[i]?.solo ?? false}
              onClick={() => changeMix(i, "solo", !mix[i]?.solo)}
            >
              S
            </button>
            <input
              aria-label={`Volume ${t.name}`}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={mix[i]?.volume ?? 1}
              onChange={(e) => changeMix(i, "volume", +e.target.value)}
            />
          </div>
        ))}
      </details>
    </section>
  );
}
