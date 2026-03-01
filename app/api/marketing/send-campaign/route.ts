import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import { getMarketingEmailHtml } from "@/lib/marketing-email-templates";
import { MARKETING_TEMPLATES } from "@/types/database";
import type { MarketingTemplateKey } from "@/types/database";
import crypto from "crypto";

const FROM_EMAIL = "Crystal Lake Cars & Caffeine <noreply@crystallakecarshow.com>";
const REPLY_TO = "info@crystallakecarshow.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";
const HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || "clcc-unsub-default-key";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeUnsubscribeUrl(email: string): string {
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(email).digest("hex");
  return `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&sig=${sig}`;
}

async function sendWithRetry(
  params: { from: string; to: string; subject: string; html: string },
  retries = 3
): Promise<{ id?: string }> {
  const resend = getResend();
  const sendParams = { reply_to: REPLY_TO, ...params };
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await resend.emails.send(sendParams);
    if (!error) return { id: data?.id ?? undefined };
    if (error.message.toLowerCase().includes("rate") && attempt < retries - 1) {
      await wait((attempt + 1) * 1500);
      continue;
    }
    throw new Error(error.message);
  }
  throw new Error("Max retries exceeded");
}

export async function POST(request: Request) {
  const supabase = createServerClient();

  const { templateKey, prospectIds } = await request.json();

  // Validate template
  const template = MARKETING_TEMPLATES.find((t) => t.key === templateKey);
  if (!template) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    return NextResponse.json({ error: "No prospects selected" }, { status: 400 });
  }

  // Fetch prospects
  const { data: prospects } = await supabase
    .from("marketing_prospects")
    .select("*")
    .in("id", prospectIds)
    .eq("unsubscribed", false);

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ error: "No eligible prospects found" }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;

  for (const prospect of prospects) {
    try {
      const unsubUrl = makeUnsubscribeUrl(prospect.email);
      const html = getMarketingEmailHtml(templateKey as MarketingTemplateKey, unsubUrl);

      const result = await sendWithRetry({
        from: FROM_EMAIL,
        to: prospect.email,
        subject: template.subject,
        html,
      });

      // Log to marketing_sends
      await supabase.from("marketing_sends").insert({
        prospect_id: prospect.id,
        template_key: templateKey,
        subject: template.subject,
        status: "sent",
        resend_id: result.id || null,
      });

      // Also log to email_log for unified tracking
      await supabase.from("email_log").insert({
        registration_id: null,
        email_type: "marketing",
        recipient_email: prospect.email,
        subject: template.subject,
        resend_id: result.id || null,
      });

      sent++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[send-campaign] Failed for ${prospect.email}:`, errorMessage);

      await supabase.from("marketing_sends").insert({
        prospect_id: prospect.id,
        template_key: templateKey,
        subject: template.subject,
        status: "failed",
        error_message: errorMessage,
      });

      failed++;
    }

    // Rate limit: 200ms between sends
    await wait(200);
  }

  return NextResponse.json({ sent, failed });
}
