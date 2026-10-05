import type { ChatopsyReport, Evidence, Hypothesis } from "./chatopsy";

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

function lowerConfidence(
  a: ChatopsyReport["confidence"],
  b: ChatopsyReport["confidence"]
): ChatopsyReport["confidence"] {
  return confidenceRank(a) <= confidenceRank(b) ? a : b;
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

function uniqueEvidence(items: Evidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeHypotheses(items: Hypothesis[]) {
  const raw = items.map((item) => Math.max(0, item.likelihood));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const weights = raw.map((value) => Math.round((value / sum) * 100));
  if (weights.length) weights[0] += 100 - weights.reduce((a, b) => a + b, 0);
  return items.map((item, index) => ({ ...item, likelihood: weights[index] }));
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

export function buildHybridReport(
  deterministic: ChatopsyReport,
  model: ChatopsyReport
): ChatopsyReport {
  const modelByLabel = new Map(
    model.hypotheses.map((item) => [normalizeTitle(item.label), item] as const)
  );

  const mergedHypotheses = deterministic.hypotheses.map((base) => {
    const other = modelByLabel.get(normalizeTitle(base.label));
    if (!other) return base;

    return {
      label: base.label,
      likelihood: Math.round((base.likelihood + other.likelihood) / 2),
      note: other.note || base.note,
      for: uniqueEvidence([...base.for, ...other.for]).slice(0, 5),
      against: uniqueEvidence([...base.against, ...other.against]).slice(0, 5),
    };
  });

  const comparison = compareReports(deterministic, model);

  return {
    ...deterministic,
    headline: model.headline || deterministic.headline,
    finding: model.finding || deterministic.finding,
    explanation:
      comparison.flags.length > 0
        ? `${model.explanation} Hybrid note: the analyzers disagree on at least one material point, so confidence is capped conservatively.`
        : model.explanation,
    confidence: lowerConfidence(deterministic.confidence, model.confidence),
    hypotheses: normalizeHypotheses(mergedHypotheses),
    evidence: uniqueEvidence([...deterministic.evidence, ...model.evidence]).slice(0, 8),
    missingContext: [...new Set([...deterministic.missingContext, ...model.missingContext])].slice(0, 8),
    caution:
      comparison.flags.length > 0
        ? `${model.caution} Analyzer disagreement remains visible; do not treat the hybrid result as ground truth.`
        : model.caution,
    suggestedReply: model.suggestedReply || deterministic.suggestedReply,
  };
}
