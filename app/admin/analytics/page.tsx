"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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

const CHART_COLORS = ["#c9a84c", "#2c2c2c", "#3b82f6", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#64748b", "#be185d", "#854d0e", "#4f46e5"];

function countBy<T>(items: T[], fn: (item: T) => string | null | undefined): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = fn(item) || "Unknown";
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getDecade(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

export default function AnalyticsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [regRes, specRes] = await Promise.all([
        supabase
          .from("registrations")
          .select("*")
          .in("payment_status", ["paid", "comped"])
          .order("car_number", { ascending: true }),
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
      setEnrichResult(`Enriched ${data.enriched} of ${data.total} vehicles${data.errors ? ` (${data.errors.length} errors)` : ""}`);
      // Refresh specs
      const supabase = createClient();
      const { data: newSpecs } = await supabase.from("vehicle_specs").select("*");
      setSpecs((newSpecs as VehicleSpec[]) || []);
    } catch {
      setEnrichResult("Failed to enrich");
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>Loading...</p>;
  }

  const specMap = new Map(specs.map((s) => [s.registration_id, s]));
  const regsWithSpecs = registrations.map((r) => ({ ...r, spec: specMap.get(r.id) }));
  const hasSpecs = specs.length > 0;

  // Basic analytics from registration data
  const byMake = countBy(registrations, (r) => r.vehicle_make?.trim());
  const byDecade = countBy(registrations, (r) => getDecade(r.vehicle_year)).sort((a, b) => a.name.localeCompare(b.name));
  const byColor = countBy(registrations, (r) => r.vehicle_color?.trim() || null);
  const byState = countBy(registrations, (r) => r.address_state?.toUpperCase().trim());

  // Enriched analytics
  const byCountry = countBy(specs, (s) => s.country_of_origin);
  const byCategory = countBy(specs, (s) => s.category);
  const byBodyStyle = countBy(specs, (s) => s.body_style);
  const byCylinders = countBy(specs, (s) => s.cylinders != null ? `${s.cylinders} cyl` : null).sort((a, b) => {
    const aNum = parseInt(a.name);
    const bNum = parseInt(b.name);
    return (isNaN(aNum) ? 99 : aNum) - (isNaN(bNum) ? 99 : bNum);
  });
  const byEra = countBy(specs, (s) => s.era);

  // Fun stats
  const oldest = registrations.reduce((min, r) => r.vehicle_year < min.vehicle_year ? r : min, registrations[0]);
  const newest = registrations.reduce((max, r) => r.vehicle_year > max.vehicle_year ? r : max, registrations[0]);
  const uniqueMakes = new Set(registrations.map((r) => r.vehicle_make?.trim().toLowerCase())).size;
  const avgYear = Math.round(registrations.reduce((sum, r) => sum + r.vehicle_year, 0) / registrations.length);

  const specsWithHp = specs.filter((s) => s.horsepower && s.horsepower > 0);
  const totalHp = specsWithHp.reduce((sum, s) => sum + (s.horsepower || 0), 0);
  const mostPowerful = specsWithHp.length > 0
    ? regsWithSpecs.reduce((max, r) => (r.spec?.horsepower || 0) > (max.spec?.horsepower || 0) ? r : max, regsWithSpecs[0])
    : null;
  const totalWeight = specs.filter((s) => s.weight_lbs).reduce((sum, s) => sum + (s.weight_lbs || 0), 0);
  const totalMsrp = specs.filter((s) => s.original_msrp).reduce((sum, s) => sum + (s.original_msrp || 0), 0);
  const rarest = specs.filter((s) => s.production_numbers && s.production_numbers > 0)
    .sort((a, b) => (a.production_numbers || Infinity) - (b.production_numbers || Infinity))[0];
  const rarestReg = rarest ? registrations.find((r) => r.id === rarest.registration_id) : null;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400 }}>
          Analytics
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {enrichResult && (
            <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{enrichResult}</span>
          )}
          <button
            onClick={handleEnrichAll}
            disabled={enriching}
            style={{
              padding: "0.6rem 1.5rem",
              background: enriching ? "#ccc" : "var(--charcoal)",
              color: enriching ? "#999" : "var(--gold)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: enriching ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 2C10 5.31371 12.6863 8 16 8C12.6863 8 10 10.6863 10 14C10 10.6863 7.31371 8 4 8C7.31371 8 10 5.31371 10 2Z"/><path d="M18 12C18 14.2091 19.7909 16 22 16C19.7909 16 18 17.7909 18 20C18 17.7909 16.2091 16 14 16C16.2091 16 18 14.2091 18 12Z"/></svg>
            {enriching ? "Enriching..." : `Enrich Specs (${registrations.length - specs.length} remaining)`}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <SummaryCard label="Vehicles" value={`${registrations.length}`} />
        <SummaryCard label="Unique Makes" value={`${uniqueMakes}`} />
        <SummaryCard label="Average Year" value={`${avgYear}`} />
        <SummaryCard label="Most Common" value={byMake[0]?.name || "—"} note={byMake[0] ? `${byMake[0].value} vehicles` : ""} />
        {hasSpecs && totalHp > 0 && <SummaryCard label="Total Horsepower" value={totalHp.toLocaleString()} note="combined" />}
        {hasSpecs && totalWeight > 0 && <SummaryCard label="Total Weight" value={`${Math.round(totalWeight / 2000)} tons`} note={`${totalWeight.toLocaleString()} lbs`} />}
      </div>

      {/* Fun stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {oldest && (
          <FunStat label="Oldest Vehicle" value={`${oldest.vehicle_year} ${oldest.vehicle_make} ${oldest.vehicle_model}`} />
        )}
        {newest && (
          <FunStat label="Newest Vehicle" value={`${newest.vehicle_year} ${newest.vehicle_make} ${newest.vehicle_model}`} />
        )}
        {mostPowerful?.spec?.horsepower && (
          <FunStat label="Most Powerful" value={`${mostPowerful.vehicle_year} ${mostPowerful.vehicle_make} ${mostPowerful.vehicle_model}`} note={`${mostPowerful.spec.horsepower} HP`} />
        )}
        {rarestReg && rarest && (
          <FunStat label="Rarest Vehicle" value={`${rarestReg.vehicle_year} ${rarestReg.vehicle_make} ${rarestReg.vehicle_model}`} note={`${rarest.production_numbers?.toLocaleString()} produced`} />
        )}
        {hasSpecs && totalMsrp > 0 && (
          <FunStat label="Total Original Sticker" value={`$${totalMsrp.toLocaleString()}`} note="combined original MSRP" />
        )}
      </div>

      {/* Charts row 1: Make + Decade */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <ChartCard title="By Make">
          <ResponsiveContainer width="100%" height={Math.max(200, byMake.length * 32)}>
            <BarChart data={byMake} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#c9a84c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Decade">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byDecade} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2c2c2c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2: Color + State */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <ChartCard title="By Color">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byColor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                {byColor.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By State">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byState.slice(0, 10)} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Enriched charts */}
      {hasSpecs && (
        <>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 400, paddingBottom: "0.5rem", borderBottom: "1px solid rgba(0,0,0,0.1)", marginBottom: "1.25rem", marginTop: "1rem" }}>
            Vehicle Intelligence
            <span style={{ fontSize: "0.8rem", color: "var(--text-light)", fontFamily: "'Inter', sans-serif", fontWeight: 400, marginLeft: "0.75rem" }}>
              {specs.length}/{registrations.length} vehicles enriched
            </span>
          </h2>

          {/* Row 3: Country + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <ChartCard title="By Country of Origin">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={byCountry} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                    {byCountry.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By Category">
              <ResponsiveContainer width="100%" height={Math.max(200, byCategory.length * 32)}>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#9333ea" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 4: Body Style + Cylinders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <ChartCard title="By Body Style">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={byBodyStyle} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                    {byBodyStyle.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By Cylinders">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCylinders} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 5: Era + Horsepower */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <ChartCard title="By Era">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byEra} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {specsWithHp.length > 0 && (
              <ChartCard title="Horsepower Distribution">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={(() => {
                      const buckets: Record<string, number> = {};
                      for (const s of specsWithHp) {
                        const hp = s.horsepower || 0;
                        const bucket = hp < 100 ? "< 100" : hp < 200 ? "100-199" : hp < 300 ? "200-299" : hp < 400 ? "300-399" : hp < 500 ? "400-499" : "500+";
                        buckets[bucket] = (buckets[bucket] || 0) + 1;
                      }
                      return ["< 100", "100-199", "200-299", "300-399", "400-499", "500+"]
                        .filter((b) => buckets[b])
                        .map((name) => ({ name, value: buckets[name] }));
                    })()}
                    margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 899px) {
          [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "1.25rem" }}>
      <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-light)", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "var(--charcoal)" }}>{value}</p>
      {note && <p style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>{note}</p>}
    </div>
  );
}

function FunStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ background: "var(--charcoal)", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--gold)" }}>{label}</p>
      <p style={{ fontSize: "1rem", color: "var(--white)", fontWeight: 500 }}>{value}</p>
      {note && <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{note}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "1.25rem" }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
