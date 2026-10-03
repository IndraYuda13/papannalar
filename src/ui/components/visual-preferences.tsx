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
  return (
    <Context.Provider
      value={{
        ready,
        reduced: reduced || osReduced,
        light,
        saveData,
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
