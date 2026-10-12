"use client";
import {
  TOPIC_COMPETENCIES,
  type CompetencyMapping,
  type CollectionMapping,
} from "@/contracts/learning-evidence";
import { field } from "./client";
export function CompetencyField({
  value,
  onChange,
  disabled = false,
  label = "Topik yang dipelajari",
}: {
  value: CompetencyMapping;
  onChange: (value: CompetencyMapping) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label className="block">
      {label}
      <select
        className={field}
        value={value?.competencyId ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const c = TOPIC_COMPETENCIES.find(
            (c) => c.competencyId === e.target.value,
          );
          onChange(
            c
              ? {
                  topicId: c.topicId,
                  competencyId: c.competencyId,
                  mappingVersion: 1,
                }
              : null,
          );
        }}
      >
        <option value="">Belum dipetakan</option>
        {TOPIC_COMPETENCIES.map((c) => (
          <option key={c.competencyId} value={c.competencyId}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function MappingFields({
  value,
  items,
  onChange,
  disabled,
}: {
  value: CollectionMapping;
  items: { id: string; prompt: string }[];
  onChange: (value: CollectionMapping) => void;
  disabled: boolean;
}) {
  return (
    <details>
      <summary className="min-h-12 cursor-pointer content-center font-semibold">
        Topik dan kemampuan yang diperiksa
      </summary>
      <div className="space-y-3">
        <p className="text-sm">
          Opsional. Berlaku untuk versi baru, tidak mengubah hasil lama. Hasil
          pada kumpulan ini bukan tingkat kemampuan.
        </p>
        <CompetencyField
          label="Kemampuan utama"
          value={value.default}
          disabled={disabled}
          onChange={(v) => onChange({ ...value, default: v })}
        />
        <details>
          <summary className="min-h-12 cursor-pointer content-center">
            Atur per soal bila berbeda
          </summary>
          {items.map((item, i) => {
            const override = value.overrides.find((o) => o.itemId === item.id);
            return (
              <div key={item.id} className="border-t py-3">
                <p className="break-words">
                  Soal {i + 1}: {item.prompt}
                </p>
                <label className="flex min-h-12 items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={!!override}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        overrides: e.target.checked
                          ? [
                              ...value.overrides,
                              { itemId: item.id, mapping: value.default },
                            ]
                          : value.overrides.filter((o) => o.itemId !== item.id),
                      })
                    }
                  />
                  Gunakan topik berbeda
                </label>
                {override && (
                  <CompetencyField
                    value={override.mapping}
                    disabled={disabled}
                    onChange={(v) =>
                      onChange({
                        ...value,
                        overrides: value.overrides.map((o) =>
                          o.itemId === item.id ? { ...o, mapping: v } : o,
                        ),
                      })
                    }
                  />
                )}
              </div>
            );
          })}
        </details>
      </div>
    </details>
  );
}
