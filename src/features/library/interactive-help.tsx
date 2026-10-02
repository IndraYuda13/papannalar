"use client";
import { useState } from "react";
import { Check, Lightbulb } from "lucide-react";
import { Button } from "@/ui/components/button";
import { ActivityIcon } from "@/ui/components/activity-icon";
import {
  INTERACTIVE_HELP,
  type InteractiveKind,
  type InteractiveTemplate,
} from "./templates";

export function InteractiveHelp({
  kind,
  onApply,
}: {
  kind: InteractiveKind;
  onApply: (template: InteractiveTemplate) => void;
}) {
  const [chosen, setChosen] = useState<string>();
  const help = INTERACTIVE_HELP[kind];
  return (
    <div className="rounded-input border border-primary/20 bg-pn-teal-100/40 p-3">
      <div className="flex items-center gap-3">
        <ActivityIcon kind={kind} />
        <p className="text-sm">{help.description}</p>
      </div>
      <details className="mt-2">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold text-primary">
          <Lightbulb size={18} aria-hidden />
          Lihat contoh
        </summary>
        <p className="mb-3 text-sm text-muted-foreground">
          Pilih contoh untuk mengisi pertanyaan dan isian alat. Anda bisa
          mengubahnya.
        </p>
        <div className="flex flex-wrap gap-2" aria-label="Contoh aktivitas">
          {help.templates.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              className="template-choice text-left"
              aria-pressed={chosen === template.id}
              onClick={() => {
                onApply(template);
                setChosen(template.id);
              }}
            >
              {chosen === template.id && <Check size={18} aria-hidden />}
              {template.label}
            </Button>
          ))}
        </div>
        <p role="status" className="mt-2 text-sm text-primary">
          {chosen ? "Contoh terisi. Buka preview untuk mencobanya." : ""}
        </p>
      </details>
    </div>
  );
}
