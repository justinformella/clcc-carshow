import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import crypto from "crypto";

const HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || "clcc-unsub-default-key";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const sig = searchParams.get("sig");

  if (!email || !sig) {
    return new NextResponse(unsubPage("Invalid unsubscribe link.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Verify HMAC signature
  const expected = crypto.createHmac("sha256", HMAC_SECRET).update(email).digest("hex");
  if (sig !== expected) {
    return new NextResponse(unsubPage("Invalid unsubscribe link.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Mark as unsubscribed
  const supabase = createServerClient();
  const { error } = await supabase
    .from("marketing_prospects")
    .update({ unsubscribed: true })
    .eq("email", email.toLowerCase());

  if (error) {
    console.error("[unsubscribe] Error:", error);
    return new NextResponse(unsubPage("Something went wrong. Please try again later.", false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new NextResponse(
    unsubPage("You have been successfully unsubscribed and will no longer receive marketing emails from Crystal Lake Cars & Caffeine.", true),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function unsubPage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${success ? "Unsubscribed" : "Error"} — Crystal Lake Cars & Caffeine</title>
</head>
<body style="margin:0; padding:0; background:#f8f5f0; font-family:Arial,Helvetica,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh;">
  <div style="max-width:480px; margin:2rem; text-align:center;">
    <h1 style="font-size:22px; font-weight:700; color:#c9a84c; letter-spacing:0.06em; margin:0 0 1rem;">
      CRYSTAL LAKE CARS &amp; CAFFEINE
    </h1>
    <div style="background:#fff; padding:2rem; border-radius:8px; box-shadow:0 1px 6px rgba(0,0,0,0.1);">
      <p style="font-size:${success ? "18px" : "16px"}; color:${success ? "#2e7d32" : "#c62828"}; font-weight:600; margin:0 0 0.75rem;">
        ${success ? "Unsubscribed" : "Error"}
      </p>
      <p style="font-size:14px; color:#555; line-height:1.6; margin:0;">
        ${message}
      </p>
    </div>
  </div>
</body>
</html>`;
}
