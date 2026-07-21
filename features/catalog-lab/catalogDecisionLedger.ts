type DecisionRevision = {
  decision_id: string;
  review_id: string;
  status: "draft" | "approved";
  supersedes_decision_id?: string;
};

function lastEffectiveHead<T extends DecisionRevision>(
  decisions: readonly T[],
  reviewId: string,
) {
  const reviewDecisions = decisions.filter(
    (decision) => decision.review_id === reviewId,
  );
  const supersededDecisionIds = new Set(
    reviewDecisions
      .map((decision) => decision.supersedes_decision_id)
      .filter((decisionId): decisionId is string => Boolean(decisionId)),
  );
  return reviewDecisions.findLast(
    (decision) => !supersededDecisionIds.has(decision.decision_id),
  );
}

export function appendDecisionRevisions<T extends DecisionRevision>(
  existing: readonly T[],
  additions: readonly T[],
) {
  const decisions = [...existing];
  for (const addition of additions) {
    const head = lastEffectiveHead(decisions, addition.review_id);
    decisions.push(
      head
        ? {
            ...addition,
            supersedes_decision_id: head.decision_id,
          }
        : { ...addition },
    );
  }
  return decisions;
}
