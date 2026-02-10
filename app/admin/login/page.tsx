"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const oauthError = searchParams.get("error");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    });
    if (oauthErr) {
      setError("Failed to start Google sign-in. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    // Track last login time — use ilike for case-insensitive match
    const userEmail = authData.user?.email ?? email;
    await supabase
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .ilike("email", userEmail);

    const redirect = searchParams.get("redirect") || "/admin";
    // Hard navigate so the browser sends the updated auth cookie to middleware
    window.location.href = redirect;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--charcoal)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--white)",
          padding: "3rem",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 400,
            color: "var(--charcoal)",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Admin Login
        </h1>
        <p
          style={{
            color: "var(--text-light)",
            fontSize: "0.9rem",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Crystal Lake Cars &amp; Caffeine
        </p>

        {(error || oauthError === "not_admin") && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #c00",
              color: "#c00",
              padding: "0.8rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            {oauthError === "not_admin"
              ? "Your Google account is not authorized. Ask an admin to invite you first."
              : error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "1.5rem 0",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#ddd" }} />
          <span style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#ddd" }} />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          type="button"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            padding: "0.75rem 1rem",
            background: "#fff",
            border: "1px solid #ddd",
            cursor: googleLoading ? "not-allowed" : "pointer",
            fontSize: "0.95rem",
            color: "var(--charcoal)",
            opacity: googleLoading ? 0.7 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? "Redirecting..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
