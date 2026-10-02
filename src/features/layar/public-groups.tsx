import type { PresentationState } from "@/contracts/presentation";
import type { PublicStation } from "@/contracts/stations";
const styles = {
  "Segitiga Biru": {
    symbol: "▲",
    color: "var(--pn-grup-biru)",
  },
  "Lingkaran Oranye": {
    symbol: "●",
    color: "var(--pn-grup-oranye)",
  },
  "Kotak Hijau": {
    symbol: "■",
    color: "var(--pn-grup-hijau)",
  },
  "Belah Ketupat Ungu": {
    symbol: "◆",
    color: "var(--pn-grup-ungu)",
  },
};
export function GroupSymbol({
  label,
}: {
  label: PresentationState["groups"][number]["label"];
}) {
  return (
    <span aria-hidden="true" style={{ color: styles[label].color }}>
      {styles[label].symbol}
    </span>
  );
}
export function PublicGroups({
  groups,
  station,
}: Pick<PresentationState, "groups"> & { station?: PublicStation }) {
  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
      {groups.map((g) => (
        <section
          key={g.id}
          data-testid="public-group"
          className="rounded-kartu border-4 bg-white p-6"
          style={{ borderColor: styles[g.label].color }}
        >
          <div
            className="text-[80px]"
            style={{ color: styles[g.label].color }}
            aria-hidden="true"
          >
            {styles[g.label].symbol}
          </div>
          <h2 className="text-[40px] font-bold">{g.label}</h2>
          <p className="my-4 text-[32px]">
            {station?.assignments.find((a) => a.groupId === g.id)
              ? `Stasiun pertama: ${station.assignments.find((a) => a.groupId === g.id)!.station}`
              : "Tunggu arahan guru untuk stasiun pertama."}
          </p>
          <p
            aria-label={`Absen ${g.label}`}
            className="text-[40px] leading-relaxed"
          >
            {g.attendanceNumbers
              .map((n) => String(n).padStart(2, "0"))
              .join(" · ")}
          </p>
        </section>
      ))}
    </div>
  );
}
