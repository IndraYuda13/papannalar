"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { readBoardProfile } from "./capability-storage";
import {
  createAppearanceStore,
  type AppearanceProfile,
  type AppearanceSnapshot,
} from "./appearance-profile";

const store = createAppearanceStore(() => window.localStorage);
type AppearanceContext = {
  ready: boolean;
  editing: boolean;
  firstUse: boolean;
  profile?: AppearanceProfile;
  draft?: AppearanceProfile;
  notice: string;
  openAppearance: () => void;
  cancelAppearance: () => void;
  changeAppearance: (profile: AppearanceProfile) => void;
  saveAppearance: () => void;
};
const Context = createContext<AppearanceContext | null>(null);
export function useBoardAppearance() {
  const context = useContext(Context);
  if (!context) throw new Error("BoardAppearanceProvider is required");
  return context;
}
export function BoardAppearanceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppearanceSnapshot>();
  const [draft, setDraft] = useState<AppearanceProfile>();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previous = store.read(Boolean(readBoardProfile()));
      // Start with the conservative default; appearance is always editable.
      const saved = previous.needsSetup
        ? store.save(previous.profile)
        : previous;
      setSnapshot(saved);
      setDraft(saved.profile);
      setEditing(false);
      if (!saved.persisted && !saved.needsSetup)
        setNotice(
          "Tampilan berlaku di tab ini. Penyimpanan browser tidak tersedia.",
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <Context
      value={{
        ready: Boolean(snapshot),
        editing,
        firstUse: snapshot?.needsSetup ?? true,
        profile: snapshot?.profile,
        draft,
        notice,
        openAppearance: () => {
          setDraft(snapshot?.profile);
          setEditing(true);
        },
        cancelAppearance: () => {
          if (snapshot?.needsSetup) return;
          setDraft(snapshot?.profile);
          setEditing(false);
        },
        changeAppearance: setDraft,
        saveAppearance: () => {
          if (!draft) return;
          const saved = store.save(draft);
          setSnapshot(saved);
          setDraft(saved.profile);
          setEditing(false);
          setNotice(
            saved.persisted
              ? ""
              : "Tampilan berlaku di tab ini. Penyimpanan browser tidak tersedia.",
          );
        },
      }}
    >
      {children}
    </Context>
  );
}
