import {
  Blocks,
  ChartNoAxesCombined,
  Columns3,
  MoveHorizontal,
  PenLine,
  Scale,
  Table2,
} from "lucide-react";
import type { PublicTool } from "@/contracts/tools";
import { cn } from "@/ui/lib/cn";

const icons = {
  "number-line": MoveHorizontal,
  fractions: Columns3,
  ratio: Table2,
  algebra: Blocks,
  balance: Scale,
  graphs: ChartNoAxesCombined,
  writing: PenLine,
};

export function ActivityIcon({
  kind,
  className,
}: {
  kind: PublicTool["kind"] | "writing";
  className?: string;
}) {
  const Icon = icons[kind];
  return (
    <span className={cn("activity-icon", className)} aria-hidden="true">
      <Icon size={22} strokeWidth={1.8} />
    </span>
  );
}
