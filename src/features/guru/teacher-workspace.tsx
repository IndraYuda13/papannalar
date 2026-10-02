"use client";
import { useEffect, useState, type FormEvent } from "react";
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
import { SessionWorkspace } from "@/features/session/session-workspace";
import { CycleWorkspace } from "@/features/session/cycle-workspace";
import { PackageWorkspace } from "@/features/package/package-workspace";
import { LocalRoster } from "./local-roster";
import { OralWorkspace } from "./oral-workspace";
import { SyncControls } from "./sync-controls";
import { purgeDeletedClass } from "@/local/delete-class";
import { StorageStatus } from "./storage-status";
import { logoutTeacher } from "@/features/classroom/logout-transport";

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

export function TeacherWorkspace() {
  const [ownerId, setOwnerId] = useState<string>();
  const [ready, setReady] = useState(false);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [mode, setMode] = useState<"pilot" | "demo">("pilot");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Detail>();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    const channel = new BroadcastChannel("pn-teacher-access");
    channel.onmessage = () => {
      current = false;
      setReady(true);
      setOwnerId(undefined);
      setClasses([]);
      setDetail(undefined);
      setLabels({});
    };
    async function load() {
      try {
        if (!navigator.onLine) {
          const grant = await readLocalAccess();
          if (current) {
            setOwnerId(grant?.id);
            setMessage("Offline: daftar kelas server belum dimuat.");
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
          const list = classListSchema.parse(
            await requestJson("/api/v1/classes?mode=pilot"),
          );
          if (current) {
            setOwnerId(identity.id);
            setClasses(list.classes);
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
    return () => {
      current = false;
      channel.close();
    };
  }, []);

  async function refresh(nextMode = mode) {
    const list = classListSchema.parse(
      await requestJson(`/api/v1/classes?mode=${nextMode}`),
    );
    setClasses(list.classes);
  }
  async function showClass(id: string) {
    if (!ownerId) return;
    setBusy(true);
    setMessage("");
    try {
      const data = classDetailSchema.parse(
        await requestJson(`/api/v1/classes/${id}`),
      );
      const names = createNameRepository({ ownerId, mode: data.class.mode });
      try {
        const views = await Promise.all(
          data.students.map((student) =>
            readTeacherStudentView(student, names),
          ),
        );
        setLabels(
          Object.fromEntries(views.map((view) => [view.studentId, view.label])),
        );
      } finally {
        names.close();
      }
      setDetail(data);
      setAdding(false);
    } catch {
      setMessage("Kelas belum dapat dibuka. Coba lagi saat online.");
    } finally {
      setBusy(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await requestJson(
        "/api/v1/classes",
        "POST",
        serializeCreateClass({
          id: crypto.randomUUID(),
          label: String(form.get("label")),
          grade: Number(form.get("grade")),
          count: Number(form.get("count")),
          mode,
        }),
      );
      await refresh();
      setAdding(false);
    } catch {
      setMessage("Kelas belum tersimpan. Periksa isian dan sambungan.");
    } finally {
      setBusy(false);
    }
  }
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
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
      await showClass(detail.class.id);
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
      <SyncControls scope={{ ownerId, mode }} classroom={detail?.class} />
      <StorageStatus scope={{ ownerId, mode }} />
      <h2 id="kelas-heading" className="text-[22px] leading-7 font-bold">
        {classes.length ? "Kelas Anda" : "Belum ada kelas."}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex-1 text-sm font-semibold">
          Data kelas
          <select
            aria-label="Data kelas"
            className={inputClass}
            value={mode}
            disabled={busy}
            onChange={async (event) => {
              const next = event.target.value === "demo" ? "demo" : "pilot";
              setMode(next);
              setDetail(undefined);
              setLabels({});
              if (!navigator.onLine) {
                setMessage(
                  "Offline: paket dan sesi tersimpan tetap dapat dibuka.",
                );
                setClasses([]);
                return;
              }
              try {
                await refresh(next);
              } catch {
                setMessage("Daftar kelas belum tersedia offline.");
                setClasses([]);
              }
            }}
          >
            <option value="pilot">Kelas aktif</option>
            <option value="demo">Demo terpisah</option>
          </select>
        </label>
        <Button variant="outline" onClick={logout}>
          Keluar
        </Button>
      </div>
      <ul className="space-y-2">
        {classes.map((classroom) => (
          <li key={classroom.id}>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => showClass(classroom.id)}
              disabled={busy}
            >
              Buka kelas {classroom.label}
              <span className="text-sm">{classroom.count} siswa</span>
            </Button>
          </li>
        ))}
      </ul>
      <Button
        onClick={() => {
          setAdding(!adding);
          setDetail(undefined);
          setLabels({});
        }}
        disabled={busy}
      >
        {adding ? "Batal" : "Buat kelas"}
      </Button>
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
          <Button type="submit" disabled={busy}>
            Simpan kelas
          </Button>
        </form>
      )}
      {detail && (
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
                  detail.students.map((s) => readTeacherStudentView(s, names)),
                );
                setLabels(
                  Object.fromEntries(views.map((v) => [v.studentId, v.label])),
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
            <Button type="submit" disabled={busy}>
              Simpan perubahan
            </Button>
          </form>
          <Button variant="outline" disabled={busy} onClick={remove}>
            Hapus kelas
          </Button>
        </section>
      )}
      <PackageWorkspace
        key={`package/${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
        ownerId={ownerId}
        mode={mode}
        students={detail?.students}
        classroom={detail?.class}
      />
      <SessionWorkspace
        key={`prelim/${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
        ownerId={ownerId}
        mode={mode}
        detail={detail}
      />
      <CycleWorkspace
        key={`${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
        scope={{ ownerId, mode }}
        detail={detail}
      />
      <OralWorkspace
        key={`oral/${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
        ownerId={ownerId}
        mode={mode}
        detail={detail}
        labels={labels}
      />
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
