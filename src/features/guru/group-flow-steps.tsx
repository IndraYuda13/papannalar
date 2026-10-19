import { ProgressLabel, WorkflowSteps } from "@/ui/components/studio";

const STEPS = ["Kelas dan topik", "Bagi kelompok", "Siap mulai"] as const;

export function GroupFlowSteps({
  phase,
  groupCount,
}: {
  phase: "prepare" | "edit" | "ready";
  groupCount: number;
}) {
  const current = phase === "prepare" ? 0 : phase === "edit" ? 1 : 2;
  return (
    <div className="pn-group-flow" aria-label="Tahapan persiapan kelompok">
      <WorkflowSteps steps={STEPS} current={current} />
      <ProgressLabel
        index={current + 1}
        total={STEPS.length}
        label={
          phase === "ready"
            ? `${groupCount} kelompok siap dimulai`
            : phase === "edit"
              ? `${groupCount} kelompok perlu diatur`
              : "Pilih kelas dan topik dulu"
        }
      />
    </div>
  );
}
