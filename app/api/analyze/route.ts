import { NextResponse } from "next/server";
import { analyzeConversation } from "@/lib/chatopsy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversation = typeof body?.conversation === "string" ? body.conversation.trim() : "";

    if (!conversation) {
      return NextResponse.json({ error: "Drop some evidence first." }, { status: 400 });
    }

    if (conversation.length > 12_000) {
      return NextResponse.json(
        { error: "That crime scene is too large for V0. Keep it under 12,000 characters." },
        { status: 413 }
      );
    }

    return NextResponse.json(analyzeConversation(conversation));
  } catch {
    return NextResponse.json(
      { error: "The evidence bag tore open. Try that again." },
      { status: 500 }
    );
  }
}
