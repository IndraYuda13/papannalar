import { z } from "zod";

/**
 * v4 (§4.7 R3): presets are named for the room, not for the UI.
 *
 * `compact/balanced/large` described the interface; a teacher thinks in distance. The question
 * floor (§4.7 R1) holds in all three — what changes is control size, model size and how much
 * chrome is on screen. `dekat` is the recorded, user-chosen deviation of §4.7 R4 (a small panel
 * the students physically touch), so the marker/control floors there are lower on purpose.
 */
export const BOARD_PRESETS = [
  {
    id: "dekat",
    label: "Jarak dekat",
    description: "Siswa di dekat papan",
    detail: "Target sentuh lebih kecil, model lebih besar",
  },
  {
    id: "sedang",
    label: "Jarak sedang",
    description: "Kelas biasa",
    detail: "Ukuran nyaman untuk kelas",
  },
  {
    id: "jauh",
    label: "Jarak jauh",
    description: "Bangku paling belakang",
    detail: "Chrome paling ringkas, kontrol paling besar",
  },
] as const;

export const BOARD_PRESET_IDS = ["dekat", "sedang", "jauh"] as const;

// v1 used to be `compact | balanced | large`. Migration is by name, never by position.
const LEGACY_PRESETS: Record<string, (typeof BOARD_PRESET_IDS)[number]> = {
  compact: "dekat",
  balanced: "sedang",
  large: "jauh",
};

// Browser preferences only. Never extend the public capability/server DTO with this.
export const appearanceProfileSchema = z.strictObject({
  schemaVersion: z.literal(2),
  displayKey: z.uuid(),
  displayName: z.string().trim().max(40),
  settings: z.strictObject({
    preset: z.enum(BOARD_PRESET_IDS),
    interactionZone: z.enum(["auto", "lower"]),
  }),
});
export type AppearanceProfile = z.infer<typeof appearanceProfileSchema>;

export function defaultAppearance(displayKey: string): AppearanceProfile {
  return appearanceProfileSchema.parse({
    schemaVersion: 2,
    displayKey,
    displayName: "",
    settings: { preset: "sedang", interactionZone: "auto" },
  });
}

/**
 * Reads a stored profile at any schema version. Version 1 is upgraded in place (its preset is
 * translated by name), so a board that was configured before this release keeps its choice
 * instead of silently resetting to the default.
 */
export function parseStoredAppearance(
  value: unknown,
): AppearanceProfile | undefined {
  const current = appearanceProfileSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = z
    .strictObject({
      schemaVersion: z.literal(1),
      displayKey: z.uuid(),
      displayName: z.string().trim().max(40),
      settings: z.strictObject({
        preset: z.enum(["compact", "balanced", "large"]),
        interactionZone: z.enum(["auto", "lower"]),
      }),
    })
    .safeParse(value);
  if (!legacy.success) return undefined;
  return appearanceProfileSchema.parse({
    schemaVersion: 2,
    displayKey: legacy.data.displayKey,
    displayName: legacy.data.displayName,
    settings: {
      preset: LEGACY_PRESETS[legacy.data.settings.preset] ?? "sedang",
      interactionZone: legacy.data.settings.interactionZone,
    },
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
    let raw: unknown = null;
    try {
      raw = JSON.parse(storage().getItem(APPEARANCE_STORAGE_KEY) ?? "null");
    } catch {
      // Invalid/denied storage never blocks opening a board.
    }
    const profile = parseStoredAppearance(raw);
    if (profile) {
      // A migrated version-1 profile is written back once, so the upgrade is not re-run on
      // every read and the teacher's chosen distance survives the release.
      if ((raw as { schemaVersion?: unknown } | null)?.schemaVersion !== 2)
        return save(profile);
      current = { profile, needsSetup: false, persisted: true };
      return current;
    }
    const fresh = defaultAppearance(newKey());
    if (hasLegacyCapabilities) return save(fresh);
    current = { profile: fresh, needsSetup: true, persisted: false };
    return current;
  }
  return { read, save };
}
