import type { EvidenceSelection } from "@/contracts/learning-evidence";
export const evidenceReasonCopy: Record<EvidenceSelection["reason"], string> = {
  comparable: "Hasil sesuai dengan soal yang dipakai untuk pembagian ini.",
  no_result: "Belum ada hasil untuk topik ini.",
  not_comparable:
    "Hasil tersedia, tetapi soal atau versinya berbeda dari hasil yang dipakai untuk pembagian ini.",
  incomplete:
    "Jawaban belum lengkap atau masih perlu diperiksa, sehingga belum dipakai untuk pembagian.",
  unmapped:
    "Soal pada hasil belum dipetakan ke topik ini, sehingga belum dipakai untuk pembagian.",
};
