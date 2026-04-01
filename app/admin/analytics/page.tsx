"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
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
const BG = "#111113";
const SURFACE = "#1a1a1e";
const SURFACE2 = "#222226";
const GOLD = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.15)";
const TEXT = "#e8e8e8";
const TEXT_DIM = "#666";
const ACCENT_COLORS = ["#c9a84c", "#e8845c", "#5b9bd5", "#7bc67e", "#c084fc", "#f472b6", "#38bdf8", "#fbbf24", "#a78bfa", "#fb923c"];

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
function AnimatedNumber({ target, duration = 1200, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(eased * target);
      setCurrent(val);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return <>{prefix}{current.toLocaleString()}{suffix}</>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<"hp" | "rare" | "value">("hp");

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [regRes, specRes] = await Promise.all([
        supabase.from("registrations").select("*").in("payment_status", ["paid", "comped"]).order("car_number", { ascending: true }),
        supabase.from("vehicle_specs").select("*"),
      ]);
      setRegistrations(regRes.data || []);
      setSpecs((specRes.data as VehicleSpec[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleEnrichAll = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/registrations/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
      });
      const data = await res.json();
      setEnrichResult(`${data.enriched} enriched`);
      const supabase = createClient();
      const { data: newSpecs } = await supabase.from("vehicle_specs").select("*");
      setSpecs((newSpecs as VehicleSpec[]) || []);
    } catch {
      setEnrichResult("Failed");
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", margin: "-2rem", padding: "2rem", width: "calc(100% + 4rem)" }}>
        <p style={{ color: TEXT_DIM, fontSize: "1rem" }}>Loading analytics...</p>
      </div>
    );
  }

  const specMap = new Map(specs.map((s) => [s.registration_id, s]));
  const regsWithSpecs: RegWithSpec[] = registrations.map((r) => ({ ...r, spec: specMap.get(r.id) }));
  const hasSpecs = specs.length > 0;

  // ─── Compute metrics ───
  const uniqueMakes = new Set(registrations.map((r) => r.vehicle_make?.trim().toLowerCase())).size;
  const avgYear = Math.round(registrations.reduce((s, r) => s + r.vehicle_year, 0) / (registrations.length || 1));
  const totalHp = specs.reduce((s, sp) => s + (sp.horsepower || 0), 0);
  const totalWeight = specs.reduce((s, sp) => s + (sp.weight_lbs || 0), 0);
  const totalMsrp = specs.reduce((s, sp) => s + (sp.original_msrp || 0), 0);

  const eventDate = new Date("2026-05-17T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // ─── Chart data ───
  const byMake = countBy(registrations, (r) => r.vehicle_make?.trim());
  const byDecade = countBy(registrations, (r) => {
    const d = Math.floor(r.vehicle_year / 10) * 10;
    return `${d}s`;
  }).sort((a, b) => a.id.localeCompare(b.id));

  const byColor = countBy(registrations, (r) => r.vehicle_color?.trim() || null);
  const byCountry = countBy(specs, (s) => s.country_of_origin);
  const byCategory = countBy(specs, (s) => s.category);
  const byEra = countBy(specs, (s) => s.era);

  // Treemap data for makes
  const treemapData = {
    name: "makes",
    children: byMake.slice(0, 15).map((m) => ({ name: m.id, value: m.value })),
  };

  // Radar: show profile averages
  const specsWithData = specs.filter((s) => s.horsepower && s.weight_lbs);
  const radarData = specsWithData.length > 0 ? [
    { stat: "Power", value: Math.round(specsWithData.reduce((s, sp) => s + (sp.horsepower || 0), 0) / specsWithData.length / 5) },
    { stat: "Weight", value: Math.round(specsWithData.reduce((s, sp) => s + (sp.weight_lbs || 0), 0) / specsWithData.length / 50) },
    { stat: "Displacement", value: Math.round(specs.filter((s) => s.displacement_liters).reduce((s, sp) => s + (Number(sp.displacement_liters) || 0), 0) / (specs.filter((s) => s.displacement_liters).length || 1) * 10) },
    { stat: "Rarity", value: Math.min(100, Math.round(100 - (specs.filter((s) => s.production_numbers).reduce((s, sp) => s + Math.min(sp.production_numbers || 100000, 100000), 0) / (specs.filter((s) => s.production_numbers).length || 1)) / 1000)) },
    { stat: "Value", value: Math.round(specs.filter((s) => s.original_msrp).reduce((s, sp) => s + (sp.original_msrp || 0), 0) / (specs.filter((s) => s.original_msrp).length || 1) / 500) },
  ] : [];

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

  // Leaderboard
  const leaderboardData = (() => {
    const items = regsWithSpecs.filter((r) => r.spec);
    if (leaderboard === "hp") return items.sort((a, b) => (b.spec?.horsepower || 0) - (a.spec?.horsepower || 0));
    if (leaderboard === "rare") return items.filter((r) => r.spec?.production_numbers && r.spec.production_numbers > 0).sort((a, b) => (a.spec?.production_numbers || Infinity) - (b.spec?.production_numbers || Infinity));
    return items.filter((r) => r.spec?.original_msrp && r.spec.original_msrp > 0).sort((a, b) => (b.spec?.original_msrp || 0) - (a.spec?.original_msrp || 0));
  })().slice(0, 10);

  const nivoTheme = {
    text: { fill: TEXT },
    axis: { ticks: { text: { fill: TEXT_DIM, fontSize: 11 } }, legend: { text: { fill: TEXT_DIM } } },
    grid: { line: { stroke: "rgba(255,255,255,0.06)" } },
    tooltip: { container: { background: SURFACE2, color: TEXT, fontSize: 13, borderRadius: 4, border: `1px solid ${GOLD_DIM}`, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" } },
    labels: { text: { fill: TEXT, fontSize: 11 } },
  };

  return (
    <div style={{ background: BG, margin: "-2rem", padding: "2rem", minHeight: "100vh", width: "calc(100% + 4rem)" }}>
      {/* ─── Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", fontWeight: 400, color: TEXT, margin: 0 }}>
            Analytics
          </h1>
          <p style={{ color: TEXT_DIM, fontSize: "0.85rem", marginTop: "0.3rem" }}>
            {specs.length}/{registrations.length} vehicles enriched
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {enrichResult && <span style={{ fontSize: "0.75rem", color: GOLD }}>{enrichResult}</span>}
          <button
            onClick={handleEnrichAll}
            disabled={enriching || specs.length >= registrations.length}
            style={{
              padding: "0.5rem 1.2rem",
              background: specs.length >= registrations.length ? SURFACE2 : `linear-gradient(135deg, ${GOLD}, #b8943f)`,
              color: specs.length >= registrations.length ? TEXT_DIM : BG,
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: enriching || specs.length >= registrations.length ? "default" : "pointer",
              opacity: enriching ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2C10 5.31 12.69 8 16 8C12.69 8 10 10.69 10 14C10 10.69 7.31 8 4 8C7.31 8 10 5.31 10 2Z"/><path d="M18 12C18 14.21 19.79 16 22 16C19.79 16 18 17.79 18 20C18 17.79 16.21 16 14 16C16.21 16 18 14.21 18 12Z"/></svg>
            {enriching ? "Working..." : specs.length >= registrations.length ? "All Enriched" : `Enrich ${registrations.length - specs.length} Vehicles`}
          </button>
        </div>
      </div>

      {/* ─── Hero Metrics ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "2rem" }}>
        {[
          { label: "Vehicles", value: registrations.length, suffix: "" },
          { label: "Unique Makes", value: uniqueMakes, suffix: "" },
          { label: "Combined HP", value: totalHp, suffix: "" },
          { label: "Total Tonnage", value: Math.round(totalWeight / 2000 * 10) / 10, suffix: "t" },
          { label: "Days to Show", value: Math.max(0, daysUntil), suffix: "" },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              background: SURFACE,
              padding: "1.5rem 1.25rem",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {i === 4 && (
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, transparent 60%, ${GOLD_DIM})` }} />
            )}
            <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.2em", color: i === 4 ? GOLD : TEXT_DIM, marginBottom: "0.5rem", position: "relative" }}>
              {m.label}
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: TEXT, lineHeight: 1, position: "relative" }}>
              <AnimatedNumber target={m.value} suffix={m.suffix} />
            </p>
          </div>
        ))}
      </div>

      {/* ─── Fun Stats Strip ─── */}
      {hasSpecs && (() => {
        const oldest = registrations.reduce((m, r) => r.vehicle_year < m.vehicle_year ? r : m, registrations[0]);
        const newest = registrations.reduce((m, r) => r.vehicle_year > m.vehicle_year ? r : m, registrations[0]);
        const mostPowerful = regsWithSpecs.reduce((m, r) => (r.spec?.horsepower || 0) > (m.spec?.horsepower || 0) ? r : m, regsWithSpecs[0]);
        const rarest = regsWithSpecs.filter((r) => r.spec?.production_numbers && r.spec.production_numbers > 0).sort((a, b) => (a.spec?.production_numbers || Infinity) - (b.spec?.production_numbers || Infinity))[0];

        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { label: "Oldest", car: `${oldest.vehicle_year} ${oldest.vehicle_make}`, detail: oldest.vehicle_model },
              { label: "Newest", car: `${newest.vehicle_year} ${newest.vehicle_make}`, detail: newest.vehicle_model },
              { label: "Most Powerful", car: mostPowerful.spec?.horsepower ? `${mostPowerful.vehicle_year} ${mostPowerful.vehicle_make}` : null, detail: mostPowerful.spec?.horsepower ? `${mostPowerful.vehicle_model} — ${mostPowerful.spec.horsepower} HP` : null },
              { label: "Rarest", car: rarest ? `${rarest.vehicle_year} ${rarest.vehicle_make}` : null, detail: rarest ? `${rarest.vehicle_model} — ${rarest.spec?.production_numbers?.toLocaleString()} built` : null },
              { label: "Sticker Total", car: totalMsrp > 0 ? `$${totalMsrp.toLocaleString()}` : null, detail: totalMsrp > 0 ? "combined original MSRP" : null },
            ].filter((s) => s.car).map((s) => (
              <div
                key={s.label}
                style={{
                  background: SURFACE,
                  borderLeft: `2px solid ${GOLD}`,
                  padding: "1rem 1.25rem",
                }}
              >
                <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", color: GOLD, marginBottom: "0.4rem" }}>{s.label}</p>
                <p style={{ fontSize: "0.95rem", color: TEXT, fontWeight: 500 }}>{s.car}</p>
                {s.detail && <p style={{ fontSize: "0.8rem", color: TEXT_DIM }}>{s.detail}</p>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ─── Charts Row 1: Treemap + Decade ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <ChartPanel title="By Make" subtitle={`${byMake.length} makes represented`}>
          <div style={{ height: 320 }}>
            <ResponsiveTreeMap
              data={treemapData}
              identity="name"
              value="value"
              label={(n) => `${n.id} (${n.formattedValue})`}
              labelSkipSize={40}
              theme={nivoTheme}
              colors={ACCENT_COLORS}
              borderWidth={2}
              borderColor={BG}
              nodeOpacity={0.9}
              labelTextColor="#fff"
              parentLabelTextColor="#fff"
              enableParentLabel={false}
            />
          </div>
        </ChartPanel>

        <ChartPanel title="By Decade">
          <div style={{ height: 320 }}>
            <ResponsiveBar
              data={byDecade.map((d) => ({ decade: d.id, count: d.value }))}
              keys={["count"]}
              indexBy="decade"
              theme={nivoTheme}
              colors={[GOLD]}
              borderRadius={3}
              padding={0.35}
              margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
              axisBottom={{ tickSize: 0, tickPadding: 8 }}
              axisLeft={{ tickSize: 0, tickPadding: 8 }}
              enableLabel={false}
              enableGridY={true}
              animate={true}
              motionConfig="gentle"
            />
          </div>
        </ChartPanel>
      </div>

      {/* ─── Charts Row 2: Color + Country ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <ChartPanel title="By Color">
          <div style={{ height: 280 }}>
            <ResponsivePie
              data={byColor.slice(0, 8)}
              theme={nivoTheme}
              colors={ACCENT_COLORS}
              innerRadius={0.55}
              padAngle={2}
              cornerRadius={4}
              margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
              arcLinkLabelsColor={{ from: "color" }}
              arcLinkLabelsTextColor={TEXT}
              arcLinkLabelsThickness={2}
              arcLabelsTextColor="#fff"
              animate={true}
              motionConfig="gentle"
            />
          </div>
        </ChartPanel>

        {hasSpecs && byCountry.length > 0 ? (
          <ChartPanel title="Country of Origin">
            <div style={{ height: 280 }}>
              <ResponsivePie
                data={byCountry}
                theme={nivoTheme}
                colors={["#c9a84c", "#e8845c", "#5b9bd5", "#7bc67e", "#c084fc", "#f472b6"]}
                margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                arcLinkLabelsColor={{ from: "color" }}
                arcLinkLabelsTextColor={TEXT}
                arcLinkLabelsThickness={2}
                arcLabelsTextColor="#fff"
                padAngle={1}
                cornerRadius={3}
                animate={true}
                motionConfig="gentle"
              />
            </div>
          </ChartPanel>
        ) : (
          <ChartPanel title="By State">
            <div style={{ height: 280 }}>
              <ResponsiveBar
                data={countBy(registrations, (r) => r.address_state?.toUpperCase().trim()).slice(0, 8).map((d) => ({ state: d.id, count: d.value }))}
                keys={["count"]}
                indexBy="state"
                theme={nivoTheme}
                colors={["#5b9bd5"]}
                borderRadius={3}
                padding={0.4}
                margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                enableLabel={false}
                animate={true}
                motionConfig="gentle"
              />
            </div>
          </ChartPanel>
        )}
      </div>

      {/* ─── Enriched Section ─── */}
      {hasSpecs && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", marginTop: "0.5rem" }}>
            <div style={{ height: "1px", flex: 1, background: `linear-gradient(to right, transparent, ${GOLD}40, transparent)` }} />
            <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.2em", color: GOLD }}>Vehicle Intelligence</span>
            <div style={{ height: "1px", flex: 1, background: `linear-gradient(to right, transparent, ${GOLD}40, transparent)` }} />
          </div>

          {/* Row 3: Category + Era + Radar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <ChartPanel title="Category">
              <div style={{ height: 280 }}>
                <ResponsiveBar
                  data={byCategory.slice(0, 6).map((d) => ({ cat: d.id, count: d.value }))}
                  keys={["count"]}
                  indexBy="cat"
                  layout="horizontal"
                  theme={nivoTheme}
                  colors={["#c084fc"]}
                  borderRadius={3}
                  padding={0.35}
                  margin={{ top: 5, right: 15, bottom: 5, left: 100 }}
                  axisBottom={null}
                  axisLeft={{ tickSize: 0, tickPadding: 8 }}
                  enableLabel={true}
                  labelTextColor="#fff"
                  animate={true}
                  motionConfig="gentle"
                />
              </div>
            </ChartPanel>

            <ChartPanel title="Era">
              <div style={{ height: 280 }}>
                <ResponsiveBar
                  data={byEra.map((d) => ({ era: d.id, count: d.value }))}
                  keys={["count"]}
                  indexBy="era"
                  theme={nivoTheme}
                  colors={["#7bc67e"]}
                  borderRadius={3}
                  padding={0.35}
                  margin={{ top: 10, right: 10, bottom: 60, left: 40 }}
                  axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -25 }}
                  axisLeft={{ tickSize: 0, tickPadding: 8 }}
                  enableLabel={false}
                  animate={true}
                  motionConfig="gentle"
                />
              </div>
            </ChartPanel>

            {radarData.length > 0 && (
              <ChartPanel title="Show Profile" subtitle="Average across all vehicles">
                <div style={{ height: 280 }}>
                  <ResponsiveRadar
                    data={radarData}
                    keys={["value"]}
                    indexBy="stat"
                    theme={nivoTheme}
                    colors={[GOLD]}
                    fillOpacity={0.2}
                    borderWidth={2}
                    borderColor={GOLD}
                    dotSize={8}
                    dotColor={GOLD}
                    dotBorderWidth={0}
                    gridLevels={4}
                    gridShape="linear"
                    margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
                    animate={true}
                    motionConfig="gentle"
                  />
                </div>
              </ChartPanel>
            )}
          </div>

          {/* Row 4: HP Distribution */}
          {hpBuckets.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <ChartPanel title="Horsepower Distribution">
                <div style={{ height: 220 }}>
                  <ResponsiveBar
                    data={hpBuckets.map((d) => ({ hp: d.id, count: d.value }))}
                    keys={["count"]}
                    indexBy="hp"
                    theme={nivoTheme}
                    colors={["#e8845c"]}
                    borderRadius={3}
                    padding={0.3}
                    margin={{ top: 10, right: 20, bottom: 40, left: 40 }}
                    axisBottom={{ tickSize: 0, tickPadding: 8, legend: "Horsepower Range", legendPosition: "middle", legendOffset: 32 }}
                    axisLeft={{ tickSize: 0, tickPadding: 8, legend: "Vehicles", legendPosition: "middle", legendOffset: -32 }}
                    enableLabel={true}
                    labelTextColor="#fff"
                    animate={true}
                    motionConfig="gentle"
                  />
                </div>
              </ChartPanel>
            </div>
          )}

          {/* ─── Vehicle Leaderboard ─── */}
          <ChartPanel
            title="Vehicle Leaderboard"
            headerRight={
              <div style={{ display: "flex", gap: "0" }}>
                {([["hp", "Power"], ["rare", "Rarest"], ["value", "Value"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setLeaderboard(key)}
                    style={{
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      border: "none",
                      cursor: "pointer",
                      background: leaderboard === key ? GOLD : SURFACE2,
                      color: leaderboard === key ? BG : TEXT_DIM,
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th style={thDark}>#</th>
                  <th style={thDark}>Vehicle</th>
                  <th style={thDark}>Category</th>
                  <th style={{ ...thDark, textAlign: "right" }}>
                    {leaderboard === "hp" ? "Horsepower" : leaderboard === "rare" ? "Production" : "Original MSRP"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((r, i) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/admin/registrations/${r.id}`)}
                    style={{ borderBottom: `1px solid ${SURFACE2}`, cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ ...tdDark, color: i < 3 ? GOLD : TEXT_DIM, fontWeight: 700, width: "40px" }}>
                      {i + 1}
                    </td>
                    <td style={tdDark}>
                      <span style={{ color: TEXT }}>{r.vehicle_year} {r.vehicle_make} {r.vehicle_model}</span>
                      <span style={{ color: TEXT_DIM, marginLeft: "0.5rem", fontSize: "0.75rem" }}>#{r.car_number}</span>
                    </td>
                    <td style={{ ...tdDark, color: TEXT_DIM }}>{r.spec?.category || "—"}</td>
                    <td style={{ ...tdDark, textAlign: "right", fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: TEXT }}>
                      {leaderboard === "hp" ? `${r.spec?.horsepower?.toLocaleString() || "—"} HP` :
                       leaderboard === "rare" ? `${r.spec?.production_numbers?.toLocaleString() || "—"}` :
                       r.spec?.original_msrp ? `$${r.spec.original_msrp.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
                {leaderboardData.length === 0 && (
                  <tr><td colSpan={4} style={{ ...tdDark, textAlign: "center", color: TEXT_DIM }}>No data yet — enrich vehicles first</td></tr>
                )}
              </tbody>
            </table>
          </ChartPanel>
        </>
      )}

      {/* Full bleed + Responsive */}
      <style>{`
        .admin-content > div {
          max-width: none !important;
        }
        @media (max-width: 1100px) {
          [style*="grid-template-columns: 3fr 2fr"],
          [style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          [style*="grid-template-columns: repeat(5, 1fr)"],
          [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Components ───

function ChartPanel({ title, subtitle, children, headerRight }: { title: string; subtitle?: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid rgba(255,255,255,0.06)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, color: TEXT, margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: "0.7rem", color: TEXT_DIM, marginTop: "0.15rem" }}>{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      <div style={{ padding: "1rem 0.75rem" }}>{children}</div>
    </div>
  );
}

const thDark: React.CSSProperties = {
  padding: "0.6rem 1rem",
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: TEXT_DIM,
  textAlign: "left",
  borderBottom: `1px solid ${SURFACE2}`,
};

const tdDark: React.CSSProperties = {
  padding: "0.7rem 1rem",
};
