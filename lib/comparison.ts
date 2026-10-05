import type { ChatopsyReport, Hypothesis } from "./chatopsy";

export type ReportComparison = {
  deterministic: ChatopsyReport;
  model: ChatopsyReport;
  agreement: {
    topHypothesisMatch: boolean;
    topLikelihoodDelta: number;
    confidenceMatch: boolean;
    evidenceTitleOverlap: number;
  };
  flags: string[];
};

function top(report: ChatopsyReport): Hypothesis {
  return [...report.hypotheses].sort((a, b) => b.likelihood - a.likelihood)[0];
}

function confidenceRank(value: ChatopsyReport["confidence"]) {
  return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleOverlap(a: ChatopsyReport, b: ChatopsyReport) {
  const aa = new Set(a.evidence.map((item) => normalizeTitle(item.title)));
  const bb = new Set(b.evidence.map((item) => normalizeTitle(item.title)));
  const union = new Set([...aa, ...bb]);
  if (!union.size) return 1;
  const shared = [...aa].filter((value) => bb.has(value)).length;
  return Number((shared / union.size).toFixed(3));
}

export function compareReports(
  deterministic: ChatopsyReport,
  model: ChatopsyReport
): ReportComparison {
  const dTop = top(deterministic);
  const mTop = top(model);
  const topHypothesisMatch = normalizeTitle(dTop.label) === normalizeTitle(mTop.label);
  const topLikelihoodDelta = Math.abs(dTop.likelihood - mTop.likelihood);
  const confidenceMatch = deterministic.confidence === model.confidence;
  const evidenceTitleOverlap = titleOverlap(deterministic, model);

  const flags: string[] = [];

  if (!topHypothesisMatch) {
    flags.push("The deterministic engine and model disagree on the leading interpretation.");
  }
  if (topLikelihoodDelta >= 20) {
    flags.push("The two analyzers assign materially different weight to their leading interpretation.");
  }
  if (confidenceRank(model.confidence) > confidenceRank(deterministic.confidence)) {
    flags.push("The model is more confident than the transparent baseline; inspect its evidence before trusting it.");
  }
  if (evidenceTitleOverlap < 0.25) {
    flags.push("The analyzers rely on substantially different evidence descriptions.");
  }
  if (!model.hypotheses.some((item) => /unknown|uncertain|insufficient/i.test(item.label))) {
    flags.push("The model failed to preserve an explicit uncertainty hypothesis.");
  }

  return {
    deterministic,
    model,
    agreement: {
      topHypothesisMatch,
      topLikelihoodDelta,
      confidenceMatch,
      evidenceTitleOverlap,
    },
    flags,
  };
}
