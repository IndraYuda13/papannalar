import type { StudentDto } from "@/contracts/api";
// Download stays on the teacher device. Quote all cells and neutralize spreadsheet formulas.
export function exportLocalRosterCsv(
  roster: readonly StudentDto[],
  names: Readonly<Record<string, string>>,
) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@-]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return (
    "\uFEFFabsen,nama\r\n" +
    roster
      .filter((s) => s.active)
      .map((s) => `${s.attendanceNumber},${cell(names[s.id] ?? "")}`)
      .join("\r\n") +
    "\r\n"
  );
}
// This parser and its output stay in the local teacher boundary. No network imports.
export function parseLocalRosterCsv(
  text: string,
  roster: readonly StudentDto[],
) {
  if (text.length > 100_000) throw new Error("CSV terlalu besar.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length)
        throw new Error("Format kutip CSV tidak valid.");
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("Kutip CSV belum ditutup.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (
    rows.length < 2 ||
    rows.length > 41 ||
    rows[0].map((v) => v.trim().toLowerCase()).join(",") !== "absen,nama"
  )
    throw new Error("Gunakan header absen,nama dan paling banyak 40 baris.");
  const seen = new Set<number>();
  return rows.slice(1).map((values) => {
    if (values.length !== 2 || !/^\d{1,2}$/.test(values[0].trim()))
      throw new Error("Nomor absen CSV tidak valid.");
    const attendance = Number(values[0]),
      displayName = values[1].trim();
    const student = roster.find(
      (s) => s.attendanceNumber === attendance && s.active,
    );
    if (!student || seen.has(attendance))
      throw new Error("CSV memuat nomor absen tidak dikenal atau ganda.");
    if (displayName.length > 120 || /[\r\n\u0000-\u001f]/.test(displayName))
      throw new Error("Isian nama CSV tidak valid.");
    seen.add(attendance);
    return { studentId: student.id, displayName };
  });
}
