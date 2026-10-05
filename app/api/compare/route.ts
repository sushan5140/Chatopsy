import { NextResponse } from "next/server";
import { analyzeConversation } from "@/lib/chatopsy";
import { analyzeConversationWithModel, isModelAnalysisConfigured } from "@/lib/model-analyzer";
import { compareReports } from "@/lib/comparison";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversation = typeof body?.conversation === "string" ? body.conversation.trim() : "";

    if (!conversation) {
      return NextResponse.json({ error: "Drop some evidence first." }, { status: 400 });
    }

    if (conversation.length > 12_000) {
      return NextResponse.json({ error: "Keep comparison cases under 12,000 characters." }, { status: 413 });
    }

    if (!isModelAnalysisConfigured()) {
      return NextResponse.json(
        {
          error: "Model comparison is not configured.",
          required: ["AI_GATEWAY_API_KEY", "CHATOPSY_MODEL"],
        },
        { status: 503 }
      );
    }

    const deterministic = analyzeConversation(conversation);
    const model = await analyzeConversationWithModel(conversation, deterministic);
    return NextResponse.json(compareReports(deterministic, model));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Comparison failed." },
      { status: 500 }
    );
  }
}
