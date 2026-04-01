"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import { AWARD_CATEGORIES } from "@/types/database";

type Recommendation = {
  category: string;
  car_number: number;
  justification: string;
  registration_id?: string;
  vehicle: string;
  color: string | null;
  owner: string;
};

type Tab = "recommendations" | "assigned";

export default function AwardsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("recommendations");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [regRes, recRes] = await Promise.all([
        supabase
          .from("registrations")
          .select("*")
          .in("payment_status", ["paid", "comped"])
          .order("car_number", { ascending: true }),
        supabase
          .from("award_recommendations")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);
      setRegistrations(regRes.data || []);
      if (recRes.data && recRes.data.length > 0) {
        setRecommendations(recRes.data as Recommendation[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/awards/recommend", { method: "POST" });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error("Failed to generate:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAssignAward = async (registrationId: string, category: string) => {
    setAssigning(category);
    const supabase = createClient();
    // Clear any existing vehicle with this award
    const existing = registrations.find((r) => r.award_category === category);
    if (existing) {
      await supabase.from("registrations").update({ award_category: null }).eq("id", existing.id);
    }
    // Assign the award
    await supabase.from("registrations").update({ award_category: category }).eq("id", registrationId);
    // Refresh
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .in("payment_status", ["paid", "comped"])
      .order("car_number", { ascending: true });
    setRegistrations(data || []);
    setAssigning(null);
  };

  const handleRemoveAward = async (registrationId: string) => {
    const supabase = createClient();
    await supabase.from("registrations").update({ award_category: null }).eq("id", registrationId);
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .in("payment_status", ["paid", "comped"])
      .order("car_number", { ascending: true });
    setRegistrations(data || []);
  };

  const awarded = registrations.filter((r) => r.award_category);
  const tabs: { key: Tab; label: string }[] = [
    { key: "recommendations", label: "AI Recommendations" },
    { key: "assigned", label: `Assigned (${awarded.length})` },
  ];

  if (loading) {
    return <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>Loading...</p>;
  }

  return (
    <>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, marginBottom: "1.5rem" }}>
        Awards
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "2px solid rgba(0,0,0,0.08)", marginBottom: "1.5rem" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.6rem 1.5rem", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
              background: "transparent", border: "none",
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              marginBottom: "-2px",
              color: tab === t.key ? "var(--charcoal)" : "var(--text-light)",
              cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* AI Recommendations Tab */}
      {tab === "recommendations" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
              AI analyzes all registered vehicles and their specs to recommend winners for each category.
            </p>
            <button
              onClick={handleGenerateRecommendations}
              disabled={generating}
              style={{
                padding: "0.6rem 1.5rem",
                background: generating ? "#ccc" : "linear-gradient(135deg, #7c3aed, #6366f1)",
                color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2C10 5.31 12.69 8 16 8C12.69 8 10 10.69 10 14C10 10.69 7.31 8 4 8C7.31 8 10 5.31 10 2Z"/><path d="M18 12C18 14.21 19.79 16 22 16C19.79 16 18 17.79 18 20C18 17.79 16.21 16 14 16C16.21 16 18 14.21 18 12Z"/></svg>
              {generating ? "Analyzing..." : recommendations.length > 0 ? "Regenerate" : "Generate Recommendations"}
            </button>
          </div>

          {recommendations.length === 0 && !generating && (
            <div style={{ background: "var(--cream)", padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>
              <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No recommendations yet</p>
              <p style={{ fontSize: "0.85rem" }}>Click "Generate Recommendations" to let AI analyze your vehicles</p>
            </div>
          )}

          {recommendations.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {recommendations.map((rec) => {
                const isAssigned = registrations.find((r) => r.award_category === rec.category);
                return (
                  <div
                    key={rec.category}
                    style={{
                      background: isAssigned?.id === rec.registration_id ? "#f8fdf8" : "var(--white)",
                      border: `1px solid ${isAssigned?.id === rec.registration_id ? "#c8e6c9" : "rgba(0,0,0,0.08)"}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                          background: isAssigned?.id === rec.registration_id ? "linear-gradient(135deg, #2e7d32, #4caf50)" : "linear-gradient(135deg, #c9a84c, #e8c860)",
                          fontSize: "1.1rem", marginTop: "0.15rem",
                        }}>
                          🏆
                        </div>
                        <div>
                        <p style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", marginBottom: "0.3rem" }}>
                          {rec.category}
                        </p>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem" }}>
                          <span style={{ color: "var(--gold)" }}>#{rec.car_number}</span>{" "}
                          {rec.vehicle}
                          {rec.color ? ` — ${rec.color}` : ""}
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{rec.owner}</p>
                      </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, marginLeft: "1rem" }}>
                        {isAssigned?.id === rec.registration_id ? (
                          <span style={{ padding: "0.35rem 0.8rem", fontSize: "0.7rem", fontWeight: 600, background: "#e8f5e9", color: "#2e7d32", textTransform: "uppercase" }}>
                            Assigned
                          </span>
                        ) : (
                          <button
                            onClick={() => rec.registration_id && handleAssignAward(rec.registration_id, rec.category)}
                            disabled={assigning === rec.category}
                            style={{
                              padding: "0.35rem 0.8rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                              background: "var(--gold)", color: "var(--charcoal)", border: "none",
                              cursor: assigning === rec.category ? "not-allowed" : "pointer",
                              opacity: assigning === rec.category ? 0.5 : 1,
                            }}
                          >
                            {assigning === rec.category ? "..." : "Assign"}
                          </button>
                        )}
                        <button
                          onClick={() => rec.registration_id && router.push(`/admin/registrations/${rec.registration_id}`)}
                          style={{
                            padding: "0.35rem 0.8rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                            background: "var(--white)", color: "var(--charcoal)", border: "1px solid #ddd", cursor: "pointer",
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-light)", fontStyle: "italic", margin: 0 }}>
                      {rec.justification}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Assigned Awards Tab */}
      {tab === "assigned" && (
        <>
          {awarded.length === 0 ? (
            <div style={{ background: "var(--cream)", padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>
              <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No awards assigned yet</p>
              <p style={{ fontSize: "0.85rem" }}>Use the AI Recommendations tab to assign awards, or assign them from individual registration pages</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {AWARD_CATEGORIES.map((category) => {
                const winner = registrations.find((r) => r.award_category === category);
                return (
                  <div
                    key={category}
                    style={{
                      background: winner ? "var(--white)" : "var(--cream)",
                      border: `1px solid ${winner ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)"}`,
                      boxShadow: winner ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      padding: "1rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                      opacity: winner ? 1 : 0.6,
                    }}
                  >
                    <div style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: "40px", height: "40px", borderRadius: "50%",
                      background: winner ? "linear-gradient(135deg, #c9a84c, #e8c860)" : "rgba(0,0,0,0.06)",
                      color: winner ? "#fff" : "var(--text-light)", fontSize: "1rem", flexShrink: 0,
                    }}>
                      {winner ? "🏆" : "—"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: winner ? "var(--gold)" : "var(--text-light)", marginBottom: "0.2rem" }}>
                        {category}
                      </p>
                      {winner ? (
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem" }}>
                          <span style={{ color: "var(--gold)" }}>#{winner.car_number}</span>{" "}
                          {winner.vehicle_year} {winner.vehicle_make} {winner.vehicle_model}
                          {winner.vehicle_color ? ` — ${winner.vehicle_color}` : ""}
                          <span style={{ fontSize: "0.85rem", color: "var(--text-light)", marginLeft: "0.75rem" }}>
                            {winner.first_name} {winner.last_name}
                          </span>
                        </p>
                      ) : (
                        <p style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>Not yet assigned</p>
                      )}
                    </div>

                    {winner && (
                      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        <button
                          onClick={() => router.push(`/admin/registrations/${winner.id}`)}
                          style={{
                            padding: "0.35rem 0.8rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                            background: "var(--white)", color: "var(--charcoal)", border: "1px solid #ddd", cursor: "pointer",
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRemoveAward(winner.id)}
                          style={{
                            padding: "0.35rem 0.8rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                            background: "var(--white)", color: "#c62828", border: "1px solid #ddd", cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
