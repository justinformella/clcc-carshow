"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase appends tokens as hash fragments after invite redirect.
    // The Supabase client picks them up automatically via onAuthStateChange.
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setReady(true);
        }
      }
    );

    // Also check if already signed in (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

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

        {!ready ? (
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
