export type Evidence = {
  title: string;
  detail: string;
  weight: "weak" | "moderate" | "strong";
};

export type Hypothesis = {
  label: string;
  likelihood: number;
  note: string;
  for: Evidence[];
  against: Evidence[];
};

export type ChatopsyReport = {
  caseId: string;
  headline: string;
  finding: string;
  explanation: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  missingContext: string[];
  caution: string;
  suggestedReply: string;
};

const shortDeflections = new Set([
  "fine",
  "fine.",
  "ok",
  "okay",
  "okay.",
  "k",
  "sure",
  "sure.",
  "idk",
  "whatever",
  "nothing",
  "nothing.",
]);

function cleanMessage(line: string) {
  const idx = line.indexOf(":");
  if (idx === -1) return { speaker: "Unknown", text: line.trim() };
  return {
    speaker: line.slice(0, idx).trim() || "Unknown",
    text: line.slice(idx + 1).trim(),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalize(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0) || 1;
  const rounded = values.map((v) => Math.round((v / sum) * 100));
  const delta = 100 - rounded.reduce((a, b) => a + b, 0);
  if (rounded.length) rounded[0] += delta;
  return rounded;
}

export function analyzeConversation(input: string): ChatopsyReport {
  const messages = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(cleanMessage);

  const last = messages.at(-1);
  const previous = messages.at(-2);
  const lastText = last?.text ?? "";
  const previousText = previous?.text ?? "";

  const evidence: Evidence[] = [];
  const missingContext: string[] = [];

  const words = lastText.split(/\s+/).filter(Boolean);
  const prevWords = previousText.split(/\s+/).filter(Boolean);

  const lastIsShort = words.length <= 3;
  const lengthCollapsed =
    lastIsShort && prevWords.length >= 4 && words.length <= Math.max(1, prevWords.length / 2);

  if (lengthCollapsed) {
    evidence.push({
      title: "Reply length collapsed",
      detail: "The latest response is much shorter than the message immediately before it.",
      weight: "moderate",
    });
  }

  const normalized = lastText.toLowerCase();
  if (shortDeflections.has(normalized)) {
    evidence.push({
      title: "Possible deflection",
      detail: `“${lastText}” can close a topic without actually answering it.`,
      weight: "moderate",
    });
  }

  const previousWasQuestion = /[?？]\s*$/.test(previousText);
  if (previousWasQuestion && !/^(yes|yeah|yep|no|nope|nah)\b/i.test(lastText)) {
    evidence.push({
      title: "Direct question was not answered directly",
      detail: "The previous message asked a question, but the response sidestepped a clean yes/no answer.",
      weight: "strong",
    });
  }

  if (/\.$/.test(lastText) && words.length <= 3) {
    evidence.push({
      title: "Abrupt terminal punctuation",
      detail: "A short reply ending in a period may feel more final, but this is weak without a personal baseline.",
      weight: "weak",
    });
  }

  if (messages.length < 4) {
    missingContext.push("More preceding messages would make the interpretation less fragile.");
  }
  missingContext.push("No personal texting baseline is available.");
  missingContext.push("Timing, read receipts, reactions, and real-world context are unknown.");

  let upset = 28;
  let actuallyFine = 31;
  let wantsNotice = 21;
  let unknowable = 20;

  for (const item of evidence) {
    const boost = item.weight === "strong" ? 12 : item.weight === "moderate" ? 8 : 3;
    if (item.title.includes("question") || item.title.includes("deflection") || item.title.includes("collapsed")) {
      upset += boost;
      wantsNotice += Math.round(boost * 0.55);
      actuallyFine -= Math.round(boost * 0.6);
    }
    if (item.title.includes("punctuation")) {
      upset += 2;
      unknowable += 3;
    }
  }

  if (messages.length < 3) unknowable += 20;

  const likelihoods = normalize([
    clamp(upset, 5, 80),
    clamp(actuallyFine, 5, 80),
    clamp(wantsNotice, 5, 80),
    clamp(unknowable, 5, 80),
  ]);

  const strongest = evidence.filter((e) => e.weight !== "weak");
  const weakOnly = evidence.filter((e) => e.weight === "weak");

  const hypotheses: Hypothesis[] = [
    {
      label: "mildly upset / withdrawing",
      likelihood: likelihoods[0],
      note: "The conversation contains a few behavioral changes consistent with withdrawal, but they are not proof of emotion.",
      for: strongest.slice(0, 3),
      against: [
        {
          title: "Short replies can be ordinary",
          detail: "Busy, tired, distracted, or low-energy texting can look identical.",
          weight: "strong",
        },
      ],
    },
    {
      label: "genuinely fine",
      likelihood: likelihoods[1],
      note: "The literal meaning is still possible and should not be discarded just because the reply feels abrupt.",
      for: [
        {
          title: "No explicit negative statement",
          detail: "Nothing in the text directly says the sender is angry or hurt.",
          weight: "strong",
        },
      ],
      against: strongest.slice(0, 2),
    },
    {
      label: "wants you to notice something",
      likelihood: likelihoods[2],
      note: "A deflective answer can sometimes signal that the person does not want to explain immediately.",
      for: evidence.filter((e) => e.title.includes("deflection") || e.title.includes("question")),
      against: [
        {
          title: "Intent is not observable",
          detail: "The same wording can happen without any expectation that you should pursue the topic.",
          weight: "strong",
        },
      ],
    },
    {
      label: "unknowable from this chat",
      likelihood: likelihoods[3],
      note: "Some uncertainty should remain visible instead of being forced into a confident story.",
      for: [
        ...weakOnly,
        {
          title: "Missing baseline",
          detail: "We do not know how this person usually writes when relaxed, busy, or annoyed.",
          weight: "strong",
        },
      ],
      against: strongest.slice(0, 1),
    },
  ];

  const signalCount = strongest.length;
  const confidence: ChatopsyReport["confidence"] =
    signalCount >= 3 && messages.length >= 5 ? "HIGH" : signalCount >= 1 ? "MEDIUM" : "LOW";

  const finding =
    evidence.length === 0
      ? "There is not enough behavioral change here to call anything unusual."
      : "The last message matters less than the shift that happened around it.";

  return {
    caseId: Math.random().toString(36).slice(2, 8).toUpperCase(),
    headline: evidence.length ? "something changed." : "nothing conclusive.",
    finding,
    explanation:
      evidence.length
        ? "Chatopsy found a few conversational signals worth noticing, but none of them reveal a private mental state."
        : "The safest reading is still the literal one until more context appears.",
    confidence,
    hypotheses,
    evidence,
    missingContext,
    caution:
      "Don’t diagnose their mood, don’t spam apologies, and don’t treat a probability bar like mind-reading.",
    suggestedReply:
      evidence.length
        ? "you seem a little off, but i don’t wanna push. i’m here if something happened."
        : "gotcha — if anything’s up, i’m around.",
  };
}
