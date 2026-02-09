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
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect") || "/admin";
    router.push(redirect);
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
