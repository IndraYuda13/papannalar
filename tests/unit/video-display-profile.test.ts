import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  BOARD_PRESETS,
  appearanceProfileSchema,
  createAppearanceStore,
  defaultAppearance,
} from "../../src/features/layar/appearance-profile";
import {
  APPEARANCE_EXAMPLES,
  appearanceExample,
} from "../../src/features/layar/appearance-examples";
import { libraryBoardSchema } from "../../src/contracts/library";
import {
  readBoardProfile,
  saveBoardProfile,
  sendBoardProfile,
} from "../../src/features/layar/capability-storage";
import type { BoardProfile } from "../../src/contracts/board-profile";

const key = "132f3d5a-1b2b-476a-8bbb-b1e78194833e";
const legacy: BoardProfile = {
  schemaVersion: 1,
  touches: 2,
  pointerEvents: true,
  indexedDb: true,
  serviceWorker: true,
  width: 1920,
  heightPixels: 1080,
  browser: "chromium",
  major: 140,
  samples: 0,
  medianMs: null,
  p95Ms: null,
  height: "normal",
  durationSeconds: 8,
};
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => {
      values.set(name, value);
    },
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("local appearance profile", () => {
  it("migrates legacy capability preferences without rewriting version 1 or needing setup", () => {
    const disk = storage();
    disk.setItem("pn-board-capabilities-v1", JSON.stringify(legacy));
    const result = createAppearanceStore(
      () => disk,
      () => key,
    ).read(true);
    expect(result).toEqual({
      profile: defaultAppearance(key),
      needsSetup: false,
      persisted: true,
    });
    expect(JSON.parse(disk.getItem("pn-board-capabilities-v1")!)).toEqual(
      legacy,
    );
    expect(JSON.parse(disk.getItem(APPEARANCE_STORAGE_KEY)!)).toEqual(
      result.profile,
    );
  });
  it("first use requires save; subsequent instances keep the chosen preset, name and local identity", () => {
    const disk = storage(),
      store = createAppearanceStore(
        () => disk,
        () => key,
      );
    expect(store.read().needsSetup).toBe(true);
    expect(disk.values.size).toBe(0);
    const chosen = {
      ...store.read().profile,
      displayName: "Papan 7B",
      settings: { preset: "large" as const, interactionZone: "lower" as const },
    };
    store.save(chosen);
    const next = createAppearanceStore(
      () => disk,
      () => {
        throw new Error("must reuse displayKey");
      },
    );
    expect(next.read()).toEqual({
      profile: chosen,
      needsSetup: false,
      persisted: true,
    });
  });
  it("uses a single tab profile after storage is denied, including an unavailable getter", () => {
    const store = createAppearanceStore(
      () => {
        throw new Error("denied");
      },
      () => key,
    );
    const first = store.read();
    const saved = store.save({
      ...first.profile,
      settings: { preset: "compact", interactionZone: "auto" },
    });
    expect(saved.persisted).toBe(false);
    expect(store.read()).toBe(saved);
    expect(store.read().needsSetup).toBe(false);
    expect(store.read().profile.displayKey).toBe(key);
  });
  it.each([
    "{broken",
    "null",
    '{"schemaVersion":99}',
    JSON.stringify({ ...defaultAppearance(key), token: "forbidden" }),
  ])("recovers invalid storage %s", (value) => {
    const disk = storage();
    disk.setItem(APPEARANCE_STORAGE_KEY, value);
    expect(
      createAppearanceStore(
        () => disk,
        () => key,
      ).read(),
    ).toEqual({
      profile: defaultAppearance(key),
      needsSetup: true,
      persisted: false,
    });
  });
  it("accepts only named presets and local preferences, never pairing or student fields", () => {
    for (const preset of BOARD_PRESETS)
      expect(
        appearanceProfileSchema.safeParse({
          ...defaultAppearance(key),
          settings: { preset: preset.id, interactionZone: "auto" },
        }).success,
      ).toBe(true);
    for (const field of [
      "token",
      "studentId",
      "groups",
      "level",
      "capabilities",
    ])
      expect(
        appearanceProfileSchema.safeParse({
          ...defaultAppearance(key),
          [field]: "private",
        }).success,
      ).toBe(false);
    expect(
      appearanceProfileSchema.safeParse({
        ...defaultAppearance(key),
        displayName: "x".repeat(41),
      }).success,
    ).toBe(false);
    expect(
      appearanceProfileSchema.safeParse({
        ...defaultAppearance(key),
        settings: { preset: "giant", interactionZone: "auto" },
      }).success,
    ).toBe(false);
  });
  it("uses valid production presentation descriptors for all three preview questions", () => {
    for (const sample of APPEARANCE_EXAMPLES) {
      const state = appearanceExample(sample);
      expect(libraryBoardSchema.shape.item.parse(state)).toEqual(state);
      expect(state).not.toHaveProperty("key");
      expect(state).not.toHaveProperty("groups");
      expect(state).not.toHaveProperty("package");
      expect(state).not.toHaveProperty("capabilities");
    }
    expect(appearanceExample(APPEARANCE_EXAMPLES[1])).toMatchObject({
      kind: "interactive",
      tool: { kind: "fractions" },
    });
  });
  it("keeps capability version 1 local when upload fails and never sends displayKey/name/settings", async () => {
    const disk = storage();
    vi.stubGlobal("localStorage", disk);
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    expect(saveBoardProfile(legacy)).toBe(true);
    await expect(
      sendBoardProfile({ ...legacy, ...defaultAppearance(key) }),
    ).rejects.toThrow();
    expect(readBoardProfile()).toEqual(legacy);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(legacy);
    expect(disk.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });
  it("keeps capability fallback in RAM when disk writes fail", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    expect(saveBoardProfile({ ...legacy, touches: 0 })).toBe(false);
    expect(readBoardProfile()?.touches).toBe(0);
    vi.stubGlobal("localStorage", storage());
    expect(saveBoardProfile(legacy)).toBe(true);
  });
});
