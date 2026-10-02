import { z } from "zod";

export const BOARD_PRESETS = [
  { id: "compact", label: "Ringkas", description: "Ruang model lebih lapang" },
  {
    id: "balanced",
    label: "Seimbang",
    description: "Ukuran nyaman untuk kelas",
  },
  {
    id: "large",
    label: "Besar",
    description: "Tulisan dan penanda lebih besar",
  },
] as const;

// Browser preferences only. Never extend the public capability/server DTO with this.
export const appearanceProfileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  displayKey: z.uuid(),
  displayName: z.string().trim().max(40),
  settings: z.strictObject({
    preset: z.enum(["compact", "balanced", "large"]),
    interactionZone: z.enum(["auto", "lower"]),
  }),
});
export type AppearanceProfile = z.infer<typeof appearanceProfileSchema>;

export function defaultAppearance(displayKey: string): AppearanceProfile {
  return appearanceProfileSchema.parse({
    schemaVersion: 1,
    displayKey,
    displayName: "",
    settings: { preset: "balanced", interactionZone: "auto" },
  });
}

export const APPEARANCE_STORAGE_KEY = "pn-board-appearance-v1";
type LocalStorage = Pick<Storage, "getItem" | "setItem">;
export type AppearanceSnapshot = {
  profile: AppearanceProfile;
  needsSetup: boolean;
  persisted: boolean;
};

// Injected storage keeps denied storage, migration and tab-only reuse testable.
export function createAppearanceStore(
  storage: () => LocalStorage,
  newKey: () => string = () => crypto.randomUUID(),
) {
  let current: AppearanceSnapshot | undefined;
  function save(value: AppearanceProfile): AppearanceSnapshot {
    const profile = appearanceProfileSchema.parse(value);
    current = { profile, needsSetup: false, persisted: false };
    try {
      storage().setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(profile));
      current.persisted = true;
    } catch {
      // The profile remains usable for this tab even when storage is denied.
    }
    return current;
  }
  function read(hasLegacyCapabilities = false): AppearanceSnapshot {
    if (current) return current;
    try {
      const parsed = appearanceProfileSchema.safeParse(
        JSON.parse(storage().getItem(APPEARANCE_STORAGE_KEY) ?? "null"),
      );
      if (parsed.success) {
        current = { profile: parsed.data, needsSetup: false, persisted: true };
        return current;
      }
    } catch {
      // Invalid/denied storage never blocks opening a board.
    }
    const profile = defaultAppearance(newKey());
    if (hasLegacyCapabilities) return save(profile);
    current = { profile, needsSetup: true, persisted: false };
    return current;
  }
  return { read, save };
}
