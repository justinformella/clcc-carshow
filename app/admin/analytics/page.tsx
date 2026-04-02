"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import { MAX_REGISTRATIONS as MAX_REGISTRATIONS_DEFAULT } from "@/types/database";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { ResponsiveRadar } from "@nivo/radar";

type VehicleSpec = {
  registration_id: string;
  body_style: string | null;
  country_of_origin: string | null;
  category: string | null;
  cylinders: number | null;
  displacement_liters: number | null;
  horsepower: number | null;
  drive_type: string | null;
  engine_type: string | null;
  weight_lbs: number | null;
  original_msrp: number | null;
  production_numbers: number | null;
  era: string | null;
  notable_features: string | null;
  msrp_adjusted: number | null;
};

type RegWithSpec = Registration & { spec?: VehicleSpec };

// ─── Light Theme ───
const ACCENT_COLORS = ["#4f46e5", "#0d9488", "#c9a84c", "#e11d48", "#7c3aed", "#f59e0b", "#06b6d4", "#84cc16", "#ec4899", "#8b5cf6"];

// Normalize fancy color names to base colors
function normalizeColor(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const c = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    // Reds
    "rossa corsa": "Red", "rosso corsa": "Red", "guards red": "Red", "torch red": "Red",
    "candy apple red": "Red", "infrared": "Red", "rally red": "Red", "redline": "Red",
    "burgundy": "Red", "maroon": "Red", "crimson": "Red", "cherry": "Red", "wine": "Red",
    // Blues
    "le mans blue": "Blue", "laguna seca blue": "Blue", "grabber blue": "Blue",
    "velocity blue": "Blue", "rapid blue": "Blue", "sonic blue": "Blue",
    "navy": "Blue", "cobalt": "Blue", "azure": "Blue", "sapphire": "Blue", "royal blue": "Blue",
    // Greens
    "british racing green": "Green", "highland green": "Green", "lime green": "Green",
    "verde mantis": "Green", "emerald": "Green", "forest green": "Green", "olive": "Green",
    // Silvers/Grays
    "avus silver": "Silver", "nardo gray": "Silver", "nardo grey": "Silver",
    "gunmetal": "Silver", "cement": "Gray", "charcoal": "Gray", "slate": "Gray",
    "space gray": "Gray", "space grey": "Gray", "titanium": "Gray", "graphite": "Gray",
    "pewter": "Gray", "anthracite": "Gray",
    // Whites
    "alpine white": "White", "arctic white": "White", "summit white": "White",
    "oxford white": "White", "pearl white": "White", "ivory": "White", "cream": "White",
    // Blacks
    "jet black": "Black", "triple black": "Black", "obsidian": "Black",
    "onyx": "Black", "midnight": "Black", "raven": "Black",
    // Yellows
    "velocity yellow": "Yellow", "racing yellow": "Yellow", "giallo": "Yellow",
    "canary": "Yellow", "sunflower": "Yellow", "school bus yellow": "Yellow",
    // Oranges
    "arancio borealis": "Orange", "competition orange": "Orange", "fury orange": "Orange",
    "tangelo": "Orange", "tangerine": "Orange",
    // Golds
    "champagne": "Gold", "bronze": "Gold",
    // Browns
    "saddle brown": "Brown", "espresso": "Brown", "mocha": "Brown", "tan": "Brown", "beige": "Brown",
    // Purples
    "plum crazy": "Purple", "violet": "Purple", "plum": "Purple", "amethyst": "Purple",
  };

  // Check exact match first
  if (map[c]) return map[c];

  // Check if any key is contained in the color
  for (const [key, val] of Object.entries(map)) {
    if (c.includes(key)) return val;
  }

  // Check base color words
  const bases = ["Red", "Blue", "Green", "Black", "White", "Silver", "Gray", "Grey", "Yellow", "Orange", "Gold", "Brown", "Purple", "Pink", "Beige"];
  for (const base of bases) {
    if (c.includes(base.toLowerCase())) return base === "Grey" ? "Gray" : base;
  }

  // Title case whatever it is
  return raw.trim().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function countBy<T>(items: T[], fn: (item: T) => string | null | undefined): { id: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = fn(item) || "Unknown";
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value);
}

