import type {
  CompetencyMapping,
  EvidenceSelection,
  LearningDetail as RunDetail,
} from "../learning/types";
export function selectTopicEvidence(input: {
  presence: Array<{ id: string }>;
  competency: CompetencyMapping;
  results: RunDetail[];
}): EvidenceSelection[] {
  const candidates: NonNullable<EvidenceSelection["evidence"]>[] = [];
  const byStudent = new Map<
    string,
    NonNullable<EvidenceSelection["evidence"]>[]
  >();
  for (const { run, responses } of input.results) {
    if (run.synthetic || run.responseMethod !== "cards" || !input.competency)
      continue;
    const items = run.document.items.filter((item) => {
      const override = run.mapping.overrides.find((o) => o.itemId === item.id);
      const m = override ? override.mapping : run.mapping.default;
      return (
        item.kind === "card" &&
        m?.competencyId === input.competency?.competencyId &&
        m?.topicId === input.competency?.topicId
      );
    });
    if (!items.length) continue;
    for (const response of responses) {
      if (
        response.status !== "received" ||
        response.answerStates.some((s) => s !== "answered")
      )
        continue;
      const e: NonNullable<EvidenceSelection["evidence"]> = {
        source: "library_cards",
        runId: run.id,
        collectionId: run.collectionId,
        version: run.version,
        responseRevision: response.revision,
        assessedAt: run.date,
        competencyId: input.competency.competencyId,
        comparisonKey: `same-form-topic-v1:${run.collectionId}:${run.version}:${input.competency.competencyId}:${items.map((i) => i.id).join(",")}`,
        itemIds: items.map((i) => i.id),
        correct: items.filter(
          (item) =>
            item.kind === "card" &&
            item.key === response.answers[run.document.items.indexOf(item)],
        ).length,
        total: items.length,
      };
      candidates.push(e);
      byStudent.set(response.studentId, [
        ...(byStudent.get(response.studentId) ?? []),
        e,
      ]);
    }
  }
  const cohorts = [...new Set(candidates.map((e) => e.comparisonKey))]
    .map((key) => ({
      key,
      count: input.presence.filter((p) =>
        byStudent.get(p.id)?.some((e) => e.comparisonKey === key),
      ).length,
      date:
        candidates
          .filter((e) => e.comparisonKey === key)
          .map((e) => e.assessedAt)
          .sort()
          .at(-1) ?? "",
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.date.localeCompare(a.date) ||
        a.key.localeCompare(b.key),
    );
  const key = cohorts[0]?.key;
  return input.presence.map((p) => {
    const choices = (byStudent.get(p.id) ?? [])
      .filter((e) => e.comparisonKey === key)
      .sort(
        (a, b) =>
          b.assessedAt.localeCompare(a.assessedAt) ||
          b.runId.localeCompare(a.runId),
      );
    const evidence = choices[0] ?? null;
    return {
      studentId: p.id,
      status: evidence ? "known" : "unknown",
      reason: evidence
        ? "comparable"
        : !input.competency
          ? "unmapped"
          : byStudent.has(p.id)
            ? "not_comparable"
            : "no_result",
      evidence,
    };
  });
}
