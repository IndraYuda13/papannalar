"use client";
import { useState } from "react";
import { Button } from "@/ui/components/button";
import { LibraryItemView } from "@/features/library/item-view";
import { BOARD_PRESETS } from "./appearance-profile";
import { useBoardAppearance } from "./appearance-context";
import {
  APPEARANCE_EXAMPLES,
  appearanceExample,
  type AppearanceExample,
} from "./appearance-examples";
export function AppearanceEditor() {
  const {
    draft,
    firstUse,
    changeAppearance,
    saveAppearance,
    cancelAppearance,
  } = useBoardAppearance();
  const [example, setExample] = useState<AppearanceExample>(
    APPEARANCE_EXAMPLES[0],
  );
  if (!draft) return null;
  const state = appearanceExample(example);
  return (
    <section className="board-appearance" aria-label="Atur tampilan layar">
      <div className="board-appearance-heading">
        <h1>Pilih tampilan yang nyaman</h1>
        <label>
          Nama layar <span className="text-muted-foreground">(opsional)</span>
          <input
            aria-label="Nama layar"
            maxLength={40}
            placeholder="Papan 7B"
            value={draft.displayName}
            onChange={(event) =>
              changeAppearance({ ...draft, displayName: event.target.value })
            }
          />
        </label>
      </div>
      <div
        className="board-appearance-presets"
        role="group"
        aria-label="Ukuran tampilan"
      >
        {BOARD_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            aria-pressed={draft.settings.preset === preset.id}
            onClick={() =>
              changeAppearance({
                ...draft,
                settings: { ...draft.settings, preset: preset.id },
              })
            }
          >
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
      </div>
      <div className="board-appearance-toolbar">
        <div
          role="group"
          aria-label="Soal contoh"
          className="flex flex-wrap gap-2"
        >
          {APPEARANCE_EXAMPLES.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              aria-pressed={example.id === item.id}
              onClick={() => setExample(item)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          Zona interaksi
          <select
            aria-label="Zona interaksi"
            value={draft.settings.interactionZone}
            onChange={(event) =>
              changeAppearance({
                ...draft,
                settings: {
                  ...draft.settings,
                  interactionZone:
                    event.target.value === "lower" ? "lower" : "auto",
                },
              })
            }
          >
            <option value="auto">Sesuai kemampuan</option>
            <option value="lower">Lebih rendah</option>
          </select>
        </label>
        <Button onClick={saveAppearance}>Simpan tampilan</Button>
        {!firstUse && (
          <Button variant="outline" onClick={cancelAppearance}>
            Batal
          </Button>
        )}
      </div>
      <div
        className="board-appearance-preview"
        aria-label="Pratinjau ukuran sebenarnya"
        data-interaction-zone={draft.settings.interactionZone}
      >
        {/* Real board components and engines; only the example changes, never a scaled screenshot. */}
        <LibraryItemView key={example.id} item={state} />
      </div>
    </section>
  );
}
