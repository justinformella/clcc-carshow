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
};

type RegWithSpec = Registration & { spec?: VehicleSpec };

// ─── Theme ───
const BG = "#08090c";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.07)";
const GOLD = "#c9a84c";
const GOLD_GLOW = "rgba(201,168,76,0.25)";
const CYAN = "#00d4ff";
const RED = "#ff3b5c";
const GREEN = "#00e68a";
const ORANGE = "#ff9f43";
const PURPLE = "#a855f7";
const TEXT = "#d4d4d8";
const TEXT_MUTED = "#52525b";
const ACCENT_COLORS = [GOLD, "#e8845c", CYAN, GREEN, PURPLE, "#f472b6", ORANGE, "#38bdf8", "#fbbf24", "#a78bfa"];

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
function AnimNum({ target, duration = 1400, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
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
  return <>{prefix}{current.toLocaleString()}{suffix}</>;
}

// ─── Tachometer Gauge ───
function TachGauge({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 240 - 120; // -120 to 120 degrees
  const color = pct < 0.6 ? GREEN : pct < 0.85 ? ORANGE : RED;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "260px", margin: "0 auto" }}>
      <svg viewBox="0 0 200 130" style={{ width: "100%" }}>
        {/* Track */}
        <path d="M 20 120 A 80 80 0 1 1 180 120" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        {/* Tick marks */}
        {Array.from({ length: 13 }).map((_, i) => {
          const a = ((i / 12) * 240 - 120) * (Math.PI / 180);
          const r1 = 87, r2 = i % 3 === 0 ? 97 : 93;
          return <line key={i} x1={100 + Math.cos(a) * r1} y1={110 + Math.sin(a) * r1} x2={100 + Math.cos(a) * r2} y2={110 + Math.sin(a) * r2} stroke="rgba(255,255,255,0.15)" strokeWidth={i % 3 === 0 ? 2 : 1} />;
        })}
        {/* Fill arc */}
        <path d="M 20 120 A 80 80 0 1 1 180 120" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${pct * 335} 335`}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1s ease" }}
        />
        {/* Needle */}
        <line
          x1="100" y1="110"
          x2={100 + Math.cos(angle * Math.PI / 180) * 65}
          y2={110 + Math.sin(angle * Math.PI / 180) * 65}
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

export default function AnalyticsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<"hp" | "rare" | "value">("hp");
  const [maxRegistrations, setMaxRegistrations] = useState(MAX_REGISTRATIONS_DEFAULT);

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
      setLoading(false);
    };
    fetchData();
  }, []);

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
  const eventDate = new Date("2026-05-17T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntil = Math.max(0, Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Charts
  const byMake = countBy(registrations, (r) => r.vehicle_make?.trim());
  const byDecade = countBy(registrations, (r) => `${Math.floor(r.vehicle_year / 10) * 10}s`).sort((a, b) => a.id.localeCompare(b.id));
  const byColor = countBy(registrations, (r) => r.vehicle_color?.trim() || null);
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
      const key = hp < 150 ? "< 150" : hp < 250 ? "150–249" : hp < 350 ? "250–349" : hp < 500 ? "350–499" : "500+";
      b[key] = (b[key] || 0) + 1;
    });
    return ["< 150", "150–249", "250–349", "350–499", "500+"].filter((k) => b[k]).map((id) => ({ id, value: b[id] }));
  })();

  // Radar
  const specsWithData = specs.filter((s) => s.horsepower && s.weight_lbs);
  const radarData = specsWithData.length > 0 ? [
    { stat: "Power", value: Math.round(specsWithData.reduce((s, sp) => s + (sp.horsepower || 0), 0) / specsWithData.length / 5) },
    { stat: "Weight", value: Math.round(specsWithData.reduce((s, sp) => s + (sp.weight_lbs || 0), 0) / specsWithData.length / 50) },
    { stat: "Displ.", value: Math.round(specs.filter((s) => s.displacement_liters).reduce((s, sp) => s + (Number(sp.displacement_liters) || 0), 0) / (specs.filter((s) => s.displacement_liters).length || 1) * 10) },
    { stat: "Rarity", value: Math.min(100, Math.round(100 - (specs.filter((s) => s.production_numbers).reduce((s, sp) => s + Math.min(sp.production_numbers || 100000, 100000), 0) / (specs.filter((s) => s.production_numbers).length || 1)) / 1000)) },
    { stat: "Value", value: Math.round(specs.filter((s) => s.original_msrp).reduce((s, sp) => s + (sp.original_msrp || 0), 0) / (specs.filter((s) => s.original_msrp).length || 1) / 500) },
  ] : [];

  // Leaderboard
  const leaderboardData = (() => {
    const items = regsWithSpecs.filter((r) => r.spec);
    if (leaderboard === "hp") return items.sort((a, b) => (b.spec?.horsepower || 0) - (a.spec?.horsepower || 0));
    if (leaderboard === "rare") return items.filter((r) => r.spec?.production_numbers && r.spec.production_numbers > 0).sort((a, b) => (a.spec?.production_numbers || Infinity) - (b.spec?.production_numbers || Infinity));
    return items.filter((r) => r.spec?.original_msrp && r.spec.original_msrp > 0).sort((a, b) => (b.spec?.original_msrp || 0) - (a.spec?.original_msrp || 0));
  })().slice(0, 8);

  const nivoTheme = {
    text: { fill: TEXT },
    axis: { ticks: { text: { fill: TEXT_MUTED, fontSize: 11 } } },
    grid: { line: { stroke: "rgba(255,255,255,0.04)" } },
    tooltip: { container: { background: "#18181b", color: TEXT, fontSize: 13, borderRadius: 6, border: `1px solid ${SURFACE_BORDER}`, boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)` } },
    labels: { text: { fill: "#fff", fontSize: 11, fontWeight: 600 } },
  };

  if (loading) {
    return (
      <div className="analytics-root" style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", margin: "-2rem", padding: "2rem", width: "calc(100% + 4rem)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: `2px solid ${SURFACE_BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
          <p style={{ color: TEXT_MUTED }}>Initializing analytics...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="analytics-root" style={{ background: BG, margin: "-2rem", padding: "2rem 2.5rem", minHeight: "100vh", width: "calc(100% + 4rem)", position: "relative", overflow: "hidden" }}>
      {/* Scanline overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)" }} />

      {/* Ambient glow */}
      <div style={{ position: "absolute", top: "-200px", right: "-100px", width: "600px", height: "600px", borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_GLOW} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ─── Header ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
          <div>
            <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.3em", color: GOLD, marginBottom: "0.5rem" }}>Mission Control</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", fontWeight: 400, color: "#fff", margin: 0, lineHeight: 1 }}>
              Analytics
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {enrichResult && <span style={{ fontSize: "0.7rem", color: GREEN }}>{enrichResult}</span>}
            <button
              onClick={handleEnrichAll}
              disabled={enriching || specs.length >= registrations.length}
              style={{
                padding: "0.5rem 1.2rem", background: specs.length >= registrations.length ? "transparent" : `linear-gradient(135deg, ${GOLD}, #b8943f)`,
                color: specs.length >= registrations.length ? TEXT_MUTED : BG, border: specs.length >= registrations.length ? `1px solid ${SURFACE_BORDER}` : "none",
                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: enriching || specs.length >= registrations.length ? "default" : "pointer", opacity: enriching ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: "0.4rem", borderRadius: "2px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2C10 5.31 12.69 8 16 8C12.69 8 10 10.69 10 14C10 10.69 7.31 8 4 8C7.31 8 10 5.31 10 2Z"/><path d="M18 12C18 14.21 19.79 16 22 16C19.79 16 18 17.79 18 20C18 17.79 16.21 16 14 16C16.21 16 18 14.21 18 12Z"/></svg>
              {enriching ? "Working..." : specs.length >= registrations.length ? "All Enriched" : `Enrich ${registrations.length - specs.length}`}
            </button>
          </div>
        </div>

        {/* ─── Hero Row: Gauge + Metrics ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          {/* Tachometer */}
          <GlassCard>
            <TachGauge value={registrations.length} max={maxRegistrations} label="Capacity" />
            <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
              <span style={{ fontSize: "0.8rem", color: TEXT }}>{registrations.length}</span>
              <span style={{ fontSize: "0.8rem", color: TEXT_MUTED }}> / {maxRegistrations}</span>
            </div>
          </GlassCard>

          {/* Stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: SURFACE_BORDER, borderRadius: "4px", overflow: "hidden" }}>
            {[
              { label: "Vehicles", val: registrations.length, glow: CYAN },
              { label: "Makes", val: uniqueMakes, glow: PURPLE },
              { label: "Combined HP", val: totalHp, glow: RED },
              { label: "Days to Show", val: daysUntil, glow: GOLD },
              { label: "Avg Year", val: Math.round(registrations.reduce((s, r) => s + r.vehicle_year, 0) / (registrations.length || 1)), glow: GREEN },
              { label: "Tonnage", val: Math.round(totalWeight / 2000 * 10) / 10, suffix: "t", glow: ORANGE },
              { label: "Sticker Total", val: totalMsrp, prefix: "$", glow: GOLD },
              { label: "Enriched", val: specs.length, suffix: `/${registrations.length}`, glow: PURPLE },
            ].map((m, i) => (
              <div key={m.label} style={{ background: BG, padding: "1.2rem 1rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(to right, transparent, ${m.glow}30, transparent)` }} />
                <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.2em", color: TEXT_MUTED, marginBottom: "0.4rem" }}>{m.label}</p>
                <p style={{ fontFamily: "'Barlow Condensed', 'Inter', sans-serif", fontSize: "1.8rem", fontWeight: 600, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 20px ${m.glow}40` }}>
                  <AnimNum target={typeof m.val === "number" ? m.val : 0} prefix={m.prefix || ""} suffix={m.suffix || ""} />
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Fun Stats ─── */}
        {hasSpecs && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
            {([
              oldest ? { label: "Oldest", value: `${oldest.vehicle_year} ${oldest.vehicle_make}`, detail: oldest.vehicle_model } : null,
              newest ? { label: "Newest", value: `${newest.vehicle_year} ${newest.vehicle_make}`, detail: newest.vehicle_model } : null,
              mostPowerful?.spec?.horsepower ? { label: "Most Powerful", value: `${mostPowerful.vehicle_make} ${mostPowerful.vehicle_model}`, detail: `${mostPowerful.spec.horsepower} HP` } : null,
              rarest?.spec?.production_numbers ? { label: "Rarest", value: `${rarest.vehicle_make} ${rarest.vehicle_model}`, detail: `${rarest.spec.production_numbers.toLocaleString()} built` } : null,
            ] as ({ label: string; value: string; detail: string } | null)[]).filter((s): s is { label: string; value: string; detail: string } => s !== null).map((s) => (
              <div key={s.label} style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, borderLeft: `2px solid ${GOLD}`, padding: "0.8rem 1rem", borderRadius: "2px" }}>
                <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.15em", color: GOLD, marginBottom: "0.3rem" }}>{s.label}</p>
                <p style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 500 }}>{s.value}</p>
                <p style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>{s.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── Section: Registration Data ─── */}
        <SectionDivider label="Registration Data" />

        {/* Treemap + Decade + Color */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <GlassCard title="Makes">
            <div style={{ height: 300 }}>
              <ResponsiveTreeMap data={treemapData} identity="name" value="value" label={(n) => `${n.id} (${n.formattedValue})`} labelSkipSize={40} theme={nivoTheme} colors={ACCENT_COLORS} borderWidth={2} borderColor={BG} nodeOpacity={0.85} labelTextColor="#fff" enableParentLabel={false} />
            </div>
          </GlassCard>
          <GlassCard title="Decades">
            <div style={{ height: 300 }}>
              <ResponsiveBar data={byDecade.map((d) => ({ id: d.id, value: d.value }))} keys={["value"]} indexBy="id" theme={nivoTheme} colors={[GOLD]} borderRadius={2} padding={0.3} margin={{ top: 8, right: 8, bottom: 36, left: 36 }} axisBottom={{ tickSize: 0, tickPadding: 6 }} axisLeft={{ tickSize: 0, tickPadding: 6 }} enableLabel={false} animate motionConfig="gentle" />
            </div>
          </GlassCard>
          <GlassCard title="Colors">
            <div style={{ height: 300 }}>
              <ResponsivePie data={byColor.slice(0, 8)} theme={nivoTheme} colors={ACCENT_COLORS} innerRadius={0.6} padAngle={2} cornerRadius={3} margin={{ top: 15, right: 60, bottom: 15, left: 60 }} arcLinkLabelsColor={{ from: "color" }} arcLinkLabelsTextColor={TEXT} arcLinkLabelsThickness={1.5} arcLabelsTextColor="#fff" enableArcLabels={false} animate motionConfig="gentle" />
            </div>
          </GlassCard>
        </div>

        {/* ─── Section: Vehicle Intelligence ─── */}
        {hasSpecs && (
          <>
            <SectionDivider label="Vehicle Intelligence" accent />

            {/* Country + Category stacked bar + Era */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <GlassCard title="Country of Origin">
                <div style={{ height: 260 }}>
                  <ResponsivePie data={byCountry} theme={nivoTheme} colors={ACCENT_COLORS} margin={{ top: 15, right: 70, bottom: 15, left: 70 }} arcLinkLabelsColor={{ from: "color" }} arcLinkLabelsTextColor={TEXT} arcLinkLabelsThickness={1.5} arcLabelsTextColor="#fff" padAngle={1} cornerRadius={2} animate motionConfig="gentle" />
                </div>
              </GlassCard>

              <GlassCard title="Category Breakdown">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
                  <StackedBar data={byCategory} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {byCategory.map((c, i) => (
                      <span key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: TEXT_MUTED }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: ACCENT_COLORS[i % ACCENT_COLORS.length] }} />
                        {c.id} ({c.value})
                      </span>
                    ))}
                  </div>
                </div>
                {radarData.length > 0 && (
                  <>
                    <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.15em", color: TEXT_MUTED, marginTop: "1rem", marginBottom: "0.5rem" }}>Show Profile</p>
                    <div style={{ height: 200 }}>
                      <ResponsiveRadar data={radarData} keys={["value"]} indexBy="stat" theme={nivoTheme} colors={[GOLD]} fillOpacity={0.15} borderWidth={2} borderColor={GOLD} dotSize={6} dotColor={GOLD} dotBorderWidth={0} gridLevels={3} gridShape="linear" margin={{ top: 20, right: 50, bottom: 20, left: 50 }} animate motionConfig="gentle" />
                    </div>
                  </>
                )}
              </GlassCard>

              <GlassCard title="Era">
                <div style={{ height: 260 }}>
                  <ResponsiveBar data={byEra.map((d) => ({ id: d.id, value: d.value }))} keys={["value"]} indexBy="id" theme={nivoTheme} colors={[GREEN]} borderRadius={2} padding={0.35} margin={{ top: 8, right: 8, bottom: 56, left: 36 }} axisBottom={{ tickSize: 0, tickPadding: 6, tickRotation: -30 }} axisLeft={{ tickSize: 0, tickPadding: 6 }} enableLabel={false} animate motionConfig="gentle" />
                </div>
              </GlassCard>
            </div>

            {/* HP Distribution full-width */}
            {hpBuckets.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <GlassCard title="Horsepower Distribution">
                  <div style={{ height: 180 }}>
                    <ResponsiveBar data={hpBuckets.map((d) => ({ id: d.id, value: d.value }))} keys={["value"]} indexBy="id" theme={nivoTheme} colors={[RED]} borderRadius={2} padding={0.3} margin={{ top: 8, right: 16, bottom: 36, left: 36 }} axisBottom={{ tickSize: 0, tickPadding: 6 }} axisLeft={{ tickSize: 0, tickPadding: 6 }} enableLabel labelTextColor="#fff" animate motionConfig="gentle" />
                  </div>
                </GlassCard>
              </div>
            )}

            {/* ─── Leaderboard ─── */}
            <SectionDivider label="Leaderboard" />
            <GlassCard headerRight={
              <div style={{ display: "flex", gap: "2px", borderRadius: "2px", overflow: "hidden" }}>
                {([["hp", "Power"], ["rare", "Rarest"], ["value", "Value"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setLeaderboard(key)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", border: "none", cursor: "pointer", background: leaderboard === key ? GOLD : "rgba(255,255,255,0.06)", color: leaderboard === key ? BG : TEXT_MUTED, transition: "all 0.2s" }}>
                    {label}
                  </button>
                ))}
              </div>
            }>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th style={thDark}></th>
                    <th style={thDark}>Vehicle</th>
                    <th style={thDark}>Category</th>
                    <th style={{ ...thDark, textAlign: "right" }}>{leaderboard === "hp" ? "HP" : leaderboard === "rare" ? "Production" : "MSRP"}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((r, i) => (
                    <tr key={r.id} onClick={() => router.push(`/admin/registrations/${r.id}`)} style={{ borderBottom: `1px solid ${SURFACE_BORDER}`, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ ...tdDark, width: "32px", fontWeight: 700, color: i < 3 ? GOLD : TEXT_MUTED, textShadow: i < 3 ? `0 0 8px ${GOLD_GLOW}` : "none" }}>{i + 1}</td>
                      <td style={tdDark}>
                        <span style={{ color: "#fff" }}>{r.vehicle_year} {r.vehicle_make} {r.vehicle_model}</span>
                        <span style={{ color: TEXT_MUTED, marginLeft: "0.5rem", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>#{r.car_number}</span>
                      </td>
                      <td style={{ ...tdDark, color: TEXT_MUTED }}>{r.spec?.category || "—"}</td>
                      <td style={{ ...tdDark, textAlign: "right", fontFamily: "'Barlow Condensed', 'Inter', sans-serif", fontSize: "1.1rem", fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                        {leaderboard === "hp" ? `${r.spec?.horsepower?.toLocaleString() || "—"}` :
                         leaderboard === "rare" ? `${r.spec?.production_numbers?.toLocaleString() || "—"}` :
                         r.spec?.original_msrp ? `$${r.spec.original_msrp.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                  {leaderboardData.length === 0 && (
                    <tr><td colSpan={4} style={{ ...tdDark, textAlign: "center", color: TEXT_MUTED, padding: "2rem" }}>Enrich vehicles to unlock the leaderboard</td></tr>
                  )}
                </tbody>
              </table>
            </GlassCard>
          </>
        )}
      </div>

      {/* ─── Styles ─── */}
      <style>{`
        .admin-content > div { max-width: none !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) {
          .analytics-root [style*="grid-template-columns: 2fr 1fr 1fr"],
          .analytics-root [style*="grid-template-columns: 1fr 1fr 1fr"],
          .analytics-root [style*="grid-template-columns: 280px 1fr"] {
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

// ─── Components ───

function GlassCard({ title, children, headerRight }: { title?: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${SURFACE_BORDER}`,
      borderRadius: "4px",
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.3)`,
      overflow: "hidden",
    }}>
      {(title || headerRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderBottom: `1px solid ${SURFACE_BORDER}` }}>
          {title && <h3 style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: TEXT_MUTED, margin: 0 }}>{title}</h3>}
          {headerRight}
        </div>
      )}
      <div style={{ padding: "0.75rem 1rem" }}>{children}</div>
    </div>
  );
}

function SectionDivider({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0 1.25rem" }}>
      <div style={{ height: "1px", flex: 1, background: accent ? `linear-gradient(to right, ${GOLD}50, transparent)` : `linear-gradient(to right, ${SURFACE_BORDER}, transparent)` }} />
      <span style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.25em", color: accent ? GOLD : TEXT_MUTED, whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ height: "1px", flex: 1, background: accent ? `linear-gradient(to left, ${GOLD}50, transparent)` : `linear-gradient(to left, ${SURFACE_BORDER}, transparent)` }} />
    </div>
  );
}

const thDark: React.CSSProperties = { padding: "0.5rem 0.75rem", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: TEXT_MUTED, textAlign: "left", borderBottom: `1px solid ${SURFACE_BORDER}` };
const tdDark: React.CSSProperties = { padding: "0.6rem 0.75rem" };
