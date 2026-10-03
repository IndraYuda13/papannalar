import { z } from "zod";
import { randomIdSchema } from "./domain";
import { STORY_FRAME_IDS } from "../content/contexts/story-frames";

export const storyChoiceSchema = z.strictObject({
  frameId: z.enum(STORY_FRAME_IDS),
  variant: z.union([z.literal(0), z.literal(1)]),
});
export const storySuggestionSchema = z.strictObject({
  questionId: randomIdSchema,
  choice: storyChoiceSchema,
});
export const storyOutputSchema = z.strictObject({
  status: z.enum(["ok", "unsupported"]),
  stories: z
    .array(
      z.strictObject({
        slotId: z.string().regex(/^slot-[0-9]{1,2}$/),
        segments: z.array(z.string().min(1).max(500)).min(1).max(3),
      }),
    )
    .max(3),
});
export type StorySuggestion = z.infer<typeof storySuggestionSchema>;
