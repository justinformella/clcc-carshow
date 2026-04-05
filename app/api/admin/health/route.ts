import { NextResponse } from "next/server";

type ServiceStatus = {
  name: string;
  status: "ok" | "error" | "missing";
  latencyMs?: number;
  error?: string;
};

export async function GET() {
  const results: ServiceStatus[] = await Promise.all([
    checkGemini(),
    checkOpenAI(),
    checkSupabase(),
    checkStripe(),
    checkModal(),
  ]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: results,
  });
}

async function checkGemini(): Promise<ServiceStatus> {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return { name: "Gemini (Imagen)", status: "missing", error: "GOOGLE_GEMINI_API_KEY not set" };

  const start = Date.now();
  try {
    // Use a lightweight models.list call to verify the key works
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const latencyMs = Date.now() - start;
    if (res.ok) return { name: "Gemini (Imagen)", status: "ok", latencyMs };
    const body = await res.json().catch(() => ({}));
    return { name: "Gemini (Imagen)", status: "error", latencyMs, error: body?.error?.message || `HTTP ${res.status}` };
  } catch (err) {
    return { name: "Gemini (Imagen)", status: "error", latencyMs: Date.now() - start, error: String(err) };
  }
}

async function checkOpenAI(): Promise<ServiceStatus> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { name: "OpenAI", status: "missing", error: "OPENAI_API_KEY not set" };

  const start = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) return { name: "OpenAI", status: "ok", latencyMs };
    const body = await res.json().catch(() => ({}));
    return { name: "OpenAI", status: "error", latencyMs, error: body?.error?.message || `HTTP ${res.status}` };
  } catch (err) {
    return { name: "OpenAI", status: "error", latencyMs: Date.now() - start, error: String(err) };
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { name: "Supabase", status: "missing", error: "Supabase env vars not set" };

  const start = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) return { name: "Supabase", status: "ok", latencyMs };
    return { name: "Supabase", status: "error", latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return { name: "Supabase", status: "error", latencyMs: Date.now() - start, error: String(err) };
  }
}

async function checkModal(): Promise<ServiceStatus> {
  const url = process.env.MODAL_REMBG_URL;
  if (!url) return { name: "Modal (rembg)", status: "missing", error: "MODAL_REMBG_URL not set" };

  const start = Date.now();
  try {
    // Send a tiny 1x1 transparent PNG to test the endpoint is alive
    const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: tinyPng }),
      signal: AbortSignal.timeout(30000),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) return { name: "Modal (rembg)", status: "ok", latencyMs };
    return { name: "Modal (rembg)", status: "error", latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    return { name: "Modal (rembg)", status: "error", latencyMs: Date.now() - start, error: String(err) };
  }
}

async function checkStripe(): Promise<ServiceStatus> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { name: "Stripe", status: "missing", error: "STRIPE_SECRET_KEY not set" };

  const start = Date.now();
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (res.ok) return { name: "Stripe", status: "ok", latencyMs };
    const body = await res.json().catch(() => ({}));
    return { name: "Stripe", status: "error", latencyMs, error: body?.error?.message || `HTTP ${res.status}` };
  } catch (err) {
    return { name: "Stripe", status: "error", latencyMs: Date.now() - start, error: String(err) };
  }
}
