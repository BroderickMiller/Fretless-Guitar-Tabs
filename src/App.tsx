import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Library,
  Heart,
  Clock3,
  Plus,
  Search,
  ArrowUpRight,
  Music2,
  Trash2,
  Sun,
  Moon,
  Download,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import type { TabEntry } from "./types";
import { listTabs, saveTab, deleteTab } from "./storage/library";
import { importTab, extensions } from "./services/import";
import { searchTabs } from "./providers/local";
import PlayerBoundary from "./components/PlayerBoundary";
const Player = lazy(() => import("./components/Player"));
type View = "all" | "favourites" | "recent";
export default function App() {
  const [tabs, setTabs] = useState<TabEntry[]>([]),
    [loaded, setLoaded] = useState(false),
    [view, setView] = useState<View>("all"),
    [query, setQuery] = useState(""),
    [instrument, setInstrument] = useState(""),
    [format, setFormat] = useState(""),
    [tuning, setTuning] = useState(""),
    [sort, setSort] = useState("recent"),
    [selected, setSelected] = useState<TabEntry | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<string[]>([]),
    [drag, setDrag] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [cached, setCached] = useState(false);
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem("fretless-theme") === "light";
    } catch {
      return false;
    }
  });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    listTabs()
      .then(setTabs)
      .catch(() =>
        setErrors([
          "Your library storage could not be opened. Check that this browser allows site storage.",
        ]),
      )
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    try {
      localStorage.setItem("fretless-theme", light ? "light" : "dark");
    } catch {
      /* Preferences are optional when storage is blocked. */
    }
  }, [light]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const cache = () => setCached(true);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("fretless-offline-ready", cache);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("fretless-offline-ready", cache);
    };
  }, []);
  async function filesImport(files: FileList | File[]) {
    if (busy) return;
    setBusy(true);
    setErrors([]);
    setMessage("");
    let added = 0,
      duplicates = 0;
    const failures: string[] = [];
    try {
      const current = await listTabs();
      for (const file of Array.from(files)) {
        try {
          const tab = await importTab(file);
          if (current.some((t) => t.id === tab.id)) {
            duplicates++;
            continue;
          }
          await saveTab(tab);
          current.push(tab);
          added++;
        } catch (e) {
          failures.push(
            e instanceof Error
              ? e.message
              : "Import failed. Your device storage may be full.",
          );
        }
      }
      setTabs(current);
      setMessage(
        `${added} ${added === 1 ? "arrangement" : "arrangements"} imported${duplicates ? ` · ${duplicates} already in your library` : ""}.`,
      );
    } catch {
      failures.push(
        "Could not save to your library. Check browser storage permissions and available space.",
      );
    }
    setErrors(failures);
    setBusy(false);
    if (input.current) input.current.value = "";
  }
  async function update(tab: TabEntry) {
    try {
      await saveTab(tab);
      setTabs((prev) => prev.map((t) => (t.id === tab.id ? tab : t)));
      return true;
    } catch {
      setErrors([
        "Changes could not be saved. Check your available device storage.",
      ]);
      return false;
    }
  }
  async function handleOpen(tab: TabEntry) {
    const next = { ...tab, opened: new Date().getTime() };
    await update(next);
    setSelected(next);
  }
  async function remove(tab: TabEntry) {
    try {
      await deleteTab(tab.id);
      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      setMessage(`Removed “${tab.title}”.`);
    } catch {
      setErrors(["This arrangement could not be removed."]);
    }
  }
  function download(tab: TabEntry) {
    const url = URL.createObjectURL(new Blob([tab.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = tab.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visible = searchTabs(tabs, query)
    .filter(
      (t) =>
        (view !== "favourites" || t.favourite) &&
        (view !== "recent" || t.opened > 0) &&
        (!instrument || t.tracks.some((x) => x.instrument === instrument)) &&
        (!format || t.format === format) &&
        (!tuning || t.tracks.some((x) => x.tuning === tuning)),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "artist"
          ? a.artist.localeCompare(b.artist)
          : b.opened - a.opened || b.added - a.added,
    );
  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault();
        if (!selected) setDrag(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!selected) void filesImport(e.dataTransfer.files);
      }}
    >
      <a className="skip-link" href="#main">
        Skip to music
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Fretless home"
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          fretless<span className="brand-dot">.</span>
        </a>
        <p className="sidebar-label">YOUR SPACE</p>
        <nav aria-label="Library">
          <button
            className={view === "all" && !selected ? "active" : ""}
            onClick={() => {
              setSelected(null);
              setView("all");
            }}
          >
            <Library size={20} />
            Library<span>{tabs.length}</span>
          </button>
          <button
            className={view === "favourites" && !selected ? "active" : ""}
            onClick={() => {
              setSelected(null);
              setView("favourites");
            }}
          >
            <Heart size={20} />
            Favourites<span>{tabs.filter((t) => t.favourite).length}</span>
          </button>
          <button
            className={view === "recent" && !selected ? "active" : ""}
            onClick={() => {
              setSelected(null);
              setView("recent");
            }}
          >
            <Clock3 size={20} />
            Recently played
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy">
            <ShieldCheck size={20} />
            <div>
              Your library, yours alone.
              <small>Saved on this device. Never uploaded.</small>
            </div>
          </div>
          <a
            href="https://github.com/BroderickMiller/Fretless-Guitar-Tabs"
            target="_blank"
            rel="noreferrer"
          >
            Open source. Always free.
            <ArrowUpRight size={15} />
          </a>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span className="breadcrumb">YOUR PERSONAL PRACTICE SPACE</span>
          <span className="connection">
            {offline ? (
              <>
                <WifiOff size={14} /> Offline
              </>
            ) : cached ? (
              "Ready for offline use"
            ) : (
              "Local-first · No account needed"
            )}
          </span>
          <button
            className="icon-button"
            aria-label={light ? "Use dark theme" : "Use light theme"}
            onClick={() => setLight(!light)}
          >
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>
        <main id="main">
          {selected ? (
            <PlayerBoundary key={selected.id} onClose={() => setSelected(null)}>
              <Suspense
                fallback={<p role="status">Loading notation engine…</p>}
              >
                <Player
                  key={selected.id}
                  tab={selected}
                  onClose={() => setSelected(null)}
                />
              </Suspense>
            </PlayerBoundary>
          ) : (
            <>
              <section className="intro">
                <div>
                  <p className="eyebrow">LESS NOISE. MORE MUSIC.</p>
                  <h1>
                    {view === "favourites"
                      ? "The ones you love."
                      : view === "recent"
                        ? "Pick up where you left off."
                        : "Your music. Your pace."}
                  </h1>
                  <p>A little less searching. A little more playing.</p>
                </div>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  <Plus size={19} />
                  {busy ? "Importing…" : "Import tabs"}
                </button>
              </section>
              <input
                ref={input}
                type="file"
                className="sr-only"
                aria-label="Import Guitar Pro files"
                accept={extensions.map((x) => "." + x).join(",")}
                multiple
                onChange={(e) => {
                  if (e.target.files) void filesImport(e.target.files);
                }}
              />
              {message && (
                <p role="status" className="notice">
                  {message}
                </p>
              )}
              {errors.length > 0 && (
                <div role="alert" className="notice error">
                  {errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
              <section className="library-section" aria-label="Music library">
                <div className="section-heading">
                  <h2>
                    {view === "all"
                      ? "Your library"
                      : view === "favourites"
                        ? "Favourites"
                        : "Recently played"}{" "}
                    <span>{visible.length}</span>
                  </h2>
                  <span className="device-label">STORED ON THIS DEVICE</span>
                </div>
                <div className="filters">
                  <label className="search">
                    <Search size={19} />
                    <input
                      aria-label="Search title or artist"
                      placeholder="Find a song or artist…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        ×
                      </button>
                    )}
                  </label>
                  <select
                    aria-label="Filter by instrument"
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                  >
                    <option value="">All instruments</option>
                    {["Guitar", "Bass", "Drums", "Other"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="">All formats</option>
                    {extensions.map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by tuning"
                    value={tuning}
                    onChange={(e) => setTuning(e.target.value)}
                  >
                    <option value="">All tunings</option>
                    {[
                      ...new Set(
                        tabs
                          .flatMap((t) => t.tracks.map((x) => x.tuning))
                          .filter(Boolean),
                      ),
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Sort library"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recent">Recently opened</option>
                    <option value="title">Song A–Z</option>
                    <option value="artist">Artist A–Z</option>
                  </select>
                </div>
                {!loaded ? (
                  <div className="empty" role="status">
                    Opening your library…
                  </div>
                ) : visible.length ? (
                  <div className="song-list">
                    <div className="list-heading">
                      <span>ARRANGEMENT</span>
                      <span>INSTRUMENT / TUNING</span>
                      <span>FORMAT</span>
                      <span />
                    </div>
                    {visible.map((t, i) => (
                      <article className="song" key={t.id}>
                        <button
                          className="song-open"
                          onClick={() => void handleOpen(t)}
                        >
                          <span className={`cover cover-${i % 4}`}>
                            <Music2 size={24} />
                          </span>
                          <span>
                            <strong>{t.title}</strong>
                            <small>{t.artist}</small>
                          </span>
                        </button>
                        <div className="song-info">
                          <span>
                            {[
                              ...new Set(t.tracks.map((x) => x.instrument)),
                            ].join(" · ")}
                          </span>
                          <small>
                            {t.tracks[0]?.tuning || `${t.tracks.length} tracks`}
                          </small>
                        </div>
                        <span className="format">{t.format.toUpperCase()}</span>
                        <div className="song-actions">
                          <button
                            aria-label={`${t.favourite ? "Unfavourite" : "Favourite"} ${t.title}`}
                            aria-pressed={t.favourite}
                            onClick={() =>
                              void update({ ...t, favourite: !t.favourite })
                            }
                          >
                            <Heart
                              size={18}
                              fill={t.favourite ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            aria-label={`Download ${t.title}`}
                            onClick={() => download(t)}
                          >
                            <Download size={17} />
                          </button>
                          <button
                            aria-label={`Remove ${t.title}`}
                            onClick={() => void remove(t)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <div className="empty-art">
                      <span />
                      <span />
                      <Music2 size={38} />
                      <span />
                      <span />
                    </div>
                    <p className="eyebrow">MAKE ROOM FOR THE MUSIC</p>
                    <h2>
                      {tabs.length
                        ? "Nothing here just yet."
                        : "Every good session starts with a song."}
                    </h2>
                    <p>
                      {tabs.length
                        ? "Try a different search or filter, or add another arrangement."
                        : "Bring your Guitar Pro files. We’ll take care of the music stand."}
                    </p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => input.current?.click()}
                    >
                      <Plus size={18} />
                      {busy ? "Importing…" : "Import your first tab"}
                    </button>
                    <small>
                      Drop files here, or browse your device.
                      <br />
                      Guitar Pro files · Individual variants are validated on
                      import
                    </small>
                  </div>
                )}
              </section>
              <div className="library-footer">
                <span>
                  <ShieldCheck size={16} /> Private by design. No ads. No
                  tracking.
                </span>
                <span>Made for the time between everything else.</span>
              </div>
              <p className="storage-note">
                Keep a copy of your original files. Clearing this browser’s site
                data removes your library.
              </p>
            </>
          )}
        </main>
        <footer className="mobile-nav">
          <button
            onClick={() => {
              setSelected(null);
              setView("all");
            }}
            aria-label="Library"
          >
            <Library size={20} />
            Library
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setView("favourites");
            }}
            aria-label="Favourites"
          >
            <Heart size={20} />
            Favourites
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setView("recent");
            }}
            aria-label="Recent"
          >
            <Clock3 size={20} />
            Recent
          </button>
        </footer>
      </div>
      {drag && (
        <div className="drop-overlay">
          <Plus size={48} />
          <h2>Drop your music here.</h2>
          <p>Guitar Pro files stay on this device.</p>
        </div>
      )}
    </div>
  );
}
