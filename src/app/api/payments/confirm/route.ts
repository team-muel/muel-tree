import { NextRequest, NextResponse } from "next/server";
import { logServiceEvent } from "@/lib/service-events";
import { isAllowedOrigin, forbiddenOrigin } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return forbiddenOrigin();
  }
  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = body;
  if (
    typeof paymentKey !== "string" ||
    typeof orderId !== "string" ||
    typeof amount !== "number"
  ) {
    return NextResponse.json(
      { error: "paymentKey, orderId, amount are required" },
      { status: 400 },
    );
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "payment not configured" },
      { status: 503 },
    );
  }

  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  const tossRes = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    },
  );

  const tossData = await tossRes.json();

  if (!tossRes.ok) {
    await logServiceEvent({
      serviceSlug: "muel",
      eventType: "failed",
      route: "/api/payments/confirm",
      status: "error",
      metadata: {
        reason: "toss_confirm_failed",
        orderId,
        tossCode: tossData.code,
        tossMessage: tossData.message,
      },
    });

    return NextResponse.json(
      {
        error: tossData.message ?? "결제 승인에 실패했습니다.",
        code: tossData.code,
      },
      { status: tossRes.status },
    );
  }

  await logServiceEvent({
    serviceSlug: "muel",
    eventType: "submitted",
    route: "/api/payments/confirm",
    subjectId: tossData.paymentKey,
    metadata: {
      orderId: tossData.orderId,
      totalAmount: tossData.totalAmount,
      method: tossData.method,
      status: tossData.status,
    },
  });

  return NextResponse.json({
    ok: true,
    orderId: tossData.orderId,
    totalAmount: tossData.totalAmount,
    method: tossData.method,
    status: tossData.status,
  });
}
