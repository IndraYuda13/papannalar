"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const Context = createContext({
  ready: false,
  reduced: false,
  light: false,
  saveData: false,
  setReduced: (value: boolean) => {
    void value;
  },
  setLight: (value: boolean) => {
    void value;
  },
});
const KEY = "pn-visual-preferences-v1";
export function VisualPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false),
    [reduced, setReduced] = useState(false),
    [light, setLight] = useState(false),
    [osReduced, setOsReduced] = useState(false),
    [saveData, setSaveData] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setOsReduced(media.matches);
      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
      setSaveData(connection?.saveData === true);
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
        if (saved && typeof saved === "object") {
          setReduced("reduced" in saved && saved.reduced === true);
          setLight("light" in saved && saved.light === true);
        }
      } catch {
        /* Unavailable storage keeps the safe session defaults. */
      }
      setReady(true);
    };
    const timer = setTimeout(sync, 0);
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timer);
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  function save(nextReduced: boolean, nextLight: boolean) {
    setReduced(nextReduced);
    setLight(nextLight);
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ reduced: nextReduced, light: nextLight }),
      );
    } catch {
      /* RAM preference remains usable. */
    }
  }
  return (
    <Context.Provider
      value={{
        ready,
        reduced: reduced || osReduced,
        light,
        saveData,
        setReduced: (value) => save(value, light),
        setLight: (value) => save(reduced, value),
      }}
    >
      <div
        className="visual-preferences"
        data-reduced-motion={reduced || osReduced}
        data-light-display={light}
      >
        {children}
      </div>
    </Context.Provider>
  );
}
export function useVisualPreferences() {
  return useContext(Context);
}
export function VisualSettings() {
  const preferences = useVisualPreferences();
  return (
    <details className="studio-visual-settings">
      <summary>Tampilan nyaman</summary>
      <label>
        <input
          type="checkbox"
          checked={preferences.reduced}
          onChange={(e) => preferences.setReduced(e.target.checked)}
        />
        Kurangi animasi
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.light}
          onChange={(e) => preferences.setLight(e.target.checked)}
        />
        Tampilan ringan
      </label>
    </details>
  );
}
