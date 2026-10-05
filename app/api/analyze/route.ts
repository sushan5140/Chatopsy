import { NextResponse } from "next/server";
import { analyzeConversation } from "@/lib/chatopsy";
import { analyzeConversationWithModel, isModelAnalysisConfigured } from "@/lib/model-analyzer";
import { buildHybridReport } from "@/lib/comparison";

export const runtime = "nodejs";

type AnalysisMode = "baseline" | "model" | "hybrid";

function readMode(value: unknown): AnalysisMode {
  return value === "model" || value === "hybrid" ? value : "baseline";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversation = typeof body?.conversation === "string" ? body.conversation.trim() : "";
    const mode = readMode(body?.mode);

    if (!conversation) {
      return NextResponse.json({ error: "Drop some evidence first." }, { status: 400 });
    }

    if (conversation.length > 12_000) {
      return NextResponse.json(
        { error: "That crime scene is too large. Keep it under 12,000 characters." },
        { status: 413 }
      );
    }

    const baseline = analyzeConversation(conversation);

    if (mode === "baseline") {
      return NextResponse.json({ ...baseline, analysisMode: "baseline" });
    }

    if (!isModelAnalysisConfigured()) {
      return NextResponse.json({
        ...baseline,
        analysisMode: "baseline-fallback",
        modelError: "Model analysis is not configured.",
      });
    }

    try {
      const model = await analyzeConversationWithModel(conversation, baseline);

      if (mode === "model") {
        return NextResponse.json({ ...model, analysisMode: "model" });
      }

      const hybrid = buildHybridReport(baseline, model);
      return NextResponse.json({ ...hybrid, analysisMode: "hybrid" });
    } catch (error) {
      return NextResponse.json({
        ...baseline,
        analysisMode: "baseline-fallback",
        modelError: error instanceof Error ? error.message : "Model analysis failed.",
      });
    }
  } catch {
    return NextResponse.json(
      { error: "The evidence bag tore open. Try that again." },
      { status: 500 }
    );
  }
}
