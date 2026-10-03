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
import type { StudentDto } from "@/contracts/api";
import { Button } from "@/ui/components/button";
import {
  field,
  panel,
  libraryCall,
  jakartaDate,
} from "@/features/library/client";
import { createNameRepository } from "@/local/names";
import { libraryCache } from "@/local/library";
import { LocalRoster } from "./local-roster";
import { classPresence } from "@/local/class-presence";
import { PageHeader, StateNotice } from "@/ui/components/studio";
import { Search, UsersRound } from "lucide-react";
export function ClassesPage() {
  const { classes, scope, refresh, canMutate } = useTeacher(),
    [adding, setAdding] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Kelola ruang belajar"
        title="Kelas"
        description="Daftar kelas dan siswa Anda. Nama siswa tetap di perangkat ini."
        actions={
          <Button
            disabled={!canMutate || busy}
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Batal menambah" : "Tambah kelas"}
          </Button>
        }
      />
      {adding && (
        <form
          className={panel}
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
              setMessage("Kelas belum tersimpan. Periksa isian dan sambungan.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
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
            <label>
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
            <label>
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
          <Button disabled={busy}>Simpan kelas</Button>
        </form>
      )}
      <label className="studio-filter flex items-center gap-3">
        <Search size={20} aria-hidden />
        <span className="sr-only">Cari kelas</span>
        <input
          className={field}
          value={search}
          placeholder="Cari kelas…"
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <ul className="studio-row-list">
        {classes
          .filter((c) => c.label.toLowerCase().includes(search.toLowerCase()))
          .map((c) => (
            <li key={c.id}>
              <Link href={`/guru/kelas/${c.id}`} className="studio-row">
                <span className="studio-row-icon" aria-hidden>
                  <UsersRound size={24} />
                </span>
                <div className="studio-row-content">
                  <h2>{c.label}</h2>
                  <p>
                    {c.count} siswa · Tingkat {c.grade}
                  </p>
                </div>
                <span className="studio-row-action">Buka kelas →</span>
              </Link>
            </li>
          ))}
      </ul>
      {!classes.length && (
        <StateNotice title="Belum ada kelas">
          Tambahkan kelas pertama untuk mulai mengajar.
        </StateNotice>
      )}
      {classes.length > 0 &&
        !classes.some((c) =>
          c.label.toLowerCase().includes(search.toLowerCase()),
        ) && (
          <StateNotice title="Kelas belum ditemukan">
            Coba nama kelas lain atau kosongkan pencarian.
          </StateNotice>
        )}
      <p role="status">{message}</p>
    </div>
  );
}
export function ClassPage({ id }: { id: string }) {
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
  const editor = selected && (
    <form
      key={selected.id}
      ref={editorRef}
      aria-label={`Edit siswa absen ${selected.attendanceNumber}`}
      tabIndex={-1}
      className="w-full space-y-3 rounded-input bg-pn-teal-100 p-4"
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
      <h3 className="font-bold">
        Edit siswa · Absen {selected.attendanceNumber}
      </h3>
      <label className="block">
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
      <label className="block">
        Nama panggilan di perangkat ini
        <input
          name="localName"
          className={field}
          defaultValue={names[selected.id] ?? ""}
          maxLength={120}
        />
      </label>
      <label className="flex min-h-12 items-center gap-3">
        <input name="active" type="checkbox" defaultChecked={selected.active} />
        Siswa aktif (hapus centang untuk arsip)
      </label>
      <Button disabled={busy}>Simpan siswa</Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => setSelected(undefined)}
      >
        Batal
      </Button>
    </form>
  );
  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-12 items-center text-primary"
        href="/guru/kelas"
      >
        ← Kelas
      </Link>
      <PageHeader
        eyebrow="Ruang kelas"
        title={`Kelas ${classroom.label}`}
        description={`${classroom.count} siswa · Tingkat ${classroom.grade} · Catatan hadir hari ini`}
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/guru/mulai?class=${id}`}>Mulai mengajar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/guru/mulai?class=${id}&mode=assessment`}>
            Buat asesmen
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/guru/latihan?class=${id}&mode=${mode}`}>
            Siapkan latihan & AI
          </Link>
        </Button>
      </div>
      <section className={panel}>
        <h2 className="text-xl font-bold">Daftar siswa</h2>
        <p className="text-sm text-muted-foreground">
          Nama hanya tersimpan pada perangkat ini. Riwayat mengikuti siswa walau
          nomor absen berubah.
        </p>
        <p className="text-sm">
          Hadir hari ini:{" "}
          {
            detail.students.filter((s) => s.active && !absent.includes(s.id))
              .length
          }
          /{detail.students.filter((s) => s.active).length}. Catatan hadir
          tersimpan pada perangkat ini.
        </p>
        <ul className="divide-y">
          {detail.students.map((s) => (
            <li
              key={s.id}
              className="flex min-h-16 flex-wrap items-center justify-between gap-3"
            >
              <span className="min-w-0 flex-1 break-words">
                <b className="mr-3">
                  {String(s.attendanceNumber).padStart(2, "0")}
                </b>
                {names[s.id] ?? `Absen ${s.attendanceNumber}`}
                {!s.active && <small className="ml-2">Diarsipkan</small>}
              </span>
              <label className="flex min-h-12 items-center gap-2 text-sm">
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
                Hadir
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
              {selected?.id === s.id && editor}
            </li>
          ))}
        </ul>
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
                  (n) => !detail.students.some((s) => s.attendanceNumber === n),
                ) ?? 40,
              active: true,
            })
          }
        >
          Tambah siswa
        </Button>
        {selected &&
          !detail.students.some((s) => s.id === selected.id) &&
          editor}
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-primary">
            Tambahkan nama siswa dari file
          </summary>
          <LocalRoster
            ownerId={owner}
            mode={mode}
            students={detail.students}
            onSaved={load}
          />
        </details>
      </section>
      <details className={panel}>
        <summary className="min-h-12 cursor-pointer font-bold">
          Ubah nama atau tingkat kelas
        </summary>
        <form
          className="space-y-3"
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
          <label className="block">
            Nama kelas
            <input
              name="label"
              defaultValue={classroom.label}
              className={field}
              required
            />
          </label>
          <label className="block">
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
      <p role="status">{message}</p>
    </div>
  );
}
