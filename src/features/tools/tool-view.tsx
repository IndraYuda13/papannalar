"use client";
import dynamic from "next/dynamic";
import type { FractionValue } from "@/core/tools/fractions";
import { lineTask, type ToolModel, type ToolTask } from "@/core/tools/patterns";
import { NumberLine } from "./number-line";
const RatioTable = dynamic(() => import("./ratio").then((m) => m.RatioTable));
const AlgebraTiles = dynamic(() =>
  import("./algebra").then((m) => m.AlgebraTiles),
);
const Balance = dynamic(() => import("./balance").then((m) => m.Balance));
const Graphs = dynamic(() => import("./graphs").then((m) => m.Graphs));
const Fractions = dynamic(
  () => import("./fractions").then((m) => m.Fractions),
  { loading: () => <p>Menyiapkan alat…</p> },
);
export function ToolView({
  task,
  initial,
  onRun,
  hideHeading = false,
}: {
  task: ToolTask;
  initial?: ToolModel;
  onRun?: (model: ToolModel) => boolean;
  hideHeading?: boolean;
}) {
  if (task.kind === "graphs")
    return (
      <div className="w-full">
        {!hideHeading && (
          <h1 className="mb-4 text-[56px] font-bold">Grafik Geser</h1>
        )}
        <Graphs
          task={task}
          initial={initial?.kind === "graphs" ? initial.state : undefined}
          onRun={onRun}
        />
      </div>
    );
  if (task.kind === "balance")
    return (
      <div className="w-full">
        {!hideHeading && (
          <h1 className="mb-4 text-[56px] font-bold">
            Temukan satu x · Timbangan Persamaan
          </h1>
        )}
        <Balance
          task={task}
          initial={initial?.kind === "balance" ? initial.state : undefined}
          onRun={onRun}
        />
      </div>
    );
  if (task.kind === "number-line")
    return (
      <NumberLine
        task={lineTask(task)}
        initial={initial?.kind === "number-line" ? initial.state : undefined}
        onRun={onRun}
      />
    );
  if (task.kind === "ratio")
    return (
      <div className="w-full">
        {!hideHeading && (
          <h1 className="mb-4 text-[56px] font-bold">
            {task.baseX} : {task.baseY} = {task.targetX} : …
          </h1>
        )}
        <RatioTable
          task={task}
          initial={initial?.kind === "ratio" ? initial.state : undefined}
          onRun={onRun}
        />
      </div>
    );
  if (task.kind === "algebra")
    return (
      <div className="w-full">
        {!hideHeading && (
          <h1 className="mb-4 text-[56px] font-bold">
            Bangun {task.groups}({task.xPerGroup}x{" "}
            {task.constantPerGroup < 0 ? "−" : "+"}{" "}
            {Math.abs(task.constantPerGroup)})
          </h1>
        )}
        <AlgebraTiles
          task={task}
          initial={initial?.kind === "algebra" ? initial.state : undefined}
          onRun={onRun}
        />
      </div>
    );
  const fraction = (value: FractionValue) => (
    <span className="mx-3 inline-flex flex-col align-middle">
      <span className="border-b-4 border-current">
        {value.numerator.toString().replace("-", "−")}
      </span>
      <span>{value.denominator}</span>
    </span>
  );
  return (
    <div className="w-full">
      {!hideHeading && (
        <h1 className="mb-4 text-[56px] font-bold">
          {task.operation === "add" ? (
            <>
              {fraction(task.left)} + {fraction(task.right)} · Bangun modelnya
            </>
          ) : task.operation === "equivalent" ? (
            <>Temukan pecahan senilai dengan {fraction(task.left)}</>
          ) : (
            <>Warnai {fraction(task.left)} dari satu utuh</>
          )}
        </h1>
      )}
      <Fractions
        task={task}
        initial={initial?.kind === "fractions" ? initial.state : undefined}
        onRun={onRun}
      />
    </div>
  );
}