// ─── Animated counter ───
function AnimNum({ target, duration = 1400, prefix = "", suffix = "", raw = false }: { target: number; duration?: number; prefix?: string; suffix?: string; raw?: boolean }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCurrent(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return <>{prefix}{raw ? current : current.toLocaleString()}{suffix}</>;
}

// ─── Tachometer Gauge (kept but not rendered) ───
function TachGauge({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 240 - 120;
  const GREEN = "#00e68a", ORANGE = "#ff9f43", RED = "#ff3b5c", TEXT_MUTED = "#52525b";
  const color = pct < 0.6 ? GREEN : pct < 0.85 ? ORANGE : RED;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "260px", margin: "0 auto" }}>
      <svg viewBox="0 0 200 130" style={{ width: "100%" }}>
        <path d="M 20 120 A 80 80 0 1 1 180 120" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        {Array.from({ length: 13 }).map((_, i) => {
          const a = ((i / 12) * 240 - 120) * (Math.PI / 180);
          const r1 = 87, r2 = i % 3 === 0 ? 97 : 93;
          return <line key={i} x1={100 + Math.cos(a) * r1} y1={110 + Math.sin(a) * r1} x2={100 + Math.cos(a) * r2} y2={110 + Math.sin(a) * r2} stroke="rgba(255,255,255,0.15)" strokeWidth={i % 3 === 0 ? 2 : 1} />;
        })}
        <path d="M 20 120 A 80 80 0 1 1 180 120" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${pct * 335} 335`}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1s ease" }}
        />
        <line x1="100" y1="110" x2={100 + Math.cos(angle * Math.PI / 180) * 65} y2={110 + Math.sin(angle * Math.PI / 180) * 65}
          stroke="#fff" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "all 1s ease", filter: "drop-shadow(0 0 3px rgba(255,255,255,0.5))" }}
        />
        <circle cx="100" cy="110" r="5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div style={{ position: "absolute", bottom: "8px", left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: "'Barlow Condensed', 'Inter', sans-serif", fontSize: "2rem", fontWeight: 600, color: "#fff", textShadow: `0 0 12px ${color}`, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(pct * 100)}%
        </span>
        <br />
        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.2em", color: TEXT_MUTED }}>{label}</span>
      </div>
    </div>
  );
}
void TachGauge; // suppress unused warning

// ─── Horizontal stacked bar ───
function StackedBar({ data }: { data: { id: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", height: "28px", borderRadius: "4px", overflow: "hidden", gap: "2px" }}>
      {data.map((d, i) => (
        <div
          key={d.id}
          title={`${d.id}: ${d.value}`}
          style={{
            flex: d.value / total,
            background: ACCENT_COLORS[i % ACCENT_COLORS.length],
            opacity: 0.85,
            minWidth: d.value / total > 0.03 ? "2px" : "0",
            transition: "flex 0.8s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Card component ───
function Card({ title, children, headerRight }: { title?: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "1.5rem", marginBottom: "1rem" }}>
      {(title || headerRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          {title && <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, color: "var(--charcoal)", margin: 0 }}>{title}</h3>}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<"hp" | "rare" | "value">("hp");
  const [maxRegistrations, setMaxRegistrations] = useState(MAX_REGISTRATIONS_DEFAULT);
  const [tab, setTab] = useState<"site" | "registration" | "vehicles" | "leaderboard">("site");

  // Site analytics state
  const [trafficData, setTrafficData] = useState<{ date: string; views: number; visitors: number }[]>([]);
  const [pathData, setPathData] = useState<{ path: string; views: number }[]>([]);
  const [referrerData, setReferrerData] = useState<{ referrer: string; visitors: number }[]>([]);
  const [insights, setInsights] = useState<{ trend: string; insights: string[]; recommendations: string[] } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [regRes, specRes, settingRes] = await Promise.all([
        supabase.from("registrations").select("*").in("payment_status", ["paid", "comped"]).order("car_number", { ascending: true }),
        supabase.from("vehicle_specs").select("*"),
        supabase.from("app_settings").select("value").eq("key", "max_registrations").maybeSingle(),
      ]);
      setRegistrations(regRes.data || []);
      setSpecs((specRes.data as VehicleSpec[]) || []);
      if (settingRes.data?.value) {
        const v = parseInt(settingRes.data.value, 10);
        if (!isNaN(v)) setMaxRegistrations(v);
      }

      // Fetch traffic data
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const [trafficRes, pathRes, referrerRes] = await Promise.all([
        supabase.from("page_views").select("date, views, visitors").gte("date", thirtyDaysAgo).order("date"),
        supabase.from("page_view_paths").select("path, views").gte("date", thirtyDaysAgo),
        supabase.from("page_view_referrers").select("referrer, visitors").gte("date", thirtyDaysAgo),
      ]);
      setTrafficData(trafficRes.data || []);
      // Aggregate paths across dates
      const pathMap: Record<string, number> = {};
      (pathRes.data || []).forEach((r: { path: string; views: number }) => { pathMap[r.path] = (pathMap[r.path] || 0) + r.views; });
      setPathData(Object.entries(pathMap).map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views));
      // Aggregate referrers across dates
      const refMap: Record<string, number> = {};
      (referrerRes.data || []).forEach((r: { referrer: string; visitors: number }) => { refMap[r.referrer] = (refMap[r.referrer] || 0) + r.visitors; });
      setReferrerData(Object.entries(refMap).map(([referrer, visitors]) => ({ referrer, visitors })).sort((a, b) => b.visitors - a.visitors));

      setLoading(false);
    };
    fetchData();
  }, []);

  // Fetch AI insights when site tab is active
  useEffect(() => {
    if (tab === "site" && !insights && !insightsLoading) {
      setInsightsLoading(true);
      fetch("/api/analytics/insights", { method: "POST" })
        .then((r) => r.json())
        .then((data) => { if (data.trend) setInsights(data); })
        .catch(() => {})
        .finally(() => setInsightsLoading(false));
    }
  }, [tab, insights, insightsLoading]);

  const handleEnrichAll = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/registrations/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batch: true }) });
      const data = await res.json();
      setEnrichResult(`${data.enriched} enriched`);
      const supabase = createClient();
      const { data: newSpecs } = await supabase.from("vehicle_specs").select("*");
      setSpecs((newSpecs as VehicleSpec[]) || []);
    } catch { setEnrichResult("Failed"); }
    finally { setEnriching(false); }
  };

  const specMap = useMemo(() => new Map(specs.map((s) => [s.registration_id, s])), [specs]);
  const regsWithSpecs: RegWithSpec[] = useMemo(() => registrations.map((r) => ({ ...r, spec: specMap.get(r.id) })), [registrations, specMap]);
  const hasSpecs = specs.length > 0;

  // Metrics
  const uniqueMakes = new Set(registrations.map((r) => r.vehicle_make?.trim().toLowerCase())).size;
  const totalHp = specs.reduce((s, sp) => s + (sp.horsepower || 0), 0);
  const totalWeight = specs.reduce((s, sp) => s + (sp.weight_lbs || 0), 0);
  const totalMsrp = specs.reduce((s, sp) => s + (sp.original_msrp || 0), 0);
  const totalMsrpAdjusted = specs.reduce((s, sp) => s + (sp.msrp_adjusted || 0), 0);

  // Charts
  const byMake = countBy(registrations, (r) => r.vehicle_make?.trim());
  const byDecade = countBy(registrations, (r) => `${Math.floor(r.vehicle_year / 10) * 10}s`).sort((a, b) => a.id.localeCompare(b.id));
  const byColor = countBy(registrations, (r) => normalizeColor(r.vehicle_color));
  const byCountry = countBy(specs, (s) => s.country_of_origin);
  const byCategory = countBy(specs, (s) => s.category);
  const byEra = countBy(specs, (s) => s.era);
  const treemapData = { name: "makes", children: byMake.slice(0, 15).map((m) => ({ name: m.id, value: m.value })) };

  // Fun stats
  const oldest = registrations.length > 0 ? registrations.reduce((m, r) => r.vehicle_year < m.vehicle_year ? r : m, registrations[0]) : null;
  const newest = registrations.length > 0 ? registrations.reduce((m, r) => r.vehicle_year > m.vehicle_year ? r : m, registrations[0]) : null;
  const mostPowerful = regsWithSpecs.filter((r) => r.spec?.horsepower).sort((a, b) => (b.spec?.horsepower || 0) - (a.spec?.horsepower || 0))[0] || null;
  const rarest = regsWithSpecs.filter((r) => r.spec?.production_numbers && r.spec.production_numbers > 0).sort((a, b) => (a.spec?.production_numbers || Infinity) - (b.spec?.production_numbers || Infinity))[0] || null;

  // HP distribution
  const hpBuckets = (() => {
    const b: Record<string, number> = {};
    specs.filter((s) => s.horsepower).forEach((s) => {
      const hp = s.horsepower || 0;
      const key = hp < 150 ? "< 150" : hp < 250 ? "150-249" : hp < 350 ? "250-349" : hp < 500 ? "350-499" : "500+";
      b[key] = (b[key] || 0) + 1;
    });
    return ["< 150", "150-249", "250-349", "350-499", "500+"].filter((k) => b[k]).map((id) => ({ id, value: b[id] }));
  })();

  // Radar
  const specsWithData = specs.filter((s) => s.horsepower && s.weight_lbs);
  const radarData = specsWithData.length > 0 ? [
    { stat: "Power", value: Math.round(specsWithData.reduce((s, sp) => s + (sp.horsepower || 0), 0) / specsWithData.length / 5) },
    { stat: "Weight", value: Math.round(specsWithData.reduce((s, sp) => s + (sp.weight_lbs || 0), 0) / specsWithData.length / 50) },
    { stat: "Displ.", value: Math.round(specs.filter((s) => s.displacement_liters).reduce((s, sp) => s + (Number(sp.displacement_liters) || 0), 0) / (specs.filter((s) => s.displacement_liters).length || 1) * 10) },
    { stat: "Rarity", value: Math.min(100, Math.round(100 - (specs.filter((s) => s.production_numbers).reduce((s, sp) => s + Math.min(sp.production_numbers || 100000, 100000), 0) / (specs.filter((s) => s.production_numbers).length || 1)) / 1000)) },
    { stat: "Price", value: Math.round(specs.filter((s) => s.msrp_adjusted || s.original_msrp).reduce((s, sp) => s + (sp.msrp_adjusted || sp.original_msrp || 0), 0) / (specs.filter((s) => s.msrp_adjusted || s.original_msrp).length || 1) / 500) },
  ] : [];

  // Leaderboard
  const leaderboardData = (() => {
    const items = regsWithSpecs.filter((r) => r.spec);
    if (leaderboard === "hp") return items.sort((a, b) => (b.spec?.horsepower || 0) - (a.spec?.horsepower || 0));
    if (leaderboard === "rare") return items.filter((r) => r.spec?.production_numbers && r.spec.production_numbers > 0).sort((a, b) => (a.spec?.production_numbers || Infinity) - (b.spec?.production_numbers || Infinity));
    return items.filter((r) => r.spec?.msrp_adjusted || r.spec?.original_msrp).sort((a, b) => (b.spec?.msrp_adjusted || b.spec?.original_msrp || 0) - (a.spec?.msrp_adjusted || a.spec?.original_msrp || 0));
  })().slice(0, 8);

  // Site analytics computations
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const visitors7d = trafficData.filter((d) => d.date >= sevenDaysAgo).reduce((s, d) => s + d.visitors, 0);
  const regs7d = registrations.filter((r) => r.paid_at && r.paid_at >= sevenDaysAgo).length;
  const conversionRate7d = visitors7d > 0 ? ((regs7d / visitors7d) * 100).toFixed(1) : "0.0";
  const avgDailyVisitors = trafficData.length > 0 ? Math.round(trafficData.reduce((s, d) => s + d.visitors, 0) / trafficData.length) : 0;

  // Build daily data for charts
  const dailyRegCounts = useMemo(() => {
    const map: Record<string, number> = {};
    registrations.forEach((r) => {
      if (r.paid_at) {
        const day = r.paid_at.split("T")[0];
        map[day] = (map[day] || 0) + 1;
      }
    });
    return map;
  }, [registrations]);

  const mergedDailyData = useMemo(() => {
    return trafficData.map((d) => ({
      date: d.date,
      visitors: d.visitors,
      registrations: dailyRegCounts[d.date] || 0,
      conversionRate: d.visitors > 0 ? Number(((dailyRegCounts[d.date] || 0) / d.visitors * 100).toFixed(1)) : 0,
    }));
  }, [trafficData, dailyRegCounts]);

  // Conversion funnel
  const homepageViews = pathData.filter((p) => p.path === "/").reduce((s, p) => s + p.views, 0);
  const registerViews = pathData.filter((p) => p.path.startsWith("/register")).reduce((s, p) => s + p.views, 0);
  const paidCount = registrations.length;

  const nivoTheme = {
    text: { fill: "#666" },
    axis: { ticks: { text: { fill: "#999", fontSize: 11 } } },
    grid: { line: { stroke: "rgba(0,0,0,0.06)" } },
    tooltip: { container: { background: "#fff", color: "#333", fontSize: 13, borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" } },
    labels: { text: { fill: "#fff", fontSize: 11, fontWeight: 600 } },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: "2px solid rgba(0,0,0,0.08)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
          <p style={{ color: "#999" }}>Initializing analytics...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="analytics-root" style={{ position: "relative" }}>
      {/* ─── Header ─── */}
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400, marginBottom: "1.5rem", color: "#1a1a1a" }}>Analytics</h1>

      {/* ─── Tabs ─── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid rgba(0,0,0,0.08)", marginBottom: "1.5rem" }}>
        {([
          { key: "site" as const, label: "Site Analytics" },
          { key: "registration" as const, label: "Registration Data" },
          { key: "vehicles" as const, label: "Vehicle Intelligence" },
          { key: "leaderboard" as const, label: "Leaderboard" },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "0.6rem 1.5rem", fontSize: "0.8rem", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em", background: "transparent",
            border: "none", borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
            marginBottom: "-2px", color: tab === t.key ? "var(--charcoal)" : "var(--text-light)",
            cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══════════════ TAB: Site Analytics ═══════════════ */}
      {tab === "site" && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Visitors (7d)", value: visitors7d, color: "#4f46e5" },
              { label: "Registrations (7d)", value: regs7d, color: "#0d9488" },
              { label: "Conversion Rate", value: conversionRate7d, suffix: "%", color: "#c9a84c" },
              { label: "Avg Daily Visitors", value: avgDailyVisitors, color: "#6366f1" },
            ].map((s) => (
              <Card key={s.label}>
                <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#999", marginBottom: "0.4rem" }}>{s.label}</p>
                <p style={{ fontFamily: "'Barlow Condensed', 'Inter', sans-serif", fontSize: "2rem", fontWeight: 600, color: s.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {typeof s.value === "number" ? <AnimNum target={s.value} /> : s.value}{s.suffix || ""}
                </p>
              </Card>
            ))}
          </div>

          {/* Conversion Rate Trend */}
          {mergedDailyData.length > 0 && (
            <Card title="Conversion Rate Trend">
              <div style={{ height: 280 }}>
                <ResponsiveBar
                  data={mergedDailyData.map((d) => ({ date: d.date.slice(5), visitors: d.visitors, conversionRate: d.conversionRate }))}
                  keys={["visitors"]}
                  indexBy="date"
                  theme={nivoTheme}
                  colors={["#4f46e5"]}
                  borderRadius={2}
                  padding={0.3}
                  margin={{ top: 24, right: 16, bottom: 36, left: 48 }}
                  axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -45 }}
                  axisLeft={{ tickSize: 0, tickPadding: 6 }}
                  enableLabel
                  label={(d) => `${mergedDailyData.find((m) => m.date.slice(5) === d.indexValue)?.conversionRate || 0}%`}
                  labelTextColor="#fff"
                  animate
                  motionConfig="gentle"
                />
              </div>
            </Card>
          )}

          {/* Visitors & Registrations by Day */}
          {mergedDailyData.length > 0 && (
            <Card title="Visitors & Registrations by Day">
              <div style={{ height: 280 }}>
                <ResponsiveBar
                  data={mergedDailyData.map((d) => ({ date: d.date.slice(5), visitors: d.visitors, registrations: d.registrations }))}
                  keys={["visitors", "registrations"]}
                  indexBy="date"
                  theme={nivoTheme}
                  colors={["#4f46e5", "#0d9488"]}
                  groupMode="grouped"
                  borderRadius={2}
                  padding={0.3}
                  margin={{ top: 8, right: 16, bottom: 36, left: 48 }}
                  axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -45 }}
                  axisLeft={{ tickSize: 0, tickPadding: 6 }}
                  enableLabel={false}
                  legends={[
                    { dataFrom: "keys", anchor: "top-right", direction: "row", translateY: -4, itemWidth: 100, itemHeight: 20, symbolSize: 10, symbolShape: "square" },
                  ]}
                  animate
                  motionConfig="gentle"
                />
              </div>
            </Card>
          )}

          {/* AI Insights */}
          <Card title="AI Insights">
            {insightsLoading && (
              <p style={{ color: "#999", animation: "pulse 1.5s ease-in-out infinite" }}>Generating insights...</p>
            )}
            {insights && (
              <div>
                <span style={{
                  display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                  background: insights.trend === "Improving" ? "#dcfce7" : insights.trend === "Declining" ? "#fef2f2" : "#fefce8",
                  color: insights.trend === "Improving" ? "#166534" : insights.trend === "Declining" ? "#991b1b" : "#854d0e",
                  marginBottom: "1rem",
                }}>{insights.trend}</span>
                <ul style={{ margin: "1rem 0", paddingLeft: "1.25rem", color: "#1a1a1a" }}>
                  {insights.insights.map((item, i) => (
                    <li key={i} style={{ marginBottom: "0.5rem", lineHeight: 1.5, fontSize: "0.9rem" }}>{item}</li>
                  ))}
                </ul>
                {insights.recommendations.length > 0 && (
                  <div style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", padding: "1rem", marginTop: "1rem" }}>
                    <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#999", marginBottom: "0.5rem", fontWeight: 600 }}>Recommendations</p>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#1a1a1a" }}>
                      {insights.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: "0.4rem", lineHeight: 1.5, fontSize: "0.85rem" }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {!insightsLoading && !insights && (
              <p style={{ color: "#999", fontSize: "0.9rem" }}>Unable to generate insights</p>
            )}
          </Card>

          {/* Two-column row: Funnel + Referrers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Conversion Funnel */}
            <Card title="Conversion Funnel">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "Homepage Visitors", value: homepageViews, color: "#4f46e5" },
                  { label: "/register Visitors", value: registerViews, color: "#0d9488" },
                  { label: "Paid Registrations", value: paidCount, color: "#c9a84c" },
                ].map((step) => {
                  const maxVal = Math.max(homepageViews, 1);
                  return (
                    <div key={step.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "#1a1a1a" }}>{step.label}</span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: step.color }}>{step.value.toLocaleString()}</span>
                      </div>
                      <div style={{ height: "24px", background: "rgba(0,0,0,0.04)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(step.value / maxVal) * 100}%`, background: step.color, borderRadius: "4px", transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Top Referrers */}
            <Card title="Top Referrers">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th style={thLight}>Source</th>
                    <th style={{ ...thLight, textAlign: "right" }}>Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {referrerData.slice(0, 8).map((r) => (
                    <tr key={r.referrer}>
                      <td style={tdLight}>{r.referrer || "(direct)"}</td>
                      <td style={{ ...tdLight, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.visitors.toLocaleString()}</td>
                    </tr>
                  ))}
                  {referrerData.length === 0 && (
                    <tr><td colSpan={2} style={{ ...tdLight, textAlign: "center", color: "#999", padding: "2rem" }}>No referrer data yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}

      {/* ═══════════════ TAB: Registration Data ═══════════════ */}
      {tab === "registration" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <Card title="Makes">
              <div style={{ height: 300 }}>
                <ResponsiveTreeMap data={treemapData} identity="name" value="value" label={(n) => `${n.id} (${n.formattedValue})`} labelSkipSize={40} theme={nivoTheme} colors={ACCENT_COLORS} borderWidth={2} borderColor="#fff" nodeOpacity={0.85} labelTextColor="#fff" enableParentLabel={false} />
              </div>
            </Card>
            <Card title="Decades">
              <div style={{ height: 300 }}>
                <ResponsiveBar data={byDecade.map((d) => ({ id: d.id, value: d.value }))} keys={["value"]} indexBy="id" theme={nivoTheme} colors={["#c9a84c"]} borderRadius={2} padding={0.3} margin={{ top: 8, right: 8, bottom: 36, left: 36 }} axisBottom={{ tickSize: 0, tickPadding: 6 }} axisLeft={{ tickSize: 0, tickPadding: 6 }} enableLabel={false} animate motionConfig="gentle" />
              </div>
            </Card>
            <Card title="Colors">
              <div style={{ height: 300 }}>
                <ResponsivePie
                  data={byColor.slice(0, 10)}
                  theme={nivoTheme}
                  colors={(d) => {
                    const colorMap: Record<string, string> = {
                      Red: "#dc2626", Blue: "#2563eb", Green: "#16a34a", Black: "#27272a",
                      White: "#d4d4d8", Silver: "#94a3b8", Gray: "#6b7280", Yellow: "#eab308",
                      Orange: "#ea580c", Gold: "#c9a84c", Brown: "#92400e", Purple: "#7c3aed",
                      Pink: "#ec4899", Beige: "#d4a574", Unknown: "#525252",
                    };
                    return colorMap[d.id] || "#525252";
                  }}
                  innerRadius={0.6} padAngle={2} cornerRadius={3}
                  margin={{ top: 15, right: 60, bottom: 15, left: 60 }}
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLinkLabelsTextColor="#666"
                  arcLinkLabelsThickness={1.5}
                  arcLabelsTextColor="#fff"
                  enableArcLabels={false}
                  animate motionConfig="gentle"
                />
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ═══════════════ TAB: Vehicle Intelligence ═══════════════ */}
      {tab === "vehicles" && (
        <>
          {/* Enrich button */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {enrichResult && <span style={{ fontSize: "0.7rem", color: "#0d9488" }}>{enrichResult}</span>}
            {specs.length >= registrations.length ? (
              <button
                onClick={async () => {
                  if (!confirm("Re-enrich all vehicles? This will refresh specs for every registration.")) return;
                  setEnriching(true);
                  setEnrichResult(null);
                  const supabase = createClient();
                  await supabase.from("vehicle_specs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                  setSpecs([]);
                  try {
                    const res = await fetch("/api/registrations/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batch: true }) });
                    const data = await res.json();
                    setEnrichResult(`${data.enriched} re-enriched`);
                    const { data: newSpecs } = await supabase.from("vehicle_specs").select("*");
                    setSpecs((newSpecs as VehicleSpec[]) || []);
                  } catch { setEnrichResult("Failed"); }
                  finally { setEnriching(false); }
                }}
                disabled={enriching}
                style={{
                  padding: "0.5rem 1.2rem", background: "transparent",
                  color: "#999", border: "1px solid rgba(0,0,0,0.12)",
                  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  cursor: enriching ? "default" : "pointer", opacity: enriching ? 0.5 : 1,
                  display: "flex", alignItems: "center", gap: "0.4rem", borderRadius: "2px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                {enriching ? "Working..." : "Re-enrich All"}
              </button>
            ) : (
              <button
                onClick={handleEnrichAll}
                disabled={enriching}
                style={{
                  padding: "0.5rem 1.2rem", background: "linear-gradient(135deg, #c9a84c, #b8943f)",
                  color: "#fff", border: "none",
                  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  cursor: enriching ? "default" : "pointer", opacity: enriching ? 0.5 : 1,
                  display: "flex", alignItems: "center", gap: "0.4rem", borderRadius: "2px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2C10 5.31 12.69 8 16 8C12.69 8 10 10.69 10 14C10 10.69 7.31 8 4 8C7.31 8 10 5.31 10 2Z"/><path d="M18 12C18 14.21 19.79 16 22 16C19.79 16 18 17.79 18 20C18 17.79 16.21 16 14 16C16.21 16 18 14.21 18 12Z"/></svg>
                {enriching ? "Working..." : `Enrich ${registrations.length - specs.length}`}
              </button>
            )}
          </div>

          {hasSpecs ? (
            <>
              {/* Country + Category + Era */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <Card title="Country of Origin">
                  <div style={{ height: 260 }}>
                    <ResponsivePie data={byCountry} theme={nivoTheme} colors={ACCENT_COLORS} margin={{ top: 15, right: 70, bottom: 15, left: 70 }} arcLinkLabelsColor={{ from: "color" }} arcLinkLabelsTextColor="#666" arcLinkLabelsThickness={1.5} arcLabelsTextColor="#fff" padAngle={1} cornerRadius={2} animate motionConfig="gentle" />
                  </div>
                </Card>

                <Card title="Category Breakdown">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
                    <StackedBar data={byCategory} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {byCategory.map((c, i) => (
                        <span key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#999" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: ACCENT_COLORS[i % ACCENT_COLORS.length] }} />
                          {c.id} ({c.value})
                        </span>
                      ))}
                    </div>
                  </div>
                  {radarData.length > 0 && (
                    <>
                      <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#999", marginTop: "1rem", marginBottom: "0.5rem" }}>Show Profile</p>
                      <div style={{ height: 200 }}>
                        <ResponsiveRadar data={radarData} keys={["value"]} indexBy="stat" theme={nivoTheme} colors={["#c9a84c"]} fillOpacity={0.15} borderWidth={2} borderColor="#c9a84c" dotSize={6} dotColor="#c9a84c" dotBorderWidth={0} gridLevels={3} gridShape="linear" margin={{ top: 20, right: 50, bottom: 20, left: 50 }} animate motionConfig="gentle" />
                      </div>
                    </>
                  )}
                </Card>

                <Card title="Era">
                  <div style={{ height: 260 }}>
                    <ResponsiveBar data={byEra.map((d) => ({ id: d.id, value: d.value }))} keys={["value"]} indexBy="id" theme={nivoTheme} colors={["#0d9488"]} borderRadius={2} padding={0.35} margin={{ top: 8, right: 8, bottom: 56, left: 36 }} axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -30 }} axisLeft={{ tickSize: 0, tickPadding: 6 }} enableLabel={false} animate motionConfig="gentle" />
                  </div>
                </Card>
              </div>

              {/* HP Distribution */}
              {hpBuckets.length > 0 && (
                <Card title="Horsepower Distribution">
                  <div style={{ height: 180 }}>
                    <ResponsiveBar data={hpBuckets.map((d) => ({ id: d.id, value: d.value }))} keys={["value"]} indexBy="id" theme={nivoTheme} colors={["#e11d48"]} borderRadius={2} padding={0.3} margin={{ top: 8, right: 16, bottom: 36, left: 36 }} axisBottom={{ tickSize: 0, tickPadding: 6 }} axisLeft={{ tickSize: 0, tickPadding: 6 }} enableLabel labelTextColor="#fff" animate motionConfig="gentle" />
                  </div>
                </Card>
              )}

              {/* Fun Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                {([
                  oldest ? { label: "Oldest", value: `${oldest.vehicle_year} ${oldest.vehicle_make}`, detail: oldest.vehicle_model } : null,
                  newest ? { label: "Newest", value: `${newest.vehicle_year} ${newest.vehicle_make}`, detail: newest.vehicle_model } : null,
                  mostPowerful?.spec?.horsepower ? { label: "Most Powerful", value: `${mostPowerful.vehicle_make} ${mostPowerful.vehicle_model}`, detail: `${mostPowerful.spec.horsepower} HP` } : null,
                  rarest?.spec?.production_numbers ? { label: "Rarest", value: `${rarest.vehicle_make} ${rarest.vehicle_model}`, detail: `${rarest.spec.production_numbers.toLocaleString()} built` } : null,
                ] as ({ label: string; value: string; detail: string } | null)[]).filter((s): s is { label: string; value: string; detail: string } => s !== null).map((s) => (
                  <div key={s.label} style={{ background: "var(--white)", border: "1px solid rgba(0,0,0,0.08)", borderLeft: "2px solid #c9a84c", padding: "0.8rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#c9a84c", marginBottom: "0.3rem" }}>{s.label}</p>
                    <p style={{ fontSize: "0.9rem", color: "#1a1a1a", fontWeight: 500 }}>{s.value}</p>
                    <p style={{ fontSize: "0.75rem", color: "#999" }}>{s.detail}</p>
                  </div>
                ))}
              </div>

              {/* Stat summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
                {[
                  { label: "Vehicles", val: registrations.length },
                  { label: "Makes", val: uniqueMakes },
                  { label: "Combined HP", val: totalHp },
                  { label: "Avg Year", val: Math.round(registrations.reduce((s, r) => s + r.vehicle_year, 0) / (registrations.length || 1)), raw: true },
                  { label: "Tonnage", val: Math.round(totalWeight / 2000 * 10) / 10, suffix: "t" },
                  { label: "Original Sticker", val: totalMsrp, prefix: "$" },
                  { label: "In 2026 Dollars", val: totalMsrpAdjusted, prefix: "$" },
                ].map((m) => (
                  <Card key={m.label}>
                    <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#999", marginBottom: "0.4rem" }}>{m.label}</p>
                    <p style={{ fontFamily: "'Barlow Condensed', 'Inter', sans-serif", fontSize: "1.8rem", fontWeight: 600, color: "#1a1a1a", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                      <AnimNum target={typeof m.val === "number" ? m.val : 0} prefix={m.prefix || ""} suffix={m.suffix || ""} raw={m.raw} />
                    </p>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <p style={{ textAlign: "center", color: "#999", padding: "2rem" }}>Enrich vehicles to unlock Vehicle Intelligence</p>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════ TAB: Leaderboard ═══════════════ */}
      {tab === "leaderboard" && (
        <>
          {hasSpecs ? (
            <Card headerRight={
              <div style={{ display: "flex", gap: "2px", borderRadius: "2px", overflow: "hidden" }}>
                {([["hp", "Power"], ["rare", "Rarest"], ["value", "Original Price"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setLeaderboard(key)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", border: "none", cursor: "pointer", background: leaderboard === key ? "#c9a84c" : "rgba(0,0,0,0.04)", color: leaderboard === key ? "#fff" : "#999", transition: "all 0.2s" }}>
                    {label}
                  </button>
                ))}
              </div>
            }>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th style={thLight}></th>
                    <th style={thLight}>Vehicle</th>
                    <th style={thLight}>Category</th>
                    <th style={{ ...thLight, textAlign: "right" }}>{leaderboard === "hp" ? "HP" : leaderboard === "rare" ? "Production" : "2026 Dollars"}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((r, i) => (
                    <tr key={r.id} onClick={() => router.push(`/admin/registrations/${r.id}`)} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ ...tdLight, width: "32px", fontWeight: 700, color: i < 3 ? "#c9a84c" : "#999" }}>{i + 1}</td>
                      <td style={tdLight}>
                        <span style={{ color: "#1a1a1a" }}>{r.vehicle_year} {r.vehicle_make} {r.vehicle_model}</span>
                        <span style={{ color: "#999", marginLeft: "0.5rem", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>#{r.car_number}</span>
                      </td>
                      <td style={{ ...tdLight, color: "#999" }}>{r.spec?.category || "\u2014"}</td>
                      <td style={{ ...tdLight, textAlign: "right", fontFamily: "'Barlow Condensed', 'Inter', sans-serif", fontSize: "1.1rem", fontWeight: 600, color: "#1a1a1a", fontVariantNumeric: "tabular-nums" }}>
                        {leaderboard === "hp" ? `${r.spec?.horsepower?.toLocaleString() || "\u2014"}` :
                         leaderboard === "rare" ? `${r.spec?.production_numbers?.toLocaleString() || "\u2014"}` :
                         r.spec?.msrp_adjusted ? `$${r.spec.msrp_adjusted.toLocaleString()}` : r.spec?.original_msrp ? `$${r.spec.original_msrp.toLocaleString()}` : "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {leaderboardData.length === 0 && (
                    <tr><td colSpan={4} style={{ ...tdLight, textAlign: "center", color: "#999", padding: "2rem" }}>Enrich vehicles to unlock the leaderboard</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card>
              <p style={{ textAlign: "center", color: "#999", padding: "2rem" }}>Enrich vehicles to unlock the leaderboard</p>
            </Card>
          )}
        </>
      )}

      {/* ─── Styles ─── */}
      <style>{`
        .admin-content > div { max-width: none !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 1100px) {
          .analytics-root [style*="grid-template-columns: 2fr 1fr 1fr"],
          .analytics-root [style*="grid-template-columns: 1fr 1fr 1fr"],
          .analytics-root [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .analytics-root [style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Table styles ───
const thLight: React.CSSProperties = { padding: "0.5rem 0.75rem", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#999", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" };
const tdLight: React.CSSProperties = { padding: "0.6rem 0.75rem" };
