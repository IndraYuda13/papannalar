// Deterministic sample display names for the seeded demo roster. They stay
// obviously synthetic (the page still carries "Data contoh · bukan siswa nyata"),
// but a varied list reads like a class list instead of one word plus a counter.
// One name per attendance number 1-40, the roster's own maximum, so a teacher
// who adds a student to the sample class never gets a duplicate label.
export const SAMPLE_STUDENT_NAMES = [
  "Alya",
  "Bima",
  "Citra",
  "Dewa",
  "Elang",
  "Fitri",
  "Gading",
  "Hana",
  "Indra",
  "Jelita",
  "Kirana",
  "Lukman",
  "Maya",
  "Naufal",
  "Olive",
  "Putri",
  "Rangga",
  "Sari",
  "Taufik",
  "Utari",
  "Vino",
  "Wulan",
  "Yusuf",
  "Zahra",
  "Arif",
  "Bulan",
  "Cempaka",
  "Damar",
  "Eka",
  "Fajar",
  "Gita",
  "Hafiz",
  "Imran",
  "Jati",
  "Kamila",
  "Lestari",
  "Mirza",
  "Nabila",
  "Omar",
  "Permata",
] as const;

export const SAMPLE_STUDENT_NAME_LIMIT = 40;

export function sampleStudentName(attendanceNumber: number): string {
  if (
    !Number.isInteger(attendanceNumber) ||
    attendanceNumber < 1 ||
    attendanceNumber > SAMPLE_STUDENT_NAME_LIMIT
  )
    throw new RangeError("Invalid sample attendance");
  return SAMPLE_STUDENT_NAMES[attendanceNumber - 1];
}
