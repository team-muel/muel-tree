import { NextRequest, NextResponse } from "next/server";
import { getGeminiApiKey, requireGeminiCaller } from "@/lib/gemini-ops";
import { getServerSupabase } from "@/lib/server-supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const caller = await requireGeminiCaller(req);
  if (!caller.ok) return caller.response;

  const operationName = req.nextUrl.searchParams.get("name");
  if (!operationName) {
    // Listing every operation is admin-only (internal static token). Ordinary
    // signed-in Discord users must not see other users' prompts/results.
    if (caller.discordUser) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { data, error } = await getServerSupabase()
      .from("gemini_operations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, operations: data ?? [] });
  }

  // Block path traversal / SSRF before interpolating the name into the Gemini URL.
  if (operationName.includes("..") || !/^[A-Za-z0-9_./-]+$/.test(operationName)) {
    return NextResponse.json({ error: "invalid operation name" }, { status: 400 });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}`, {
    headers: {
      "x-goog-api-key": getGeminiApiKey(),
    },
    cache: "no-store",
  });
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    return NextResponse.json({ error: data }, { status: response.status });
  }

  const done = data.done === true;
  const status = done ? (data.error ? "failed" : "completed") : "running";
  await getServerSupabase()
    .from("gemini_operations")
    .update({
      status,
      response: data,
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("operation_name", operationName);

  return NextResponse.json({ ok: true, operationName, status, gemini: data });
}
