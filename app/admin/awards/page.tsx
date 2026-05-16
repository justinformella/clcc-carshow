"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration, AwardCategory } from "@/types/database";

type Recommendation = {
  category: string;
  rank: number;
  car_number: number;
  justification: string;
  registration_id: string | null;
  vehicle: string;
  color: string | null;
  owner: string;
};

type Tab = "recommendations" | "assigned";

const categoryAnchorId = (name: string) =>
  "cat-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AwardsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("recommendations");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [regRes, recRes, catRes] = await Promise.all([
        supabase
          .from("registrations")
          .select("*")
          .in("payment_status", ["paid", "comped"])
          .order("car_number", { ascending: true }),
        supabase
          .from("award_recommendations")
          .select("*")
          .order("rank", { ascending: true }),
        supabase
          .from("award_categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);
      setRegistrations(regRes.data || []);
      setCategories((catRes.data as AwardCategory[]) || []);
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
    const key = `${category}::${registrationId}`;
    setAssigning(key);
    const supabase = createClient();
    const existing = registrations.find((r) => r.award_category === category);
    if (existing && existing.id !== registrationId) {
      await supabase.from("registrations").update({ award_category: null }).eq("id", existing.id);
    }
    // Also clear any *other* category this same vehicle currently holds, since one car = one award
    const sameCar = registrations.find((r) => r.id === registrationId && r.award_category && r.award_category !== category);
    if (sameCar) {
      await supabase.from("registrations").update({ award_category: null }).eq("id", registrationId);
    }
    await supabase.from("registrations").update({ award_category: category }).eq("id", registrationId);
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

  const recsByCategory = useMemo(() => {
    const map = new Map<string, Recommendation[]>();
    for (const r of recommendations) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.rank - b.rank);
    return map;
  }, [recommendations]);

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
      <style>{`
        .award-jump-link:hover { background: var(--cream); }
        .award-row { transition: background 0.15s; }
        .award-row:hover { background: #fafafa; }
      `}</style>

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
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* AI Recommendations Tab */}
      {tab === "recommendations" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-light)", margin: 0, flex: 1, minWidth: "240px" }}>
              AI ranks the top picks for each category. Pick a winner — assigning one row replaces any other winner in that category.
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
              <p style={{ fontSize: "0.85rem" }}>Click &ldquo;Generate Recommendations&rdquo; to let AI analyze your vehicles</p>
            </div>
          )}

          {recommendations.length > 0 && (
            <>
              {/* Quick-jump bar */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  background: "#f5f5f5",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                  padding: "0.6rem 0",
                  marginBottom: "1rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                }}
              >
                {categories.map((cat) => {
                  const hasAssigned = registrations.some((r) => r.award_category === cat.name);
                  return (
                    <a
                      key={cat.id}
                      href={`#${categoryAnchorId(cat.name)}`}
                      className="award-jump-link"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.3rem 0.7rem",
                        background: "var(--white)",
                        border: "1px solid #ddd",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: "var(--charcoal)",
                        textDecoration: "none",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {hasAssigned && <span style={{ color: "#2e7d32" }}>✓</span>}
                      {cat.name}
                    </a>
                  );
                })}
              </div>

              {/* Per-category sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {categories.map((cat) => {
                  const category = cat.name;
                  const recs = recsByCategory.get(category) ?? [];
                  const winner = registrations.find((r) => r.award_category === category);

                  return (
                    <div
                      key={cat.id}
                      id={categoryAnchorId(category)}
                      style={{
                        background: "var(--white)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        scrollMarginTop: "70px",
                      }}
                    >
                      {/* Category header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem 1.25rem",
                          background: "var(--cream)",
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "1.05rem",
                            fontWeight: 600,
                            margin: 0,
                            color: "var(--charcoal)",
                          }}
                        >
                          {category}
                        </h3>
                        {winner ? (
                          <span
                            style={{
                              padding: "0.25rem 0.7rem",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              background: "#e8f5e9",
                              color: "#2e7d32",
                            }}
                          >
                            🏆 Assigned: #{winner.car_number} {winner.vehicle_year} {winner.vehicle_make} {winner.vehicle_model}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            No winner assigned
                          </span>
                        )}
                      </div>

                      {/* Ranked options */}
                      {recs.length === 0 ? (
                        <p style={{ padding: "1rem 1.25rem", fontSize: "0.85rem", color: "var(--text-light)", margin: 0 }}>
                          No AI suggestions for this category yet.
                        </p>
                      ) : (
                        <div>
                          {recs.map((rec) => {
                            const isAssigned = winner?.id === rec.registration_id;
                            const busyKey = `${rec.category}::${rec.registration_id}`;
                            const isBusy = assigning === busyKey;
                            return (
                              <div
                                key={`${rec.category}-${rec.rank}-${rec.car_number}`}
                                className="award-row"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "auto 1fr auto",
                                  alignItems: "center",
                                  gap: "1rem",
                                  padding: "0.85rem 1.25rem",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                                  background: isAssigned ? "#f8fdf8" : "transparent",
                                }}
                              >
                                {/* Rank badge */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background:
                                      rec.rank === 1
                                        ? "linear-gradient(135deg, #c9a84c, #e8c860)"
                                        : rec.rank === 2
                                        ? "#cfd8dc"
                                        : "#d7ccc8",
                                    color: rec.rank === 1 ? "#fff" : "var(--charcoal)",
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                  title={`Rank ${rec.rank}`}
                                >
                                  {rec.rank}
                                </div>

                                {/* Vehicle info */}
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", margin: 0 }}>
                                    <span style={{ color: "var(--gold)", fontWeight: 600 }}>#{rec.car_number}</span>{" "}
                                    {rec.vehicle}
                                    {rec.color ? <span style={{ color: "var(--text-light)" }}> — {rec.color}</span> : null}
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-light)", marginLeft: "0.6rem" }}>
                                      {rec.owner}
                                    </span>
                                  </p>
                                  <p style={{ fontSize: "0.8rem", color: "var(--text-light)", fontStyle: "italic", margin: "0.2rem 0 0" }}>
                                    {rec.justification}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                                  {isAssigned ? (
                                    <span
                                      style={{
                                        padding: "0.35rem 0.8rem",
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        background: "#e8f5e9",
                                        color: "#2e7d32",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                      }}
                                    >
                                      Assigned
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => rec.registration_id && handleAssignAward(rec.registration_id, rec.category)}
                                      disabled={isBusy || !rec.registration_id}
                                      style={{
                                        padding: "0.35rem 0.8rem",
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                        background: "var(--gold)",
                                        color: "var(--charcoal)",
                                        border: "none",
                                        cursor: isBusy ? "not-allowed" : "pointer",
                                        opacity: isBusy ? 0.5 : 1,
                                      }}
                                    >
                                      {isBusy ? "..." : winner ? "Pick this" : "Assign"}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => rec.registration_id && router.push(`/admin/registrations/${rec.registration_id}`)}
                                    disabled={!rec.registration_id}
                                    style={{
                                      padding: "0.35rem 0.8rem",
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                      background: "var(--white)",
                                      color: "var(--charcoal)",
                                      border: "1px solid #ddd",
                                      cursor: "pointer",
                                    }}
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
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
              {categories.map((cat) => {
                const category = cat.name;
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
