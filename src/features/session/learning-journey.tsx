"use client";
import {
  Check,
  ClipboardCheck,
  UsersRound,
  Presentation,
  Flag,
} from "lucide-react";

export const LEARNING_STEPS = [
  {
    id: "check",
    title: "Cek siswa",
    icon: ClipboardCheck,
    instruction:
      "Bagikan kartu, tampilkan soal, lalu pindai jawaban. Tandai siswa yang tidak hadir.",
  },
  {
    id: "groups",
    title: "Periksa kelompok",
    icon: UsersRound,
    instruction:
      "Lihat kebutuhan siswa dan kegiatan tiap kelompok, lalu gunakan pembagian yang disarankan.",
  },
  {
    id: "activities",
    title: "Kegiatan",
    icon: Presentation,
    instruction:
      "Ikuti giliran kelompok: belajar bersama guru, mencoba di papan, dan latihan mandiri.",
  },
  {
    id: "results",
    title: "Cek akhir & selesai",
    icon: Flag,
    instruction:
      "Periksa jawaban dan alasan siswa, lalu simpan hasil untuk pertemuan berikutnya.",
  },
] as const;
export type LearningStep = (typeof LEARNING_STEPS)[number]["id"];

export function LearningJourney({
  step,
  grouped,
  ended,
  onChange,
}: {
  step: LearningStep;
  grouped: boolean;
  ended: boolean;
  onChange: (step: LearningStep) => void;
}) {
  const current = LEARNING_STEPS.find((s) => s.id === step)!;
  return (
    <div className="learning-journey">
      <nav aria-label="Langkah sesi belajar">
        {LEARNING_STEPS.map(({ id, title, icon: Icon }, index) => (
          <button
            key={id}
            type="button"
            aria-current={step === id ? "step" : undefined}
            disabled={id === "activities" && (!grouped || ended)}
            onClick={() => onChange(id)}
          >
            <span aria-hidden>
              {(grouped && index < 2) || (ended && index === 2) ? (
                <Check size={18} />
              ) : (
                <Icon size={18} />
              )}
            </span>
            <span>{title}</span>
          </button>
        ))}
      </nav>
      <div className="learning-instruction" aria-live="polite">
        <p className="studio-eyebrow">
          Langkah {LEARNING_STEPS.indexOf(current) + 1} dari 4
        </p>
        <h4 tabIndex={-1} id="learning-step-title">
          {current.title}
        </h4>
        <p>{current.instruction}</p>
      </div>
    </div>
  );
}
