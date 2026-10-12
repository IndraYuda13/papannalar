import type { PresentationState } from "@/contracts/presentation";
import type { PublicStation } from "@/contracts/stations";

const SHAPES = {
  "Segitiga Biru": {
    color: "var(--pn-grup-biru)",
    viewPath: "M32 6 L58 52 H6 Z",
    label: "Segitiga Biru",
  },
  "Lingkaran Oranye": {
    color: "var(--pn-grup-oranye)",
    viewPath: "M32 6 A26 26 0 1 1 31.9 6 Z",
    label: "Lingkaran Oranye",
  },
  "Kotak Hijau": {
    color: "var(--pn-grup-hijau)",
    viewPath: "M8 8 H56 V56 H8 Z",
    label: "Kotak Hijau",
  },
  "Belah Ketupat Ungu": {
    color: "var(--pn-grup-ungu)",
    viewPath: "M32 4 L60 30 L32 56 L4 30 Z",
    label: "Belah Ketupat Ungu",
  },
} as const;

export function GroupShape({
  label,
  className = "board-group-shape",
}: {
  label: PresentationState["groups"][number]["label"];
  className?: string;
}) {
  const shape = SHAPES[label];
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      style={{ color: shape.color }}
    >
      <path d={shape.viewPath} fill="currentColor" />
    </svg>
  );
}

/** The accessible name of a group's shape, for a legend-free label. */
export function groupShapeName(
  label: PresentationState["groups"][number]["label"],
) {
  return SHAPES[label].label;
}

export function PublicGroups({
  groups,
  station,
}: Pick<PresentationState, "groups"> & { station?: PublicStation }) {
  return (
    <div className="board-groups">
      {groups.map((g) => {
        const assignment = station?.assignments.find((a) => a.groupId === g.id);
        return (
          <section
            key={g.id}
            data-testid="public-group"
            data-group={g.label}
            className="board-group-card"
            style={{ borderColor: SHAPES[g.label].color }}
          >
            <GroupShape label={g.label} />
            <h2>{g.label}</h2>
            <p className="board-group-station">
              {assignment
                ? `Stasiun pertama: ${assignment.station}`
                : "Tunggu arahan guru untuk stasiun pertama."}
            </p>
            <p aria-label={`Absen ${g.label}`} className="board-group-numbers">
              {g.attendanceNumbers
                .map((n) => String(n).padStart(2, "0"))
                .join(" · ")}
            </p>
          </section>
        );
      })}
    </div>
  );
}
