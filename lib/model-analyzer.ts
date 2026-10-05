import type { ChatopsyReport, Evidence, Hypothesis } from "./chatopsy";

type GatewayResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

const WEIGHTS = new Set<Evidence["weight"]>(["weak", "moderate", "strong"]);
const CANONICAL_LABELS = [
  "mildly upset / withdrawing",
  "genuinely fine",
  "wants you to notice something",
  "unknowable from this chat",
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeWeight(value: unknown): Evidence["weight"] {
  return typeof value === "string" && WEIGHTS.has(value as Evidence["weight"])
    ? (value as Evidence["weight"])
    : "moderate";
}

function safeEvidence(value: unknown): Evidence[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const detail = typeof row.detail === "string" ? row.detail.trim() : "";
    if (!title || !detail) return [];
    return [{ title, detail, weight: safeWeight(row.weight) }];
  });
}

function normalizeLikelihoods(values: number[]) {
  const safe = values.map((value) => clamp(Number.isFinite(value) ? value : 0, 0, 100));
  const sum = safe.reduce((a, b) => a + b, 0) || 1;
  const rounded = safe.map((value) => Math.round((value / sum) * 100));
  if (rounded.length) rounded[0] += 100 - rounded.reduce((a, b) => a + b, 0);
  return rounded;
}

function parseJsonObject(text: string) {
  const trimmed = text.trim().replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Model did not return a JSON object.");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

function cleanHypotheses(value: unknown): Hypothesis[] {
  if (!Array.isArray(value)) return [];

  const parsed = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) return [];
    return [{
      label,
      likelihood: typeof row.likelihood === "number" ? row.likelihood : Number(row.likelihood) || 0,
      note: typeof row.note === "string" ? row.note.trim() : "",
      for: safeEvidence(row.for),
      against: safeEvidence(row.against),
    }];
  });

  const canonical = CANONICAL_LABELS.map((label) => {
    const match = parsed.find((item) => item.label.toLowerCase() === label.toLowerCase());
    return match ?? {
      label,
      likelihood: label === "unknowable from this chat" ? 25 : 25,
      note: "Model omitted this required competing hypothesis, so Chatopsy restored it.",
      for: [],
      against: [],
    };
  });

  const normalized = normalizeLikelihoods(canonical.map((item) => item.likelihood));
  return canonical.map((item, index) => ({ ...item, likelihood: normalized[index] }));
}

function sanitizeModelReport(raw: Record<string, unknown>, baseline: ChatopsyReport): ChatopsyReport {
  const hypotheses = cleanHypotheses(raw.hypotheses);

  const confidence =
    raw.confidence === "HIGH" || raw.confidence === "MEDIUM" || raw.confidence === "LOW"
      ? raw.confidence
      : "LOW";

  const modelEvidence = safeEvidence(raw.evidence);
  const evidence = modelEvidence.length ? modelEvidence : baseline.evidence;

  return {
    caseId: baseline.caseId,
    headline: typeof raw.headline === "string" && raw.headline.trim() ? raw.headline.trim() : baseline.headline,
    finding: typeof raw.finding === "string" && raw.finding.trim() ? raw.finding.trim() : baseline.finding,
    explanation:
      typeof raw.explanation === "string" && raw.explanation.trim()
        ? raw.explanation.trim()
        : baseline.explanation,
    confidence,
    hypotheses,
    evidence,
    missingContext: Array.isArray(raw.missingContext)
      ? raw.missingContext.filter((item): item is string => typeof item === "string").slice(0, 6)
      : baseline.missingContext,
    caution:
      typeof raw.caution === "string" && raw.caution.trim()
        ? raw.caution.trim()
        : baseline.caution,
    suggestedReply:
      typeof raw.suggestedReply === "string" && raw.suggestedReply.trim()
        ? raw.suggestedReply.trim()
        : baseline.suggestedReply,
  };
}

export function isModelAnalysisConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY && process.env.CHATOPSY_MODEL);
}

export async function analyzeConversationWithModel(
  conversation: string,
  baseline: ChatopsyReport
): Promise<ChatopsyReport> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.CHATOPSY_MODEL;
  if (!apiKey || !model) throw new Error("Model analysis is not configured.");

  const system = [
    "You are Chatopsy, an uncertainty-aware conversational forensics analyst.",
    "Never claim to know a person's private mental state.",
    "Generate competing explanations, not one diagnosis.",
    "Evidence must refer only to observable wording or conversation structure in the supplied chat.",
    "Every hypothesis needs evidence FOR and AGAINST it.",
    "Use exactly these four hypothesis labels: " + CANONICAL_LABELS.join(" | "),
    "Likelihood values are relative UI weights, not psychological probabilities.",
    "Prefer LOW or MEDIUM confidence unless the observable pattern is unusually clear.",
    "Suggested replies must be low-pressure and non-accusatory.",
    "Return JSON only.",
  ].join("\n");

  const user = JSON.stringify({
    task: "Analyze the conversation and return a ChatopsyReport-shaped JSON object.",
    requiredShape: {
      headline: "string",
      finding: "string",
      explanation: "string",
      confidence: "LOW | MEDIUM | HIGH",
      hypotheses: [{
        label: "one of the four required canonical labels",
        likelihood: "number 0-100",
        note: "string",
        for: [{ title: "string", detail: "string", weight: "weak | moderate | strong" }],
        against: [{ title: "string", detail: "string", weight: "weak | moderate | strong" }],
      }],
      evidence: [{ title: "string", detail: "string", weight: "weak | moderate | strong" }],
      missingContext: ["string"],
      caution: "string",
      suggestedReply: "string",
    },
    deterministicBaseline: {
      confidence: baseline.confidence,
      evidence: baseline.evidence,
      hypotheses: baseline.hypotheses.map(({ label, likelihood }) => ({ label, likelihood })),
    },
    conversation,
  });

  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI Gateway request failed (${response.status}): ${detail.slice(0, 180)}`);
  }

  const payload = (await response.json()) as GatewayResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI Gateway returned no text content.");

  return sanitizeModelReport(parseJsonObject(content), baseline);
}
