"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import { teacherIdentitySchema } from "@/contracts/auth";
import { classListSchema, type ClassDto } from "@/contracts/classes";
import { libraryStateSchema } from "@/contracts/library";
import {
  hasPendingLogout,
  readLocalAccess,
  rememberLocalAccess,
} from "@/local/access";
import { logoutTeacher } from "@/features/classroom/logout-transport";
import { libraryCache, syncLibraryResponses } from "@/local/library";
import { libraryCall } from "@/features/library/client";
import type { LocalScope } from "@/local/scope";
import { Button } from "@/ui/components/button";
type Data = {
  scope: LocalScope;
  state: z.infer<typeof libraryStateSchema>;
  classes: ClassDto[];
  offline: boolean;
  refresh: () => Promise<void>;
};
const Context = createContext<Data | null>(null);
export function useTeacher() {
  const value = useContext(Context);
  if (!value) throw new Error("Teacher context missing");
  return value;
}
export function TeacherProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Omit<Data, "refresh">>(),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState(false),
    [locked, setLocked] = useState(false);
  const refresh = useCallback(async () => {
    try {
      if (!navigator.onLine) {
        const grant = await readLocalAccess();
        if (!grant) throw new Error();
        for (const mode of ["pilot", "demo"] as const) {
          const scope = { ownerId: grant.id, mode },
            state = await libraryCache(scope, "state", "index"),
            classes = await libraryCache(scope, "classes", "index");
          if (state && classes) {
            setData({ scope, state, classes: classes.classes, offline: true });
            return;
          }
        }
        throw new Error();
      }
      if (await hasPendingLogout()) {
        await logoutTeacher();
        window.location.replace("/masuk");
        return;
      }
      const res = await fetch("/api/v1/teacher", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const identity = teacherIdentitySchema.parse(await res.json());
      await rememberLocalAccess(identity.id);
      const state = libraryStateSchema.parse(
          await libraryCall({ action: "list" }),
        ),
        scope: LocalScope = {
          ownerId: identity.id,
          mode: state.sample ? "demo" : "pilot",
        };
      const classResponse = await fetch(`/api/v1/classes?mode=${scope.mode}`, {
        cache: "no-store",
      });
      if (!classResponse.ok) throw new Error();
      const classes = classListSchema.parse(await classResponse.json());
      setData({ scope, state, classes: classes.classes, offline: false });
      try {
        await libraryCache(scope, "state", "index", state);
        await libraryCache(scope, "classes", "index", classes);
      } catch {
        setMessage("Penyimpanan offline belum tersedia di perangkat ini.");
      }
    } catch {
      setMessage(
        "Kelas belum dapat dimuat. Sambungkan internet atau masuk kembali.",
      );
    }
  }, []);
  useEffect(() => {
    const task = setTimeout(() => void refresh(), 0);
    const access = new BroadcastChannel("pn-teacher-access");
    access.onmessage = () => {
      setLocked(true);
      setData(undefined);
    };
    const online = () => void refresh();
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      clearTimeout(task);
      access.close();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, [refresh]);
  const owner = data?.scope.ownerId,
    mode = data?.scope.mode,
    sample = data?.state.sample;
  useEffect(() => {
    if (!owner || !mode) return;
    let stopped = false,
      busy = false;
    async function sync() {
      if (stopped || busy || !navigator.onLine) return;
      busy = true;
      try {
        if (sample) {
          const res = await fetch("/api/v1/sample/control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ takeover: false }),
          });
          if (!res.ok) {
            if (!stopped) setConflict(res.status === 409);
            return;
          }
          if (!stopped) setConflict(false);
        }
        const count = await syncLibraryResponses(
          { ownerId: owner!, mode: mode! },
          libraryCall,
        );
        if (count && !stopped) {
          setMessage(`${count} lembar tersimpan di database.`);
          await refresh();
        }
      } catch {
        /* Keep pending responses for the next valid online attempt. */
      } finally {
        busy = false;
      }
    }
    void sync();
    const timer = setInterval(() => void sync(), 30000);
    window.addEventListener("online", sync);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", sync);
    };
  }, [owner, mode, sample, refresh]);
  if (locked)
    return (
      <p>
        Akses guru terkunci. <a href="/masuk">Masuk kembali</a>
      </p>
    );
  if (!data) return <p role="status">{message || "Memuat kelas…"}</p>;
  return (
    <Context.Provider value={{ ...data, refresh }}>
      {data.state.sample && (
        <span className="mb-4 inline-block rounded-full bg-pn-teal-100 px-3 py-1 text-xs font-bold text-primary">
          Data contoh
        </span>
      )}
      {data.offline && (
        <p role="status" className="mb-4 text-sm">
          Offline · membuka data tersimpan di perangkat ini.
        </p>
      )}
      {conflict && (
        <div role="alert" className="mb-4 rounded-input border bg-card p-4">
          <p>Data contoh sedang dikendalikan perangkat lain.</p>
          <Button
            variant="outline"
            onClick={async () => {
              if (
                !window.confirm(
                  "Ambil alih kendali data contoh? Sambungan layar pengendali sebelumnya akan dicabut.",
                )
              )
                return;
              const r = await fetch("/api/v1/sample/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ takeover: true }),
              });
              if (r.ok) {
                setConflict(false);
                await refresh();
              }
            }}
          >
            Ambil alih kendali
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {children}
    </Context.Provider>
  );
}
