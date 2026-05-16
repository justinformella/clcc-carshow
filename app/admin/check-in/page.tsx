"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

type CarIdentification = {
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  confidence: number;
  notes: string;
};

export default function CheckInPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Photo check-in state
  const [identifying, setIdentifying] = useState(false);
  const [carId, setCarId] = useState<CarIdentification | null>(null);
  const [photoMatches, setPhotoMatches] = useState<Registration[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .in("payment_status", ["paid", "comped", "pending"])
      .order("car_number", { ascending: true });

    setRegistrations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async (reg: Registration) => {
    const supabase = createClient();
    const newCheckedIn = !reg.checked_in;

    const { error } = await supabase
      .from("registrations")
      .update({
        checked_in: newCheckedIn,
        checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      })
      .eq("id", reg.id);

    if (!error) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === reg.id
            ? {
                ...r,
                checked_in: newCheckedIn,
                checked_in_at: newCheckedIn
                  ? new Date().toISOString()
                  : null,
              }
            : r
        )
      );
    }
  };

  // Fuzzy match registrations against AI-identified car
  const findMatches = (id: CarIdentification): Registration[] => {
    if (!id.make && !id.model) return [];

    const normalize = (s: string) => s.toLowerCase().replace(/[-_]/g, " ").trim();
    const idMake = normalize(id.make || "");
    const idModel = normalize(id.model || "");
    const idColor = normalize(id.color || "");
    const idYear = id.year;

    // Common name aliases
    const aliases: Record<string, string[]> = {
      chevrolet: ["chevy"], mercedes: ["mercedes-benz", "mb"], volkswagen: ["vw"],
      porsche: ["porche"], bmw: ["bimmer"], "harley-davidson": ["harley"],
    };

    const makeMatches = (regMake: string) => {
      const rm = normalize(regMake);
      if (rm.includes(idMake) || idMake.includes(rm)) return true;
      for (const [key, alts] of Object.entries(aliases)) {
        if ((rm.includes(key) || alts.some((a) => rm.includes(a))) &&
            (idMake.includes(key) || alts.some((a) => idMake.includes(a)))) return true;
      }
      return false;
    };

    return registrations
      .filter((r) => !r.checked_in)
      .map((r) => {
        let score = 0;
        if (makeMatches(r.vehicle_make)) score += 40;
        if (normalize(r.vehicle_model).includes(idModel) || idModel.includes(normalize(r.vehicle_model))) score += 30;
        if (idYear && Math.abs(r.vehicle_year - idYear) <= 2) score += 20;
        if (idYear && r.vehicle_year === idYear) score += 10;
        if (idColor && r.vehicle_color && normalize(r.vehicle_color).includes(idColor)) score += 10;
        return { reg: r, score };
      })
      .filter((m) => m.score >= 40)
      .sort((a, b) => b.score - a.score)
      .map((m) => m.reg);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    setPhotoPreview(URL.createObjectURL(file));
    setIdentifying(true);
    setCarId(null);
    setPhotoMatches([]);

    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/identify-car", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.make) {
        setCarId(data);
        setPhotoMatches([]);
      } else {
        setCarId(data);
        setPhotoMatches(findMatches(data));
      }
    } catch {
      setCarId({ year: null, make: null, model: null, color: null, confidence: 0, notes: "Failed to identify" });
    } finally {
      setIdentifying(false);
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };

  const dismissPhotoResults = () => {
    setCarId(null);
    setPhotoMatches([]);
    setPhotoPreview(null);
  };

  const filtered = registrations.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(s) ||
      String(r.car_number).includes(s) ||
      `${r.vehicle_year} ${r.vehicle_make} ${r.vehicle_model}`
        .toLowerCase()
        .includes(s)
    );
  });

  const checkedInCount = registrations.filter((r) => r.checked_in).length;

  if (loading) {
    return (
      <p
        style={{
          color: "var(--text-light)",
          textAlign: "center",
          padding: "3rem",
        }}
      >
        Loading...
      </p>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            fontWeight: 400,
          }}
        >
          Check-In
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--white)",
            padding: "0.8rem 1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.5rem",
          }}
        >
          <span style={{ color: "var(--gold)" }}>{checkedInCount}</span>
          <span style={{ color: "var(--text-light)", fontSize: "1rem" }}>/</span>
          <span style={{ color: "var(--charcoal)" }}>
            {registrations.length}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-light)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginLeft: "0.5rem",
            }}
          >
            checked in
          </span>
        </div>
      </div>

      {/* Search + Camera */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search by name, car number, or vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            padding: "1rem 1.5rem",
            border: "2px solid var(--gold)",
            fontSize: "1.1rem",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
          }}
        />
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={identifying}
          style={{
            padding: "0.75rem 1.25rem",
            background: identifying ? "#ccc" : "var(--charcoal)",
            color: "#fff",
            border: "none",
            fontSize: "1.5rem",
            cursor: identifying ? "not-allowed" : "pointer",
            flexShrink: 0,
            lineHeight: 1,
          }}
          title="Photo check-in"
        >
          {identifying ? "..." : "📷"}
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handlePhoto}
        />
      </div>

      {/* Photo Check-In Results */}
      {(carId || identifying) && (
        <div style={{
          background: "var(--white)",
          border: "2px solid var(--gold)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 400, margin: 0 }}>
              {identifying ? "Identifying..." : "Photo Check-In"}
            </h2>
            {!identifying && (
              <button onClick={dismissPhotoResults} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-light)", padding: "0" }}>✕</button>
            )}
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Photo preview */}
            {photoPreview && (
              <img src={photoPreview} alt="Car photo" style={{ width: "200px", height: "150px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
            )}

            <div style={{ flex: 1, minWidth: "200px" }}>
              {identifying ? (
                <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>Analyzing photo with AI...</p>
              ) : carId && carId.make ? (
                <>
                  <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-light)", marginBottom: "0.3rem" }}>AI Identified</p>
                  <p style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--charcoal)", marginBottom: "0.25rem" }}>
                    {carId.year ? `${carId.year} ` : ""}{carId.make} {carId.model}
                  </p>
                  {carId.color && <p style={{ fontSize: "0.9rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>{carId.color}</p>}
                  {carId.notes && <p style={{ fontSize: "0.8rem", color: "var(--text-light)", fontStyle: "italic" }}>{carId.notes}</p>}
                  <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.5rem" }}>
                    Confidence: {Math.round((carId.confidence || 0) * 100)}%
                  </p>
                </>
              ) : (
                <p style={{ color: "#c62828", fontSize: "0.9rem" }}>Could not identify a car in this photo. Try another angle.</p>
              )}
            </div>
          </div>

          {/* Matches */}
          {!identifying && photoMatches.length > 0 && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
              <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-light)", marginBottom: "0.75rem" }}>
                {photoMatches.length} match{photoMatches.length !== 1 ? "es" : ""} found — tap to check in
              </p>
              {photoMatches.map((r) => (
                <div
                  key={r.id}
                  onClick={async () => { await handleCheckIn(r); dismissPhotoResults(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 1rem",
                    marginBottom: "0.5rem",
                    background: "#f8f5f0",
                    cursor: "pointer",
                    border: "1px solid #e0e0e0",
                    transition: "background 0.15s",
                  }}
                >
                  {r.ai_image_url && (
                    <img src={r.ai_image_url} alt="" style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "3px", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--charcoal)" }}>
                      <span style={{ color: "var(--gold)" }}>#{r.car_number}</span>{" "}
                      {r.vehicle_year} {r.vehicle_make} {r.vehicle_model}
                      {r.vehicle_color ? ` — ${r.vehicle_color}` : ""}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                      {r.first_name} {r.last_name}
                    </p>
                  </div>
                  <span style={{
                    padding: "0.4rem 1rem",
                    background: "var(--gold)",
                    color: "var(--charcoal)",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}>
                    Check In
                  </span>
                </div>
              ))}
            </div>
          )}

          {!identifying && carId?.make && photoMatches.length === 0 && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
              <p style={{ color: "#e65100", fontSize: "0.9rem" }}>
                No matching registrations found for this vehicle.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Registration Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "1rem",
        }}
      >
        {filtered.map((reg) => {
          const isUnpaid = reg.payment_status === "pending";
          return (
            <div
              key={reg.id}
              className="checkin-card"
              style={{
                background: "var(--white)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                borderLeft: `4px solid ${
                  reg.checked_in ? "#4caf50" : "var(--gold)"
                }`,
                opacity: reg.checked_in ? 0.7 : 1,
                overflow: "hidden",
              }}
            >
              {/* Thumbnail */}
              {reg.ai_image_url ? (
                <img
                  src={reg.ai_image_url}
                  className="checkin-thumb"
                  alt={`${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`}
                  style={{
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  className="checkin-thumb"
                  style={{
                    background: "var(--cream)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-light)",
                    fontSize: "0.8rem",
                  }}
                >
                  No image
                </div>
              )}

              {/* Card body */}
              <div className="checkin-body" style={{ padding: "1rem 1.25rem 1.25rem" }}>
                {/* Unpaid banner */}
                {isUnpaid && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      color: "#b91c1c",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      padding: "0.35rem 0.75rem",
                      marginBottom: "0.75rem",
                      textAlign: "center",
                    }}
                  >
                    Payment not received
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.8rem",
                  }}
                >
                  <div
                    onClick={() => router.push(`/admin/registrations/${reg.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <p
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1.3rem",
                        color: "var(--charcoal)",
                      }}
                    >
                      #{reg.car_number}{" "}
                      <span style={{ fontSize: "1rem" }}>
                        {reg.first_name} {reg.last_name}
                      </span>
                    </p>
                    <p
                      style={{
                        color: "var(--text-light)",
                        fontSize: "0.9rem",
                        marginTop: "0.3rem",
                      }}
                    >
                      {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                      {reg.vehicle_color ? ` — ${reg.vehicle_color}` : ""}
                    </p>
                    {reg.award_category && (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--gold)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {reg.award_category}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCheckIn(reg)}
                    style={{
                      padding: "0.8rem 1.5rem",
                      background: reg.checked_in ? "#e8f5e9" : "var(--gold)",
                      color: reg.checked_in ? "#2e7d32" : "var(--charcoal)",
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      minWidth: "110px",
                    }}
                  >
                    {reg.checked_in ? "Undo" : "Check In"}
                  </button>
                </div>
                {reg.checked_in && reg.checked_in_at && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#4caf50",
                    }}
                  >
                    Checked in at{" "}
                    {new Date(reg.checked_in_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-light)", gridColumn: "1 / -1" }}>
            {search ? "No matching registrations" : "No registrations found"}
          </p>
        )}
      </div>
    </>
  );
}
