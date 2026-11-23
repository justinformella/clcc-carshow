import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import type { Admin } from "@/types/database";

/**
 * Auth guard for admin-only API routes.
 *
 * Usage at the top of a route handler:
 *   const auth = await requireAdmin(request);
 *   if (auth instanceof NextResponse) return auth;
 *
 * Accepts either:
 *  - a signed-in Supabase user (session cookies, sent automatically by
 *    same-origin fetch from /admin pages) whose email is in the `admins` table, or
 *  - a trusted server-to-server call carrying the `x-clcc-internal` header
 *    (see internalAuthHeader()).
 *
 * Returns 401 when not signed in, 403 when signed in but not an admin.
 */

export const INTERNAL_AUTH_HEADER = "x-clcc-internal";

export type AdminAuth = {
  email: string;
  role: Admin["role"] | "internal";
};

function internalToken(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return crypto.createHmac("sha256", key).update("clcc-internal-v1").digest("hex");
}

/** Headers to attach to trusted server-to-server calls to admin API routes. */
export function internalAuthHeader(): Record<string, string> {
  const token = internalToken();
  return token ? { [INTERNAL_AUTH_HEADER]: token } : {};
}

function isValidInternalCall(request: Request): boolean {
  const provided = request.headers.get(INTERNAL_AUTH_HEADER);
  if (!provided) return false;
  const expected = internalToken();
  if (!expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readCookies(request: Request): { name: string; value: string }[] {
  // NextRequest exposes parsed cookies; fall back to parsing the header.
  const maybeNext = request as Request & {
    cookies?: { getAll(): { name: string; value: string }[] };
  };
  if (maybeNext.cookies && typeof maybeNext.cookies.getAll === "function") {
    return maybeNext.cookies.getAll();
  }
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf("=");
      const name = idx === -1 ? part : part.slice(0, idx);
      const raw = idx === -1 ? "" : part.slice(idx + 1);
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        // keep raw value
      }
      return { name, value };
    });
}

export async function requireAdmin(request: Request): Promise<AdminAuth | NextResponse> {
  try {
    if (isValidInternalCall(request)) {
      return { email: "internal", role: "internal" };
    }

    const cookies = readCookies(request);
    const authClient = createSsrClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookies;
          },
          setAll() {
            // Route handlers here don't refresh session cookies.
          },
        },
      }
    );

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: admin, error } = await supabase
      .from("admins")
      .select("email, role")
      .ilike("email", user.email)
      .maybeSingle();

    // ilike treats % and _ as wildcards, so also require an exact
    // case-insensitive match before trusting the row.
    if (error || !admin || String(admin.email).toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return { email: user.email, role: admin.role as Admin["role"] };
  } catch (err) {
    console.error("[requireAdmin] auth check failed:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
