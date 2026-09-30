import type { StepId } from "../../content/ladder/registry";
import { STEP_IDS } from "../../content/ladder/registry";
import {
  canonicalAnswer,
  answerText,
  contentHash,
} from "../../content/templates/format";
import {
  templateFor,
  fallbackDistractor,
} from "../../content/templates/registry";
import type {
  ChoiceLabel,
  Distractor,
  GeneratedQuestion,
} from "../../content/templates/types";
import { seededGroupId, seededShuffle } from "../math/seed";

const labels = ["A", "B", "C", "D"] as const;
export function generateQuestion(
  step: StepId,
  seed: number,
  revision: 1 | 2 = 2,
): GeneratedQuestion {
  const template = templateFor(step, revision),
    params = template.generateParams(seed);
  if (template.validate(params).length)
    throw new Error("Content parameters failed validation");
  const answer = template.solve(params),
    correct = canonicalAnswer(answer);
  const values = new Set([correct]),
    codes = new Set<string>(),
    wrong: Distractor[] = [];
  function append(candidate: Distractor) {
    const key = canonicalAnswer(candidate.value);
    if (
      values.has(key) ||
      (candidate.misconceptionCode && codes.has(candidate.misconceptionCode))
    )
      return;
    values.add(key);
    if (candidate.misconceptionCode) codes.add(candidate.misconceptionCode);
    wrong.push(candidate);
  }
  for (const candidate of template.distractors(params))
    if (wrong.length < 3) append(candidate);
  for (let attempt = 1; wrong.length < 3 && attempt <= 50; attempt++)
    append(fallbackDistractor(step, params, attempt));
  if (wrong.length !== 3) throw new Error("No valid question choices");
  const choices = seededShuffle(
    [
      {
        text: answerText(answer),
        canonicalValue: correct,
        classification: "correct" as const,
      },
      ...wrong.map((d) => ({
        text: answerText(d.value),
        canonicalValue: canonicalAnswer(d.value),
        classification: d.classification,
        ...(d.misconceptionCode
          ? { misconceptionCode: d.misconceptionCode }
          : {}),
      })),
    ],
    seed,
  );
  const reasons = seededShuffle(
    [
      { text: template.reason(params), classification: "correct" as const },
      ...wrong.map((d) => ({
        text: d.explanation,
        classification: d.classification,
        ...(d.misconceptionCode
          ? { misconceptionCode: d.misconceptionCode }
          : {}),
      })),
    ],
    (seed ^ 0x71389) >>> 0,
  );
  return {
    id: seededGroupId(
      seed,
      template.metadata.version === "1.0.0" ? 0 : STEP_IDS.indexOf(step) + 23,
    ),
    templateId: template.id,
    stepId: step,
    seed,
    params,
    metadata: {
      ...template.metadata,
      contentHash: contentHash(
        JSON.stringify({
          params,
          prompt: template.render(params),
          choices,
          reasons,
        }),
      ),
    },
    mathFingerprint: `${template.id}:${JSON.stringify(params)}`,
    prompt: template.render(params),
    options: choices.map((option, index) => ({
      ...option,
      label: labels[index],
    })),
    answerKey: labels[
      choices.findIndex((o) => o.classification === "correct")
    ] as ChoiceLabel,
    reasons: reasons.map((option, index) => ({
      ...option,
      label: labels[index],
    })),
    reasonKey: labels[
      reasons.findIndex((o) => o.classification === "correct")
    ] as ChoiceLabel,
    hints: [
      "Tunjukkan besaran yang diketahui pada model.",
      "Bandingkan model dengan operasi yang diminta.",
      template.reason(params),
    ],
  };
}
export function questionContentHash(question: GeneratedQuestion): string {
  return contentHash(JSON.stringify(question));
}
