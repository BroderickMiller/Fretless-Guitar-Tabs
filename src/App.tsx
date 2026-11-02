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
  Link2,
  Settings2,
  ClipboardPaste,
} from "lucide-react";
import type { TabEntry } from "./types";
import { listTabs, saveTab, deleteTab, clearTabs } from "./storage/library";
import { importTab, extensions } from "./services/import";
import { searchTabs } from "./providers/local";
import {
  importFromUrl,
  parseImportUrl,
  sourceWebsite,
  droppedUrl,
} from "./services/url-import";
import { PreferencesProvider, usePreferences } from "./settings/preferences";
import Settings from "./components/Settings";
import TextImport from "./components/TextImport";
import PlayerBoundary from "./components/PlayerBoundary";
const Player = lazy(() => import("./components/Player"));
type View = "all" | "favourites" | "recent";
export default function App() {
  return (
    <PreferencesProvider>
      <Application />
    </PreferencesProvider>
  );
}
function Application() {
  const { preferences, setPreference, light } = usePreferences();
  const [settingsOpen, setSettingsOpen] = useState(false),
    [textOpen, setTextOpen] = useState(false);
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
  const [urlOpen, setUrlOpen] = useState(false),
    [urlValue, setUrlValue] = useState(""),
    [downloading, setDownloading] = useState(false);
  const urlInput = useRef<HTMLInputElement>(null);
  const downloadController = useRef<AbortController | null>(null);
  useEffect(() => () => downloadController.current?.abort(), []);
  let website: string | null = null;
  let websiteLink = "";
  try {
    const url = parseImportUrl(urlValue);
    website = sourceWebsite(url);
    websiteLink = url.href;
  } catch {
    /* Show validation on submission. */
  }
  async function urlImport(value: string) {
    if (busy) return;
    setTextOpen(false);
    setUrlOpen(true);
    setUrlValue(value);
    setErrors([]);
    setMessage("");
    try {
      const parsed = parseImportUrl(value);
      if (sourceWebsite(parsed)) return;
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Check the link."]);
      return;
    }
    if (!navigator.onLine) {
      setErrors([
        "Connect to the internet to import a URL. Your saved tabs are still available offline.",
      ]);
      return;
    }
    setBusy(true);
    setDownloading(true);
    const controller = new AbortController();
    downloadController.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 30000);
    try {
      const tab = await importFromUrl(value, controller.signal);
      const current = await listTabs();
      controller.signal.throwIfAborted();
      if (current.some((t) => t.id === tab.id))
        setMessage("This arrangement is already in your library.");
      else {
        await saveTab(tab);
        setTabs([...current, tab]);
        setMessage(`Imported “${tab.title}” from URL.`);
        setUrlValue("");
      }
    } catch (e) {
      setErrors([
        controller.signal.aborted
          ? controller.signal.reason === "timeout"
            ? "The download timed out. Try again or download the file from its source."
            : "URL import cancelled."
          : e instanceof Error
            ? e.message
            : "The URL import could not be saved. Check browser storage.",
      ]);
    } finally {
      clearTimeout(timeout);
      downloadController.current = null;
      setBusy(false);
      setDownloading(false);
    }
  }
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
          : sort === "added"
            ? b.added - a.added
            : b.opened - a.opened || b.added - a.added,
    );
  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault();
        if (
          !selected &&
          (e.dataTransfer.types.includes("Files") ||
            e.dataTransfer.types.includes("text/uri-list"))
        )
          setDrag(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!selected) {
          if (e.dataTransfer.files.length)
            void filesImport(e.dataTransfer.files);
          else {
            const url = droppedUrl(e.dataTransfer);
            if (url) void urlImport(url);
          }
        }
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
            className={
              view === "all" && !selected && !settingsOpen ? "active" : ""
            }
            onClick={() => {
              setSelected(null);
              setSettingsOpen(false);
              setView("all");
            }}
          >
            <Library size={20} />
            Library<span>{tabs.length}</span>
          </button>
          <button
            className={
              view === "favourites" && !selected && !settingsOpen
                ? "active"
                : ""
            }
            onClick={() => {
              setSelected(null);
              setSettingsOpen(false);
              setView("favourites");
            }}
          >
            <Heart size={20} />
            Favourites<span>{tabs.filter((t) => t.favourite).length}</span>
          </button>
          <button
            className={
              view === "recent" && !selected && !settingsOpen ? "active" : ""
            }
            onClick={() => {
              setSelected(null);
              setSettingsOpen(false);
              setView("recent");
            }}
          >
            <Clock3 size={20} />
            Recently played
          </button>
        </nav>
        <button
          className="text-button settings-link"
          onClick={() => {
            setSelected(null);
            setSettingsOpen(true);
          }}
        >
          <Settings2 size={18} />
          Settings
        </button>
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
            onClick={() => setPreference("theme", light ? "dark" : "light")}
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
                  onFavourite={() => {
                    const next = {
                      ...selected,
                      favourite: !selected.favourite,
                    };
                    void update(next).then((ok) => {
                      if (ok) setSelected(next);
                    });
                  }}
                  key={selected.id}
                  tab={selected}
                  onClose={() => setSelected(null)}
                />
              </Suspense>
            </PlayerBoundary>
          ) : settingsOpen ? (
            <Settings
              count={tabs.length}
              bytes={tabs.reduce((n, t) => n + t.data.byteLength, 0)}
              onBack={() => setSettingsOpen(false)}
              onClear={async () => {
                await clearTabs();
                setTabs([]);
              }}
            />
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
              <div className="url-toggle">
                <button
                  className="text-button"
                  aria-expanded={textOpen}
                  onClick={() => {
                    setUrlOpen(false);
                    setTextOpen(!textOpen);
                  }}
                >
                  <ClipboardPaste size={17} />
                  Paste tab text
                </button>
                <button
                  className="text-button"
                  aria-expanded={urlOpen}
                  onClick={() => {
                    setTextOpen(false);
                    setUrlOpen(!urlOpen);
                    if (!urlOpen)
                      requestAnimationFrame(() => urlInput.current?.focus());
                  }}
                >
                  <Link2 size={17} />
                  Import from URL
                </button>
              </div>
              {textOpen && (
                <TextImport
                  onBusy={setBusy}
                  onClose={() => setTextOpen(false)}
                  onSave={async (tab) => {
                    const current = await listTabs();
                    if (current.some((t) => t.id === tab.id)) {
                      setMessage("This text tab is already in your library.");
                      return;
                    }
                    await saveTab(tab);
                    setTabs([...current, tab]);
                    setMessage(`Converted and saved “${tab.title}”.`);
                    setErrors([]);
                  }}
                />
              )}
              {urlOpen && (
                <section className="url-import" aria-label="Import from URL">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void urlImport(urlValue);
                    }}
                  >
                    <label htmlFor="tab-url">Paste a tab link</label>
                    <div className="url-fields">
                      <input
                        ref={urlInput}
                        id="tab-url"
                        type="url"
                        placeholder="https://example.com/song.gp"
                        value={urlValue}
                        disabled={busy}
                        onChange={(e) => setUrlValue(e.target.value)}
                        required
                      />
                      <button
                        className="primary"
                        disabled={busy || !!website}
                        type="submit"
                      >
                        {busy ? "Importing…" : "Import URL"}
                      </button>
                      {downloading && (
                        <button
                          type="button"
                          onClick={() => downloadController.current?.abort()}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <p>
                      Direct Guitar Pro files and readable text-tab pages. You
                      can also drop a link into your library.
                    </p>
                  </form>
                  {website && (
                    <div className="source-guide">
                      <strong>{website} link detected</strong>
                      <p>
                        {website === "Songsterr"
                          ? "Songsterr offers Guitar Pro downloads through Plus. Open this tab there, use its official download option, then import the downloaded file."
                          : "Open the original tab and use an authorised Guitar Pro download, then import the file here."}
                      </p>
                      <a
                        className="source-link"
                        href={websiteLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open on {website}
                        <ArrowUpRight size={15} />
                      </a>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => input.current?.click()}
                      >
                        Import downloaded file
                      </button>
                    </div>
                  )}
                </section>
              )}
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
                <div className="library-view-switch" aria-label="Library view">
                  <button
                    aria-pressed={preferences.libraryView === "list"}
                    onClick={() => setPreference("libraryView", "list")}
                  >
                    List
                  </button>
                  <button
                    aria-pressed={preferences.libraryView === "grid"}
                    onClick={() => setPreference("libraryView", "grid")}
                  >
                    Grid
                  </button>
                </div>
                {view === "all" &&
                  !query &&
                  !instrument &&
                  !format &&
                  !tuning &&
                  tabs.some((t) => t.opened > 0) && (
                    <section
                      className="recent-rail"
                      aria-label="Continue practising"
                    >
                      <h2>Continue practising</h2>
                      <div>
                        {tabs
                          .filter((t) => t.opened > 0)
                          .sort((a, b) => b.opened - a.opened)
                          .slice(0, 8)
                          .map((t) => (
                            <button
                              key={t.id}
                              aria-label={`Resume ${t.title}`}
                              onClick={() => void handleOpen(t)}
                            >
                              <Music2 size={20} />
                              <span>
                                {t.title}
                                <small>{t.artist}</small>
                              </span>
                            </button>
                          ))}
                      </div>
                    </section>
                  )}
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
                    {[...extensions, "text"].map((s) => (
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
                    <option value="added">Recently added</option>
                    <option value="title">Song A–Z</option>
                    <option value="artist">Artist A–Z</option>
                  </select>
                </div>
                {!loaded ? (
                  <div className="empty" role="status">
                    Opening your library…
                  </div>
                ) : visible.length ? (
                  <div
                    className={`song-list ${preferences.libraryView === "grid" ? "grid-view" : ""}`}
                  >
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
                          {t.originalText && (
                            <button
                              aria-label={`Export text ${t.title}`}
                              onClick={() => {
                                const url = URL.createObjectURL(
                                  new Blob([t.originalText!], {
                                    type: "text/plain",
                                  }),
                                );
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = t.filename.replace(
                                  /\.gp$/,
                                  ".txt",
                                );
                                a.click();
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  1000,
                                );
                              }}
                            >
                              <ClipboardPaste size={16} />
                            </button>
                          )}
                          {t.sourceUrl && (
                            <a
                              className="source-icon"
                              href={t.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Source for ${t.title}`}
                            >
                              <ArrowUpRight size={16} />
                            </a>
                          )}
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
                        : "Import a Guitar Pro file, paste tab text, or bring a readable tab link."}
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
              setSettingsOpen(false);
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
              setSettingsOpen(false);
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
              setSettingsOpen(false);
              setView("recent");
            }}
            aria-label="Recent"
          >
            <Clock3 size={20} />
            Recent
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setSettingsOpen(true);
            }}
            aria-label="Settings"
          >
            <Settings2 size={20} />
            Settings
          </button>
        </footer>
      </div>
      {drag && (
        <div className="drop-overlay">
          <Plus size={48} />
          <h2>Drop your music here.</h2>
          <p>Drop Guitar Pro files or a direct file link.</p>
        </div>
      )}
    </div>
  );
}
