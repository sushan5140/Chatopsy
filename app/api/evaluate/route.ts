import { NextResponse } from "next/server";
import { analyzeConversation } from "@/lib/chatopsy";
import { evaluateReport } from "@/lib/evaluation";
import { evaluationFixtures } from "@/lib/evaluation-fixtures";

export const runtime = "nodejs";

export async function GET() {
  const results = evaluationFixtures.map((fixture) =>
    evaluateReport(analyzeConversation(fixture.conversation), fixture)
  );

  return NextResponse.json({
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    results,
    note: "These fixtures validate uncertainty behavior and observable evidence, not hidden human emotions.",
  });
}
