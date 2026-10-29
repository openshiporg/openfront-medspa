import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { keystoneContext } from "@/features/keystone/context";
import { processRefundOutbox } from "@/features/keystone/refundOutbox";

/**
 * Scheduler hook: drains due refund attempts (re-querying unknown outcomes first).
 * Closed unless REFUND_OUTBOX_TOKEN is configured; authenticated by bearer token.
 */
export async function POST(request: Request) {
  const expected = process.env.REFUND_OUTBOX_TOKEN || "";
  const presented = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  const a = Buffer.from(expected), b = Buffer.from(presented);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const summary = await processRefundOutbox(keystoneContext, { limit: 25 });
  return NextResponse.json({ claimed: summary.claimed });
}
