import type { PresentationState } from "@/contracts/presentation";
import type { PublicStation } from "@/contracts/stations";
import { RotationTimer } from "./timer";
import type { PublicRoles } from "@/contracts/turns";
export function StationBoard({
  station,
  groups,
  roles,
}: {
  station: PublicStation;
  groups: PresentationState["groups"];
  roles?: PublicRoles;
}) {
  return (
    <section aria-label="Rotasi kelas" className="w-full space-y-8 text-left">
      <div className="flex justify-between text-[40px]">
        <h1 className="text-[56px] font-bold">
          Putaran {station.round}/{station.total}
        </h1>
        <p>
          {station.phase === "transition"
            ? "Jeda pindah"
            : station.phase === "complete"
              ? "Rotasi selesai"
              : "Pindah dalam"}{" "}
          <RotationTimer deadlineAt={station.deadlineAt} />
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {(["Guru", "Papan", "Mandiri"] as const).map((place) => (
          <section
            key={place}
            className="rounded-kartu border-4 border-primary bg-white p-6"
          >
            <h2 className="text-[48px] font-bold">{place}</h2>
            {station.assignments
              .filter((a) => a.station === place)
              .map((a) => {
                const group = groups.find((g) => g.id === a.groupId);
                return (
                  <div key={a.groupId} className="mt-8 text-[40px]">
                    <p>{group?.label}</p>
                    <p className="mt-6">
                      {group?.attendanceNumbers
                        .map((n) => n.toString().padStart(2, "0"))
                        .join(" · ")}
                    </p>
                  </div>
                );
              })}
          </section>
        ))}
      </div>
      <p className="text-[32px]">
        Saat waktu habis, tunggu arahan guru sebelum berpindah.
      </p>
      {roles && (
        <p className="text-[40px]" data-testid="board-roles">
          Pilot:{" "}
          {roles.pilots.map((n) => n.toString().padStart(2, "0")).join(" · ")} ·
          Navigator:{" "}
          {roles.navigators
            .map((n) => n.toString().padStart(2, "0"))
            .join(" · ")}
          <br />
          Navigator menjelaskan kenapa; teman lain menulis tebakan di buku.
        </p>
      )}
    </section>
  );
}
