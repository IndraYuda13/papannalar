import type {
  EvidenceSelection,
  LessonPresence,
  LessonGroups,
} from "../learning/types";
type Presence = LessonPresence;
export function seededRandom(seed: string) {
  let x = 2166136261;
  for (const c of seed) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return () => {
    x += 0x6d2b79f5;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function validateLessonGroups(presence: Presence, groups: LessonGroups) {
  const members = groups.flatMap((g) => g.studentIds);
  if (
    !groups.length ||
    groups.some((g) => !g.studentIds.length) ||
    new Set(groups.map((g) => g.id)).size !== groups.length ||
    new Set(presence.map((p) => p.id)).size !== presence.length ||
    new Set(presence.map((p) => p.attendanceNumber)).size !== presence.length ||
    members.length !== presence.length ||
    new Set(members).size !== members.length ||
    members.some((id) => !presence.some((p) => p.id === id))
  )
    throw new Error("INVALID_INPUT");
}
export function suggestLessonGroups(input: {
  presence: Presence;
  evidence: EvidenceSelection[];
  groupCount: number;
  seed: string;
}) {
  const { presence, evidence, groupCount, seed } = input;
  if (
    !Number.isInteger(groupCount) ||
    groupCount < 1 ||
    groupCount > presence.length
  )
    throw new Error("INVALID_INPUT");
  const random = seededRandom(seed);
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const known = shuffle(
    presence.filter((p) =>
      evidence.some((e) => e.studentId === p.id && e.status === "known"),
    ),
  );
  const rank = (id: string) => {
    const e = evidence.find((e) => e.studentId === id)?.evidence;
    return e ? e.correct / e.total : 0;
  };
  known.sort((a, b) => rank(a.id) - rank(b.id));
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    id: uuidFromSeed(seed, i),
    label: `Kelompok ${i + 1}`,
    studentIds: [] as string[],
  }));
  known.forEach((p, i) =>
    groups[
      Math.min(groupCount - 1, Math.floor((i * groupCount) / known.length))
    ].studentIds.push(p.id),
  );
  const unknown = shuffle(
    presence.filter((p) => !known.some((k) => k.id === p.id)),
  );
  for (const p of unknown) {
    const min = Math.min(...groups.map((g) => g.studentIds.length));
    const choices = groups.filter((g) => g.studentIds.length === min);
    choices[Math.floor(random() * choices.length)].studentIds.push(p.id);
  }
  // Small known cohorts may leave empty bands; unknown distribution fills them.
  for (const g of groups.filter((g) => !g.studentIds.length)) {
    const largest = [...groups].sort(
      (a, b) => b.studentIds.length - a.studentIds.length,
    )[0];
    g.studentIds.push(largest.studentIds.pop()!);
  }
  validateLessonGroups(presence, groups);
  return groups;
}
function uuidFromSeed(seed: string, index: number) {
  const r = seededRandom(`${seed}:${index}`);
  const bytes = Array.from({ length: 16 }, () => Math.floor(r() * 256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
