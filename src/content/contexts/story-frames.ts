import type { GeneratedQuestion } from "../templates/types";
import { contentHash, integerText } from "../templates/format";

// Draft S3 frames: a provider may select wording, never change the operation,
// units or numeric placeholders. Human approval is a separate server manifest.
export const STORY_FRAMES = {
  "lift-down-v1": [
    "Lift mulai di lantai {{a}}, lalu turun {{b}} lantai. Di lantai berapa lift berhenti?",
    "Lift berada di lantai {{a}}. Lift turun {{b}} lantai. Tentukan lantai akhirnya.",
  ],
  "water-add-v1": [
    "Resep memakai {{a}}/{{b}} gelas air, ditambah {{c}}/{{d}} gelas lagi. Berapa gelas air seluruhnya?",
    "Campurkan {{a}}/{{b}} gelas air dengan {{c}}/{{d}} gelas air. Berapa jumlah air dalam gelas?",
  ],
  "recipe-ratio-v1": [
    "Resep memakai {{a}} gelas teh untuk {{b}} gelas air. Untuk {{total}} gelas teh, berapa gelas air agar rasanya sama?",
    "Perbandingan teh dan air ialah {{a}} gelas teh untuk {{b}} gelas air. Tentukan air untuk {{total}} gelas teh dengan rasa yang sama.",
  ],
} as const;
export type StoryFrameId = keyof typeof STORY_FRAMES;
export type StoryChoice = Readonly<{ frameId: StoryFrameId; variant: 0 | 1 }>;
export function storyFrameFor(q: GeneratedQuestion): StoryFrameId | null {
  return q.stepId === "D1"
    ? "lift-down-v1"
    : q.stepId === "C3" || q.stepId === "D2"
      ? "water-add-v1"
      : q.stepId === "D3"
        ? "recipe-ratio-v1"
        : null;
}
export function storyFrameHash(frameId: StoryFrameId): string {
  return contentHash(JSON.stringify(STORY_FRAMES[frameId]));
}
export function applyStory(
  q: GeneratedQuestion,
  choice: StoryChoice,
): GeneratedQuestion {
  if (storyFrameFor(q) !== choice.frameId || ![0, 1].includes(choice.variant))
    throw new Error("Unsupported story frame");
  const values: Record<string, number> = {
    a: q.params.a,
    b: q.params.b,
    c: q.params.c,
    d: q.params.d,
    total: q.params.a * q.params.c,
  };
  const text = STORY_FRAMES[choice.frameId][choice.variant].replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => {
      if (!(key in values)) throw new Error("Unsupported numeric placeholder");
      return integerText(values[key]);
    },
  );
  return {
    ...q,
    story: { frameId: choice.frameId, variant: choice.variant },
    prompt: [{ kind: "text", text }],
    metadata: {
      ...q.metadata,
      contentHash: contentHash(`${q.mathFingerprint}:${text}`),
    },
  };
}
