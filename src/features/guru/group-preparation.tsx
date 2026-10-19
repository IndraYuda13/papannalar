"use client";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { CompetencyMapping } from "@/contracts/learning-evidence";
import type { Dispatch, SetStateAction } from "react";
import { CompetencyField } from "@/features/library/mapping-fields";
import { field } from "@/features/library/client";
import { Section } from "@/ui/components/studio";
import { Button } from "@/ui/components/button";
import { clampGroupCount, normaliseGroupCount } from "@/ui/group-count";
type Props = {
  classes: ClassDto[];
  cls: string;
  setClass: (value: string) => void;
  hasLesson: boolean;
  busy: boolean;
  competency: CompetencyMapping;
  setCompetency: (value: CompetencyMapping) => void;
  presentCount: number;
  students: StudentDto[];
  names: Record<string, string>;
  absent: string[];
  setAbsent: Dispatch<SetStateAction<string[]>>;
  count: string;
  onCountChange: (raw: string) => void;
  source: "random" | "evidence";
  setSource: (value: "random" | "evidence") => void;
  offline: boolean;
  canMutate: boolean;
  onPrepare: () => void;
};
export function GroupPreparation({
  classes,
  cls,
  setClass,
  hasLesson,
  busy,
  competency,
  setCompetency,
  presentCount,
  students,
  names,
  absent,
  setAbsent,
  count,
  onCountChange,
  source,
  setSource,
  offline,
  canMutate,
  onPrepare,
}: Props) {
  return (
    <Section
      label="Kelas dan pembagian"
      ground="inset"
      className="pn-group-preparation"
    >
      <div className="pn-preparation-fields grid gap-4 sm:grid-cols-2">
        <label>
          Kelas
          <select
            className={field}
            value={cls}
            disabled={hasLesson || busy}
            onChange={(e) => setClass(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <CompetencyField
          value={competency}
          onChange={setCompetency}
          disabled={busy}
        />
      </div>
      <p className="pn-presence-count">
        <strong>{presentCount}</strong> siswa hadir
      </p>
      <details className="pn-attendance-list">
        <summary className="min-h-12 cursor-pointer content-center font-semibold">
          Periksa kehadiran
        </summary>
        {students.map((s) => (
          <label key={s.id} className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={!absent.includes(s.id)}
              disabled={busy}
              onChange={(e) =>
                setAbsent((old) =>
                  e.target.checked
                    ? old.filter((id) => id !== s.id)
                    : [...old, s.id],
                )
              }
            />
            {s.attendanceNumber}. {names[s.id] ?? `Siswa ${s.attendanceNumber}`}
          </label>
        ))}
      </details>
      <label className="pn-group-count block max-w-sm">
        Jumlah kelompok
        <input
          className={field}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="Contoh: 3"
          value={count}
          disabled={busy}
          onChange={(e) => onCountChange(normaliseGroupCount(e.target.value))}
        />
      </label>
      <p className="text-sm">
        {count
          ? `${clampGroupCount(count, presentCount)} kelompok dari ${presentCount} siswa hadir.`
          : `Isi jumlah kelompok, maksimal ${presentCount || 1}.`}
      </p>
      <fieldset className="pn-grouping-choice">
        <legend className="font-semibold">Pembagian kelompok</legend>
        {(["random", "evidence"] as const).map((v) => (
          <label className="flex min-h-12 items-center gap-3" key={v}>
            <input
              type="radio"
              name="grouping"
              checked={source === v}
              disabled={busy || (v === "evidence" && !competency)}
              onChange={() => setSource(v)}
            />
            {v === "random" ? "Acak merata" : "Dari hasil topik ini"}
          </label>
        ))}
      </fieldset>
      <p className="text-sm">
        {competency
          ? "Hanya hasil pada soal dan versi yang sebanding dipakai. Siswa tanpa hasil tetap masuk kelompok. Anda dapat memilih acak atau mengedit pembagian."
          : "Topik ini belum terhubung ke hasil siswa. Gunakan pembagian acak."}
      </p>
      {!presentCount && (
        <p>
          Belum ada siswa hadir. Periksa kehadiran sebelum membuat kelompok.
        </p>
      )}
      <Button
        disabled={busy || offline || !canMutate || !presentCount || !count}
        onClick={onPrepare}
      >
        {busy ? "Menyiapkan kelompok…" : "Buat kelompok"}
      </Button>
    </Section>
  );
}
