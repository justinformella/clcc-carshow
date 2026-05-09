import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResend } from "@/lib/resend";
import { freeCarOfferEmail } from "@/lib/email-templates";
import crypto from "crypto";

const FROM_EMAIL = "Crystal Lake Cars & Caffeine <noreply@crystallakecarshow.com>";
const REPLY_TO = "info@crystallakecarshow.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crystallakecarshow.com";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export async function POST() {
  const supabase = createServerClient();

  const { data: regs } = await supabase
    .from("registrations")
    .select("id, first_name, email")
    .in("payment_status", ["paid"])
    .order("created_at", { ascending: true });

  if (!regs || regs.length === 0) {
    return NextResponse.json({ error: "No paid registrations found" }, { status: 400 });
  }

  const seen = new Set<string>();
  const unique: typeof regs = [];
  for (const r of regs) {
    const key = r.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  const { data: existingCodes } = await supabase
    .from("promo_codes")
    .select("email");

  const existingEmails = new Set((existingCodes || []).map((c: { email: string }) => c.email.toLowerCase()));

  const toSend = unique.filter((r) => !existingEmails.has(r.email.toLowerCase()));

  if (toSend.length === 0) {
    return NextResponse.json({ sent: 0, skipped: unique.length, message: "All registrants already have promo codes" });
  }

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const reg of toSend) {
    try {
      const code = generateCode();

      await supabase.from("promo_codes").insert({
        code,
        registration_id: reg.id,
        email: reg.email,
      });

      const registerUrl = `${SITE_URL}/register?promo=${code}`;
      const { subject, html } = freeCarOfferEmail(reg.first_name, code, registerUrl);

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: reg.email,
        subject,
        html,
      });

      if (error) throw new Error(error.message);

      await supabase
        .from("promo_codes")
        .update({ sent_at: new Date().toISOString() })
        .eq("code", code);

      await supabase.from("email_log").insert({
        registration_id: reg.id,
        email_type: "free_car_offer",
        recipient_email: reg.email,
        subject,
      });

      sent++;
    } catch (err) {
      console.error(`[free-car-offer] Failed for ${reg.email}:`, err);
      failed++;
    }

    await wait(200);
  }

  return NextResponse.json({ sent, failed, skipped: unique.length - toSend.length });
}
