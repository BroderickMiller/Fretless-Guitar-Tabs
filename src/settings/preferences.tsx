import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export interface Preferences {
  theme: "dark" | "light" | "system";
  libraryView: "list" | "grid";
  notationLayout: "page" | "horizontal";
  notationDisplay: "both" | "notation" | "tabs";
  metronome: boolean;
  countIn: boolean;
  playbackSpeed: number;
  reduceMotion: boolean;
  showTracksPanel: boolean;
}
export const defaults: Preferences = {
  theme: "dark",
  libraryView: "list",
  notationLayout: "page",
  notationDisplay: "both",
  metronome: false,
  countIn: false,
  playbackSpeed: 1,
  reduceMotion: false,
  showTracksPanel: false,
};
const KEY = "fretless-preferences";
export function readPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "{}");
    const result = { ...defaults };
    for (const key of [
      "metronome",
      "countIn",
      "reduceMotion",
      "showTracksPanel",
    ] as const)
      if (typeof p[key] === "boolean") result[key] = p[key];
    if (["dark", "light", "system"].includes(p.theme)) result.theme = p.theme;
    else if (localStorage.getItem("fretless-theme") === "light")
      result.theme = "light";
    if (["list", "grid"].includes(p.libraryView))
      result.libraryView = p.libraryView;
    if (["page", "horizontal"].includes(p.notationLayout))
      result.notationLayout = p.notationLayout;
    if (["both", "notation", "tabs"].includes(p.notationDisplay))
      result.notationDisplay = p.notationDisplay;
    if (
      [0.25, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5].includes(
        p.playbackSpeed,
      )
    )
      result.playbackSpeed = p.playbackSpeed;
    return result;
  } catch {
    return { ...defaults };
  }
}
type Update = <K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
) => void;
const Context = createContext<{
  preferences: Preferences;
  setPreference: Update;
  light: boolean;
}>({ preferences: defaults, setPreference: () => {}, light: false });
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences),
    [systemLight, setSystemLight] = useState(
      () =>
        window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false,
    );
  const light =
    preferences.theme === "light" ||
    (preferences.theme === "system" && systemLight);
  useEffect(() => {
    const q = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!q) return;
    const change = () => setSystemLight(q.matches);
    q.addEventListener("change", change);
    return () => q.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    document.documentElement.dataset.reduceMotion = String(
      preferences.reduceMotion,
    );
    try {
      localStorage.setItem(KEY, JSON.stringify(preferences));
      localStorage.setItem("fretless-theme", light ? "light" : "dark");
    } catch {
      /* Optional preferences must not block practice. */
    }
  }, [preferences, light]);
  const setPreference: Update = (key, value) =>
    setPreferences((p) => ({ ...p, [key]: value }));
  return (
    <Context.Provider value={{ preferences, setPreference, light }}>
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  return useContext(Context);
}
