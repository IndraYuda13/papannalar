"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTeacher } from "./app-context";
import {
  classDetailSchema,
  serializeCreateClass,
  serializeUpdateClass,
  type ClassDto,
} from "@/contracts/classes";
import { getClassTarget } from "@/content/ladder/targets";
import type { StudentDto } from "@/contracts/api";
import { Button } from "@/ui/components/button";
import { field, libraryCall, jakartaDate } from "@/features/library/client";
import { createNameRepository } from "@/local/names";
import { libraryCache } from "@/local/library";
import { LocalRoster } from "./local-roster";
import { LearningSummary } from "./learning-summary";
import { classPresence } from "@/local/class-presence";
import {
  PageHeader,
  ProgressLabel,
  Section,
  StateNotice,
} from "@/ui/components/studio";
import { Check, Search, UsersRound } from "lucide-react";

/** The one canonical segmented control (§9.3): never pills *and* a tab strip. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="studio-segmented">
      {options.map((option) => (
        <Button
          key={option.id}
          variant="quiet"
          data-nav-item
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function ClassesPage() {
  const { classes, scope, refresh, canMutate } = useTeacher(),
    [adding, setAdding] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  const shown = classes.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelas"
        description="Daftar kelas dan siswa Anda."
        actions={
          <Button
            disabled={!canMutate || busy}
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Batal menambah" : "Tambah kelas"}
          </Button>
        }
      />
      <ProgressLabel index={1} total={4} label="Pilih kelas" />
      {adding && (
        <Section label="Kelas baru" ground="inset" tone="mint">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !canMutate) return;
              setBusy(true);
              setMessage("");
              const f = new FormData(e.currentTarget);
              try {
                const res = await fetch("/api/v1/classes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: serializeCreateClass({
                    id: crypto.randomUUID(),
                    label: String(f.get("label")),
                    grade: Number(f.get("grade")),
                    count: Number(f.get("count")),
                    mode: scope.mode,
                  }),
                });
                if (!res.ok) throw new Error();
                await refresh();
                setAdding(false);
                setMessage(
                  "Kelas tersimpan. Buka kelas di bawah, lalu pilih Mulai mengajar.",
                );
              } catch {
                setMessage(
                  "Kelas belum tersimpan. Periksa isian dan sambungan.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="studio-label">
              Nama kelas
              <input
                className={field}
                name="label"
                placeholder="7B"
                maxLength={40}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="studio-label">
                Tingkat
                <input
                  name="grade"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={7}
                  className={field}
                  required
                />
              </label>
              <label className="studio-label">
                Jumlah siswa
                <input
                  name="count"
                  type="number"
                  min={1}
                  max={40}
                  defaultValue={32}
                  className={field}
                  required
                />
              </label>
            </div>
            <Button disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan kelas"}
            </Button>
          </form>
        </Section>
      )}
      <Section
        label="Daftar kelas"
        action={
          <label className="studio-section-action gap-2">
            <Search size={18} strokeWidth={1.8} aria-hidden />
            <span className="sr-only">Cari kelas</span>
            <input
              className="studio-field min-h-12 w-40 rounded-input border border-pn-edge bg-card px-3 font-normal"
              value={search}
              placeholder="Cari kelas…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        }
      >
        {shown.length > 0 && (
          <ul className="studio-row-list">
            {shown.map((c) => (
              <li key={c.id}>
                <Link
                  className="studio-row"
                  href={`/guru/kelas/${c.id}`}
                  title={`Kelas ${c.label}`}
                >
                  <span className="studio-row-icon" aria-hidden>
                    <UsersRound size={22} strokeWidth={1.8} />
                  </span>
                  <span className="studio-row-content">
                    <h2>{c.label}</h2>
                    <p>
                      {c.count} siswa · Tingkat {c.grade}
                    </p>
                  </span>
                  <span className="studio-row-action" data-row-action>
                    Buka kelas
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!classes.length && (
          <StateNotice
            title="Belum ada kelas"
            action={
              <Button disabled={!canMutate} onClick={() => setAdding(true)}>
                Buat kelas
              </Button>
            }
          >
            Buat kelas pertama dalam satu menit.
          </StateNotice>
        )}
        {classes.length > 0 && !shown.length && (
          <StateNotice
            title="Belum ada yang cocok"
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                Tampilkan semua
              </Button>
            }
          >
            Coba kosongkan pencarian atau ubah tanggal.
          </StateNotice>
        )}
      </Section>
      <p role="status">{message}</p>
    </div>
  );
}

export function ClassPage({ id }: { id: string }) {
  const [tab, setTab] = useState<"students" | "learning">(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "learning"
      ? "learning"
      : "students",
  );
  const { scope, state, refresh, canMutate } = useTeacher(),
    [detail, setDetail] = useState<{
      class: ClassDto;
      students: StudentDto[];
    }>(),
    [names, setNames] = useState<Record<string, string>>({}),
    [selected, setSelected] = useState<StudentDto>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLFormElement>(null);
  const editorTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!selected) return;
    editorRef.current?.scrollIntoView({ block: "nearest" });
    editorRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [selected]);
  const owner = scope.ownerId,
    mode = scope.mode;
  const [absent, setAbsent] = useState<string[]>([]),
    [savingPresence, setSavingPresence] = useState(false),
    today = jakartaDate();
  useEffect(() => {
    let cancelled = false;
    void classPresence({ ownerId: owner, mode }, id, today)
      .then((value) => {
        if (!cancelled) setAbsent(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [owner, mode, id, today]);
  const load = useCallback(async () => {
    const s = { ownerId: owner, mode };
    try {
      let data;
      if (navigator.onLine) {
        const res = await fetch(`/api/v1/classes/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        data = classDetailSchema.parse(await res.json());
        try {
          await libraryCache(s, "classDetail", id, data);
        } catch {
          /* Online class remains usable. */
        }
      } else data = await libraryCache(s, "classDetail", id);
      if (!data) throw new Error();
      setDetail(data);
      const repo = createNameRepository(s);
      try {
        if (state.sample) {
          const key = `pn-sample-local:${owner}:${id}`;
          if (!localStorage.getItem(key)) {
            for (const student of data.students)
              if (!(await repo.read(student.id)))
                await repo.save(
                  student.id,
                  `Awan ${String(student.attendanceNumber).padStart(2, "0")}`,
                );
            localStorage.setItem(key, "1");
          }
        }
        setNames(
          Object.fromEntries(
            (await repo.readAll()).map((n) => [n.studentId, n.displayName]),
          ),
        );
      } finally {
        repo.close();
      }
    } catch {
      setMessage(
        "Kelas belum dapat dibuka. Periksa sambungan atau cache perangkat.",
      );
    }
  }, [owner, mode, id, state.sample]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  if (!detail)
    return (
      <StateNotice
        kind={message ? "error" : "loading"}
        title={message || "Memuat kelas…"}
        action={
          message ? (
            <Button onClick={() => void load()}>Coba lagi</Button>
          ) : undefined
        }
      />
    );
  const classroom = detail.class;
  const activeStudents = detail.students.filter((s) => s.active);
  const present = activeStudents.filter((s) => !absent.includes(s.id)).length;
  const editor = selected && (
    <form
      key={selected.id}
      ref={editorRef}
      aria-label={`Edit siswa absen ${selected.attendanceNumber}`}
      tabIndex={-1}
      className="space-y-3 rounded-input bg-pn-teal-100 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !canMutate) return;
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await libraryCall({
            action: "roster",
            classId: id,
            studentId: selected.id,
            attendanceNumber: Number(f.get("attendance")),
            active: f.get("active") === "on",
          });
          const repo = createNameRepository(scope);
          try {
            await repo.save(selected.id, String(f.get("localName") ?? ""));
          } finally {
            repo.close();
          }
          setSelected(undefined);
          await load();
          await refresh();
          setMessage("Perubahan tersimpan.");
        } catch {
          setMessage("Belum tersimpan. Nomor absen harus unik antara 1–40.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-base font-bold">
        Edit siswa · Absen {selected.attendanceNumber}
      </h3>
      <label className="studio-label">
        Nomor absen
        <input
          className={field}
          name="attendance"
          type="number"
          min={1}
          max={40}
          defaultValue={selected.attendanceNumber}
          required
        />
      </label>
      <label className="studio-label">
        Nama panggilan di perangkat ini
        <input
          name="localName"
          className={field}
          defaultValue={names[selected.id] ?? ""}
          maxLength={120}
        />
      </label>
      <label className="flex min-h-12 items-center gap-3">
        <input
          name="active"
          type="checkbox"
          className="size-5"
          defaultChecked={selected.active}
        />
        Siswa aktif (hapus centang untuk arsip)
      </label>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy}>{busy ? "Menyimpan…" : "Simpan siswa"}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSelected(undefined);
            editorTrigger.current?.focus();
          }}
        >
          Batal
        </Button>
      </div>
    </form>
  );
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-12 items-center text-pn-teal-700"
        href="/guru/kelas"
      >
        ← Kelas
      </Link>
      <PageHeader
        title={`Kelas ${classroom.label}`}
        description={`${classroom.count} siswa · Tingkat ${classroom.grade} · Hadir ${present}/${activeStudents.length}`}
      />
      <div className={tab === "learning" ? "hidden" : "flex flex-wrap gap-3"}>
        <Button asChild>
          <Link href={`/guru/mulai?class=${id}`}>Mulai mengajar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/guru/mulai?class=${id}&mode=assessment`}>
            Buat asesmen
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/guru/latihan?class=${id}&mode=${classroom.mode}`}>
            Latihan kelompok
          </Link>
        </Button>
      </div>
      <Segmented
        label="Isi kelas"
        value={tab}
        onChange={setTab}
        options={[
          { id: "students", label: "Daftar siswa" },
          { id: "learning", label: "Kebutuhan belajar" },
        ]}
      />
      {tab === "learning" && (
        <LearningSummary
          key={`${owner}/${mode}/${id}`}
          scope={{ ownerId: owner, mode: classroom.mode }}
          classId={id}
          students={detail.students}
          names={names}
        />
      )}
      <Section
        label="Nama siswa · tersimpan di perangkat ini"
        hidden={tab !== "students"}
        aria-label="Daftar siswa"
      >
        <ul className="studio-row-list" aria-label={`Daftar absen`}>
          {detail.students.map((s) => {
            const label =
              names[s.id] ??
              `Siswa ${String(s.attendanceNumber).padStart(2, "0")}`;
            return (
              <li key={s.id}>
                <div className="studio-row" data-student-row>
                  <span className="studio-numeral-chip" aria-hidden>
                    {String(s.attendanceNumber).padStart(2, "0")}
                  </span>
                  <span className="studio-row-content">
                    <h2 title={label}>{label}</h2>
                    {!s.active && <p>Diarsipkan</p>}
                  </span>
                  <label
                    className="studio-attend"
                    data-attend-toggle
                    data-checked={s.active && !absent.includes(s.id)}
                    data-disabled={!s.active || savingPresence}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Absen ${s.attendanceNumber} hadir`}
                      disabled={!s.active || savingPresence}
                      checked={s.active && !absent.includes(s.id)}
                      onChange={async (e) => {
                        const next = e.target.checked
                          ? absent.filter((value) => value !== s.id)
                          : [...absent, s.id];
                        const previous = absent;
                        setAbsent(next);
                        setSavingPresence(true);
                        try {
                          await classPresence(scope, id, today, next);
                          setMessage("Catatan hadir tersimpan di perangkat.");
                        } catch {
                          setAbsent(previous);
                          setMessage(
                            "Catatan hadir belum tersimpan. Periksa penyimpanan perangkat.",
                          );
                        } finally {
                          setSavingPresence(false);
                        }
                      }}
                    />
                    <span className="studio-attend-box" aria-hidden>
                      <Check size={24} strokeWidth={2.4} />
                    </span>
                    <span className="sr-only">Hadir</span>
                  </label>
                  <Button
                    disabled={!canMutate || busy}
                    variant="outline"
                    onClick={(event) => {
                      editorTrigger.current = event.currentTarget;
                      setSelected(s);
                    }}
                  >
                    Edit
                  </Button>
                </div>
                {selected?.id === s.id && editor}
              </li>
            );
          })}
        </ul>
        {!detail.students.length && (
          <StateNotice title="Kelas ini belum punya siswa">
            Tambah satu siswa, atau impor daftar dari CSV di perangkat ini.
          </StateNotice>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={!canMutate || detail.students.length >= 40}
            onClick={() =>
              setSelected({
                schemaVersion: 1,
                id: crypto.randomUUID(),
                classId: id,
                attendanceNumber:
                  Array.from({ length: 40 }, (_, i) => i + 1).find(
                    (n) =>
                      !detail.students.some((s) => s.attendanceNumber === n),
                  ) ?? 40,
                active: true,
              })
            }
          >
            Tambah siswa
          </Button>
          <Link
            className="inline-flex min-h-12 items-center font-semibold text-pn-teal-700 underline"
            href={`/guru/latihan?class=${id}&mode=${classroom.mode}`}
          >
            Latihan kelompok
          </Link>
        </div>
        {!activeStudents.length && (
          <div className="mt-4">
            <StateNotice
              title="Tidak ada siswa aktif di kelas ini"
              action={
                <Button variant="outline" onClick={() => setTab("students")}>
                  Buka daftar siswa
                </Button>
              }
            >
              Tandai kehadiran dulu, lalu bagi kelompok.
            </StateNotice>
          </div>
        )}
        {selected &&
          !detail.students.some((s) => s.id === selected.id) &&
          editor}
        <details className="mt-4">
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-pn-teal-700">
            Tambahkan nama siswa dari file
          </summary>
          <div className="mt-3">
            <LocalRoster
              ownerId={owner}
              mode={mode}
              students={detail.students}
              onSaved={load}
            />
          </div>
        </details>
      </Section>
      <Section label="Pengaturan kelas">
        <p className="studio-help mb-3">
          Target kelas untuk Tingkat {classroom.grade}: anak tangga{" "}
          {getClassTarget(classroom.grade).stepId}.
        </p>
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-pn-teal-700">
            Ubah nama atau tingkat kelas
          </summary>
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (busy || !canMutate) return;
              setBusy(true);
              setMessage("");
              try {
                const res = await fetch(`/api/v1/classes/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: serializeUpdateClass({
                    label: String(f.get("label")),
                    grade: Number(f.get("grade")),
                    revision: classroom.revision,
                  }),
                });
                if (!res.ok) throw new Error();
                await load();
                await refresh();
                setMessage("Pengaturan kelas tersimpan.");
              } catch {
                setMessage(
                  "Pengaturan belum tersimpan. Periksa sambungan, lalu coba lagi. Jika kelas berubah di perangkat lain, muat ulang halaman.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="studio-label">
              Nama kelas
              <input
                name="label"
                defaultValue={classroom.label}
                className={field}
                required
              />
            </label>
            <label className="studio-label">
              Tingkat
              <input
                type="number"
                name="grade"
                min={1}
                max={12}
                defaultValue={classroom.grade}
                className={field}
              />
            </label>
            <Button disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan pengaturan"}
            </Button>
          </form>
        </details>
      </Section>
      <p role="status">{message}</p>
    </div>
  );
}
