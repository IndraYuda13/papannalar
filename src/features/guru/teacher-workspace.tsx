"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { Check, School } from "lucide-react";
import {
  classDetailSchema,
  classListSchema,
  serializeCreateClass,
  serializeUpdateClass,
  type ClassDto,
} from "@/contracts/classes";
import { teacherIdentitySchema } from "@/contracts/auth";
import { type StudentDto } from "@/contracts/api";
import { createNameRepository } from "@/local/names";
import {
  hasPendingLogout,
  lockLocalAccess,
  readLocalAccess,
  rememberLocalAccess,
} from "@/local/access";
import { readTeacherStudentView } from "./student-view";
import { Button } from "@/ui/components/button";
import { LocalRoster } from "./local-roster";
import { purgeDeletedClass } from "@/local/delete-class";
import { logoutTeacher } from "@/features/classroom/logout-transport";
import { libraryCall } from "@/features/library/client";
import { libraryStateSchema } from "@/contracts/library";
import { ActivityDisclosure } from "./activity-disclosure";
import { DeviceControls } from "./device-controls";
import { PracticeActivities } from "./practice-activities";
import { ExampleActivities } from "./example-activities";
import { SampleControl } from "./sample-control";
import { libraryCache, removeLibraryCache } from "@/local/library";
import type { LocalScope } from "@/local/scope";

const inputClass =
  "mt-1 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 font-normal";
