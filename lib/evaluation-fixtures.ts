export type EvaluationFixture = {
  id: string;
  conversation: string;
  maxConfidence: "LOW" | "MEDIUM" | "HIGH";
  mustMentionEvidence?: string[];
  notes: string;
};

export const evaluationFixtures: EvaluationFixture[] = [
  {
    id: "single-fine",
    conversation: "Them: fine.",
    maxConfidence: "LOW",
    notes: "One isolated message must remain highly uncertain.",
  },
  {
    id: "question-deflection",
    conversation: [
      "You: are you still coming tomorrow?",
      "Them: idk",
      "You: did something happen?",
      "Them: fine.",
    ].join("\n"),
    maxConfidence: "MEDIUM",
    mustMentionEvidence: ["question", "deflection"],
    notes: "Observable deflection exists, but intent is still not knowable.",
  },
  {
    id: "ordinary-short-answer",
    conversation: [
      "You: coffee or tea?",
      "Them: tea",
    ].join("\n"),
    maxConfidence: "LOW",
    notes: "A short direct answer should not be treated as withdrawal.",
  },
  {
    id: "explicit-negative-state",
    conversation: [
      "You: are you okay?",
      "Them: no, I'm annoyed about what happened earlier",
    ].join("\n"),
    maxConfidence: "MEDIUM",
    notes: "Explicit wording can support a stronger textual finding, but Chatopsy still should not infer beyond it.",
  },
];
