import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Verify user is in the admins table
  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .ilike("email", user.email)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/admin/login?error=not_admin", request.url)
    );
  }

  // Update last login time
  await supabase
    .from("admins")
    .update({ last_login_at: new Date().toISOString() })
    .ilike("email", user.email);

  return response;
}