type Detail = { class: ClassDto; students: StudentDto[] };
async function requestJson(
  path: string,
  method = "GET",
  body?: string,
): Promise<unknown> {
  const response = await fetch(path, {
    method,
    body,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) throw new Error("REQUEST_FAILED");
  return response.json();
}

export function TeacherWorkspace({ example = false }: { example?: boolean }) {
  const [ownerId, setOwnerId] = useState<string>();
  const [ready, setReady] = useState(false);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [mode, setMode] = useState<"pilot" | "demo">("pilot");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Detail>();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState(false);
  const [offline, setOffline] = useState(false);
  const accessOwner = useRef<string>(undefined);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!ready || !ownerId || example) return;
    const steps = ["teacher-prepare", "teacher-ai", "teacher-teach"];
    const hash = window.location.hash.slice(1);
    const target = steps.includes(hash) ? hash : "teacher-prepare";
    // Older preferences may leave all three steps open. Keep one in view on
    // arrival; later manual choices and every mounted draft/session survive.
    for (const id of steps) {
      const section = document.getElementById(id);
      if (section instanceof HTMLDetailsElement) section.open = id === target;
    }
  }, [ready, ownerId, example]);

  const showClass = useCallback(
    async (id: string, activeOwner: string, activeMode: "demo" | "pilot") => {
      if (!activeOwner) return;
      const version = ++requestVersion.current;
      setBusy(true);
      setMessage("");
      try {
        const scope = { ownerId: activeOwner, mode: activeMode };
        const data = navigator.onLine
          ? classDetailSchema.parse(await requestJson(`/api/v1/classes/${id}`))
          : await libraryCache(scope, "classDetail", id);
        if (!data || data.class.mode !== activeMode)
          throw new Error("CLASS_UNAVAILABLE");
        if (navigator.onLine)
          await libraryCache(scope, "classDetail", id, data).catch(() => {
            /* Offline availability is reported by device controls. */
          });
        const names = createNameRepository({
          ownerId: activeOwner,
          mode: data.class.mode,
        });
        try {
          const views = await Promise.all(
            data.students.map((student) =>
              readTeacherStudentView(student, names),
            ),
          );
          if (
            version !== requestVersion.current ||
            accessOwner.current !== activeOwner
          )
            return;
          setLabels(
            Object.fromEntries(
              views.map((view) => [view.studentId, view.label]),
            ),
          );
        } finally {
          names.close();
        }
        if (
          version !== requestVersion.current ||
          accessOwner.current !== activeOwner
        )
          return;
        setDetail(data);
        setAdding(false);
        const url = new URL(window.location.href);
        url.searchParams.set("class", data.class.id);
        url.searchParams.set("mode", data.class.mode);
        window.history.replaceState(null, "", url);
      } catch {
        if (version === requestVersion.current)
          setMessage("Kelas belum dapat dibuka. Coba lagi saat online.");
      } finally {
        if (version === requestVersion.current) setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    let current = true;
    const channel = new BroadcastChannel("pn-teacher-access");
    channel.onmessage = () => {
      current = false;
      accessOwner.current = undefined;
      requestVersion.current++;
      setReady(true);
      setOwnerId(undefined);
      setClasses([]);
      setDetail(undefined);
      setLabels({});
    };
    async function load() {
      setOffline(!navigator.onLine);
      const query = new URL(window.location.href).searchParams;
      try {
        if (!navigator.onLine) {
          const grant = await readLocalAccess();
          if (current) {
            setOwnerId(grant?.id);
            accessOwner.current = grant?.id;
            setMode(query.get("mode") === "demo" ? "demo" : "pilot");
            setMessage(
              "Tanpa internet: buka latihan yang sudah tersimpan pada perangkat ini.",
            );
            if (grant) {
              const nextMode = query.get("mode") === "demo" ? "demo" : "pilot";
              const scope: LocalScope = { ownerId: grant.id, mode: nextMode };
              const cached = await libraryCache(scope, "classes", "index");
              const state = await libraryCache(scope, "state", "index");
              if (!current) return;
              setClasses(cached?.classes ?? []);
              setSample(state?.sample ?? false);
              const selected =
                cached?.classes.find((c) => c.id === query.get("class")) ??
                cached?.classes[0];
              if (selected) await showClass(selected.id, grant.id, nextMode);
            }
          }
        } else {
          if (await hasPendingLogout()) {
            await logoutTeacher();
            window.location.replace("/masuk");
            return;
          }
          const identity = teacherIdentitySchema.parse(
            await requestJson("/api/v1/teacher"),
          );
          if (!current || !(await rememberLocalAccess(identity.id))) return;
          const state = libraryStateSchema.parse(
            await libraryCall({ action: "list" }),
          );
          const nextMode =
            state.sample || query.get("mode") === "demo" ? "demo" : "pilot";
          const list = classListSchema.parse(
            await requestJson(`/api/v1/classes?mode=${nextMode}`),
          );
          if (current) {
            setOwnerId(identity.id);
            accessOwner.current = identity.id;
            setSample(state.sample);
            setMode(nextMode);
            const url = new URL(window.location.href);
            url.searchParams.set("mode", nextMode);
            window.history.replaceState(null, "", url);
            setClasses(list.classes);
            await libraryCache(
              { ownerId: identity.id, mode: nextMode },
              "classes",
              "index",
              list,
            ).catch(() => {});
            const selected =
              list.classes.find((c) => c.id === query.get("class")) ??
              (state.sample
                ? list.classes.find((c) => c.label === "7B")
                : undefined) ??
              list.classes[0];
            if (selected) await showClass(selected.id, identity.id, nextMode);
          }
        }
      } catch {
        if (current)
          setMessage("Akses kelas belum tersedia. Masuk kembali saat online.");
      } finally {
        if (current) setReady(true);
      }
    }
    void load();
    const online = () => setOffline(false);
    const disconnected = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", disconnected);
    return () => {
      current = false;
      channel.close();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", disconnected);
    };
  }, [showClass]);

  async function refresh(nextMode = mode) {
    const list = classListSchema.parse(
      await requestJson(`/api/v1/classes?mode=${nextMode}`),
    );
    setClasses(list.classes);
    if (ownerId)
      await libraryCache(
        { ownerId, mode: nextMode },
        "classes",
        "index",
        list,
      ).catch(() => {});
    return list.classes;
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerId) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const id = crypto.randomUUID();
    try {
      await requestJson(
        "/api/v1/classes",
        "POST",
        serializeCreateClass({
          id,
          label: String(form.get("label")),
          grade: Number(form.get("grade")),
          count: Number(form.get("count")),
          mode,
        }),
      );
      await refresh();
      await showClass(id, ownerId, mode);
      setAdding(false);
    } catch {
      setMessage("Kelas belum tersimpan. Periksa isian dan sambungan.");
    } finally {
      setBusy(false);
    }
  }
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !ownerId) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await requestJson(
        `/api/v1/classes/${detail.class.id}`,
        "PATCH",
        serializeUpdateClass({
          label: String(form.get("label")),
          grade: Number(form.get("grade")),
          revision: detail.class.revision,
        }),
      );
      await refresh();
      await showClass(detail.class.id, ownerId, mode);
      setMessage("Kelas diperbarui.");
    } catch {
      setMessage("Perubahan belum tersimpan. Buka ulang kelas dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !detail ||
      !ownerId ||
      !window.confirm(
        "Hapus kelas dan roster ini? Nama lokal di perangkat ini juga akan dihapus.",
      )
    )
      return;
    setBusy(true);
    try {
      await requestJson(
        `/api/v1/classes/${detail.class.id}`,
        "DELETE",
        JSON.stringify({ revision: detail.class.revision }),
      );
      const names = createNameRepository({ ownerId, mode: detail.class.mode });
      await purgeDeletedClass(
        { ownerId, mode: detail.class.mode },
        detail.class.id,
      );
      await removeLibraryCache(
        { ownerId, mode: detail.class.mode },
        "classDetail",
        detail.class.id,
      );
      try {
        await Promise.all(
          detail.students.map((student) => names.delete(student.id)),
        );
      } finally {
        names.close();
      }
      setDetail(undefined);
      setLabels({});
      await refresh();
      setMessage(
        "Kelas dihapus. Hapus juga nama lokal pada perangkat guru lain yang pernah menyimpan kelas ini.",
      );
    } catch {
      setMessage("Penghapusan belum selesai. Periksa kembali saat online.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    // Revoke local UI access first, including when no network is available.
    await lockLocalAccess();
    accessOwner.current = undefined;
    requestVersion.current++;
    setOwnerId(undefined);
    setClasses([]);
    setDetail(undefined);
    setLabels({});
    try {
      await logoutTeacher();
      window.location.replace("/masuk");
    } catch {
      setMessage("Akses lokal dikunci. Keluar server dilanjutkan saat online.");
    }
  }

  if (!ready) return <p role="status">Memuat kelas…</p>;
  if (!ownerId)
    return (
      <div>
        <p>Akses guru terkunci.</p>
        <a
          href="/masuk"
          className="inline-flex min-h-12 items-center text-primary underline"
        >
          Masuk sebagai guru
        </a>
        <p role="status">{message}</p>
      </div>
    );
  return (
    <div className="space-y-5">
      {offline && (
        <p role="status" className="text-sm">
          Tanpa internet · latihan tersimpan tetap dapat digunakan pada
          perangkat ini.
        </p>
      )}
      {sample && (
        <p className="rounded-input bg-pn-teal-100 px-4 py-3 text-sm">
          <b>Data contoh</b> · Coba kegiatan dan AI tanpa memakai data siswa
          nyata.
        </p>
      )}
      <SampleControl active={sample && !!ownerId} />
      <section aria-labelledby="kelas-heading" className="teacher-class-picker">
        <h2
          id="kelas-heading"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <School size={24} aria-hidden />
          {example ? "Pilih kelas contoh" : "Pilih kelas untuk latihan"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {!sample && (
            <label className="flex-1 text-sm font-semibold">
              Gunakan kelas
              <select
                aria-label="Gunakan kelas"
                className={inputClass}
                value={mode}
                disabled={busy}
                onChange={async (event) => {
                  const next = event.target.value === "demo" ? "demo" : "pilot";
                  requestVersion.current++;
                  setBusy(true);
                  setMode(next);
                  setClasses([]);
                  setDetail(undefined);
                  setLabels({});
                  // The selected mode survives an offline reload without mixing data.
                  const url = new URL(window.location.href);
                  url.searchParams.set("mode", next);
                  url.searchParams.delete("class");
                  window.history.replaceState(null, "", url);
                  if (!navigator.onLine) {
                    try {
                      const cached = await libraryCache(
                        { ownerId, mode: next },
                        "classes",
                        "index",
                      );
                      setClasses(cached?.classes ?? []);
                      if (cached?.classes[0])
                        await showClass(cached.classes[0].id, ownerId, next);
                      setMessage(
                        "Tanpa internet: membuka kelas dan latihan yang sudah tersimpan.",
                      );
                    } catch {
                      setMessage(
                        "Kelas ini belum tersimpan pada perangkat. Buka kembali saat online.",
                      );
                    } finally {
                      setBusy(false);
                    }
                    return;
                  }
                  try {
                    const list = await refresh(next);
                    if (list[0]) await showClass(list[0].id, ownerId, next);
                  } catch {
                    setMessage("Daftar kelas belum tersedia offline.");
                    setClasses([]);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <option value="pilot">Kelas saya</option>
                <option value="demo">Data contoh · untuk mencoba</option>
              </select>
            </label>
          )}
        </div>
        {!sample && (
          <p className="text-sm text-muted-foreground">
            {mode === "demo"
              ? "Kelas percobaan terpisah dari kelas Anda. Buat satu kelas contoh untuk mencoba latihan dan AI."
              : "Gunakan rombel Anda. Untuk mencoba tanpa data siswa, pilih Data contoh."}
          </p>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {classes.map((classroom) => (
            <li key={classroom.id}>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-pressed={detail?.class.id === classroom.id}
                onClick={() => showClass(classroom.id, ownerId, mode)}
                disabled={busy}
              >
                Buka kelas {classroom.label}
                <span className="flex items-center gap-2 text-sm">
                  {classroom.count} siswa
                  {detail?.class.id === classroom.id && (
                    <Check size={18} aria-hidden />
                  )}
                </span>
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant={classes.length ? "outline" : "default"}
          onClick={() => {
            setAdding(!adding);
            setDetail(undefined);
            setLabels({});
          }}
          disabled={busy || offline}
        >
          {adding ? "Batal" : "Buat kelas"}
        </Button>
        {!classes.length && (
          <p className="text-sm">
            {mode === "demo"
              ? "Buat kelas contoh terlebih dahulu. Nama siswa tidak diperlukan."
              : "Tambahkan kelas pertama untuk menyiapkan latihan."}
          </p>
        )}
        {adding && (
          <form onSubmit={create} className="space-y-3">
            <label className="block font-semibold">
              Nama rombel
              <input
                name="label"
                required
                maxLength={40}
                placeholder="7B"
                className={inputClass}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Gunakan nama rombel, bukan nama siswa.
            </p>
            <label className="block font-semibold">
              Tingkat kelas
              <input
                name="grade"
                type="number"
                min={1}
                max={12}
                defaultValue={7}
                required
                className={inputClass}
              />
            </label>
            <label className="block font-semibold">
              Jumlah siswa
              <input
                name="count"
                type="number"
                min={1}
                max={40}
                defaultValue={32}
                required
                className={inputClass}
              />
            </label>
            <Button type="submit" disabled={busy || offline}>
              Simpan kelas
            </Button>
          </form>
        )}
      </section>
      {example ? (
        <>
          <p className="rounded-input bg-pn-teal-100 p-4">
            Contoh ini memakai 32 siswa kelas 7 dan soal bawaan. Coba memeriksa
            tiga kartu, membagi kelompok, lalu mengendalikan layar. Soal yang
            Anda siapkan di halaman Latihan & AI tidak digunakan di sini.
          </p>
          <ExampleActivities
            ownerId={ownerId}
            mode={mode}
            detail={detail}
            key={`${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
          />
          <Link
            href={`/guru/latihan?mode=${mode}${detail ? `&class=${detail.class.id}` : ""}`}
            className="inline-flex min-h-12 items-center font-semibold text-primary underline"
          >
            Kembali ke latihan & AI
          </Link>
        </>
      ) : (
        <PracticeActivities
          key={`${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
          ownerId={ownerId}
          mode={mode}
          detail={detail}
          labels={labels}
        />
      )}
      <ActivityDisclosure
        id="teacher-class"
        key={`class/${ownerId}/${mode}`}
        title="Kelola kelas terpilih"
        description="Nama lokal, daftar siswa dan pengaturan kelas."
        scope={{ ownerId, mode }}
      >
        {detail ? (
          <section
            aria-label="Detail kelas"
            className="space-y-3 border-t border-pn-ink-400/30 pt-4"
          >
            <h3 className="text-lg font-bold">Kelas {detail.class.label}</h3>
            <p>
              Tingkat {detail.class.grade} · {detail.class.count} siswa
            </p>
            <ul aria-label="Daftar absen" className="grid grid-cols-2 gap-2">
              {detail.students.map((student) => (
                <li
                  key={student.id}
                  className="rounded-input bg-pn-teal-100 px-3 py-2"
                >
                  {labels[student.id] ?? `Absen ${student.attendanceNumber}`}
                </li>
              ))}
            </ul>
            <LocalRoster
              ownerId={ownerId}
              mode={mode}
              students={detail.students}
              onSaved={async () => {
                const names = createNameRepository({ ownerId, mode });
                try {
                  const views = await Promise.all(
                    detail.students.map((s) =>
                      readTeacherStudentView(s, names),
                    ),
                  );
                  setLabels(
                    Object.fromEntries(
                      views.map((v) => [v.studentId, v.label]),
                    ),
                  );
                } finally {
                  names.close();
                }
              }}
            />
            <form
              key={detail.class.revision}
              onSubmit={update}
              className="space-y-3"
            >
              <label className="block font-semibold">
                Nama rombel
                <input
                  name="label"
                  required
                  maxLength={40}
                  defaultValue={detail.class.label}
                  className={inputClass}
                />
              </label>
              <label className="block font-semibold">
                Tingkat kelas
                <input
                  name="grade"
                  type="number"
                  min={1}
                  max={12}
                  required
                  defaultValue={detail.class.grade}
                  className={inputClass}
                />
              </label>
              <Button type="submit" disabled={busy || offline}>
                Simpan perubahan
              </Button>
            </form>
            <Button
              variant="outline"
              disabled={busy || offline}
              onClick={remove}
            >
              Hapus kelas
            </Button>
          </section>
        ) : (
          <p>Pilih kelas terlebih dahulu.</p>
        )}
        <Button asChild variant="outline">
          <Link href="/guru/kelas">Buka daftar kelas</Link>
        </Button>
        <Button variant="outline" onClick={logout}>
          Keluar
        </Button>
      </ActivityDisclosure>
      <DeviceControls
        key={`${ownerId}/${mode}`}
        scope={{ ownerId, mode }}
        classroom={detail?.class}
      />
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
