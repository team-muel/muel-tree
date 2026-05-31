import { NextRequest, NextResponse } from "next/server";
import { getActivityDiscordCredentials } from "@/config/activity-server";
import { forbiddenOrigin, isAllowedOrigin } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }

  const body = (await req.json()) as { code?: string; activitySlug?: string };
  const { code, activitySlug } = body;
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }
  if (!activitySlug) {
    return NextResponse.json(
      { error: "missing activitySlug" },
      { status: 400 },
    );
  }

  const creds = getActivityDiscordCredentials(activitySlug);
  if (!creds) {
    return NextResponse.json(
      { error: `unknown activity "${activitySlug}"` },
      { status: 400 },
    );
  }
  if (!creds.clientId || !creds.clientSecret) {
    return NextResponse.json(
      { error: `Discord credentials not configured for "${activitySlug}"` },
      { status: 500 },
    );
  }

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data }, { status: response.status });
  }

  return NextResponse.json({ access_token: data.access_token });
}
