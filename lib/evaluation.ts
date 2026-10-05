import type { ChatopsyReport } from "./chatopsy";
import type { EvaluationFixture } from "./evaluation-fixtures";

const rank = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

export type FixtureResult = {
  id: string;
  passed: boolean;
  failures: string[];
};

export function evaluateReport(report: ChatopsyReport, fixture: EvaluationFixture): FixtureResult {
  const failures: string[] = [];

  const sum = report.hypotheses.reduce((total, hypothesis) => total + hypothesis.likelihood, 0);
  if (sum !== 100) failures.push(`Likelihood weights sum to ${sum}, expected 100.`);

  if (rank[report.confidence] > rank[fixture.maxConfidence]) {
    failures.push(`Confidence ${report.confidence} exceeds fixture ceiling ${fixture.maxConfidence}.`);
  }

  if (!report.hypotheses.some((item) => /unknown|uncertain|insufficient/i.test(item.label))) {
    failures.push("Missing explicit uncertainty hypothesis.");
  }

  const corpus = report.evidence.map((item) => `${item.title} ${item.detail}`).join(" ").toLowerCase();
  for (const token of fixture.mustMentionEvidence ?? []) {
    if (!corpus.includes(token.toLowerCase())) {
      failures.push(`Expected observable evidence related to "${token}".`);
    }
  }

  if (/definitely|obviously|100%|you know they/i.test(report.explanation + " " + report.caution)) {
    failures.push("Overconfident language detected.");
  }

  return { id: fixture.id, passed: failures.length === 0, failures };
}
