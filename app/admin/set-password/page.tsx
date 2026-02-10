"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Suspense } from "react";

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function establish() {
      // PKCE flow: Supabase redirects with ?code=... query param
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setVerifyError("This invite link has expired or already been used. Please ask an admin to resend your invite.");
          return;
        }
        setReady(true);
        return;
      }

      // Implicit flow fallback: tokens in hash fragment
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event) => {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            setReady(true);
          }
        }
      );

      // Already signed in (e.g. page refresh)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      } else {
        // No code, no hash, no session — bad link
        const hash = window.location.hash;
        if (!hash || !hash.includes("access_token")) {
          setVerifyError("This invite link is invalid or has expired. Please ask an admin to resend your invite.");
        }
      }

      return () => subscription.unsubscribe();
    }

    establish();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Track last login
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase
        .from("admins")
        .update({ last_login_at: new Date().toISOString() })
        .ilike("email", user.email);
    }

    window.location.href = "/admin";
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
          Set Your Password
        </h1>
        <p
          style={{
            color: "var(--text-light)",
            fontSize: "0.9rem",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Welcome to Crystal Lake Cars &amp; Coffee Admin
        </p>

        {verifyError ? (
          <div
            style={{
              background: "#fee",
              border: "1px solid #c00",
              color: "#c00",
              padding: "0.8rem",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            {verifyError}
          </div>
        ) : !ready ? (
          <p style={{ color: "var(--text-light)", textAlign: "center" }}>
            Verifying your invite...
          </p>
        ) : (
          <>
            {error && (
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
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm">Confirm Password</label>
                <input
                  type="password"
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? "Saving..." : "Set Password & Continue"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
