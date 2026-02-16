"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

type GravatarProfile = {
  hash: string;
  display_name: string;
  profile_url: string;
  avatar_url: string;
  avatar_alt_text: string;
  location: string;
  description: string;
  job_title: string;
  company: string;
  verified_accounts: { service_type: string; service_label: string; url: string }[];
};

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function AttendeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const email = decodeURIComponent(params.email as string);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [gravatar, setGravatar] = useState<GravatarProfile | null>(null);
  const [gravatarLoading, setGravatarLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .ilike("email", email)
        .in("payment_status", ["paid", "pending"])
        .order("car_number", { ascending: true });
      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, [email]);

  useEffect(() => {
    const fetchGravatar = async () => {
      try {
        const hash = await sha256(email);
        const res = await fetch(`https://api.gravatar.com/v3/profiles/${hash}`);
        if (res.ok) {
          const data = await res.json();
          setGravatar(data);
        } else {
          setGravatar(null);
        }
      } catch {
        setGravatar(null);
      }
      setGravatarLoading(false);
    };
    fetchGravatar();
  }, [email]);

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

  if (registrations.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-light)", marginBottom: "1rem" }}>
          No registrations found for this attendee.
        </p>
        <button
          onClick={() => router.push("/admin/attendees")}
          style={{
            padding: "0.6rem 1.5rem",
            background: "var(--charcoal)",
            color: "var(--white)",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Back to Attendees
        </button>
      </div>
    );
  }

  const first = registrations[0];
  const name = `${first.first_name} ${first.last_name}`;
  const totalPaid = registrations.reduce(
    (sum, r) => sum + (r.amount_paid || 0),
    0
  );
  const checkedInCount = registrations.filter((r) => r.checked_in).length;

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/attendees")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-light)",
          fontSize: "0.85rem",
          cursor: "pointer",
          padding: "0",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Attendees
      </button>

      {/* Attendee info card */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: "1.5rem 2rem",
          marginBottom: "2rem",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.75rem",
            fontWeight: 400,
            marginBottom: "1rem",
          }}
        >
          {name}
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <InfoItem label="Email" value={email} />
          <InfoItem label="Phone" value={first.phone || "\u2014"} />
          <InfoItem label="Hometown" value={first.hometown || "\u2014"} />
          <InfoItem
            label="Total Paid"
            value={`$${(totalPaid / 100).toLocaleString()}`}
          />
          <InfoItem
            label="Vehicles"
            value={`${registrations.length}`}
          />
          <InfoItem
            label="Check-In"
            value={`${checkedInCount}/${registrations.length} checked in`}
          />
        </div>
      </div>

      {/* Gravatar profile card */}
      {!gravatarLoading && gravatar && (
        <div
          style={{
            background: "var(--white)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            padding: "1.5rem 2rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.1rem",
              fontWeight: 400,
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            Profile
          </h2>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
            {/* Avatar */}
            {gravatar.avatar_url ? (
              <img
                src={gravatar.avatar_url}
                alt={gravatar.avatar_alt_text || gravatar.display_name}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "var(--cream)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  fontFamily: "'Playfair Display', serif",
                  color: "var(--text-light)",
                  flexShrink: 0,
                }}
              >
                {(gravatar.display_name || email)[0].toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {gravatar.display_name && (
                <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                  {gravatar.display_name}
                </p>
              )}
              {gravatar.description && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "0.5rem", lineHeight: 1.5 }}>
                  {gravatar.description}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.85rem", color: "var(--charcoal)" }}>
                {(gravatar.job_title || gravatar.company) && (
                  <span>
                    {gravatar.job_title}
                    {gravatar.job_title && gravatar.company && " at "}
                    {gravatar.company && <strong>{gravatar.company}</strong>}
                  </span>
                )}
                {gravatar.location && (
                  <span style={{ color: "var(--text-light)" }}>{gravatar.location}</span>
                )}
              </div>
            </div>
          </div>

          {/* Verified accounts */}
          {gravatar.verified_accounts && gravatar.verified_accounts.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {gravatar.verified_accounts.map((account) => (
                <a
                  key={account.url}
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "#f0f0f0",
                    color: "var(--charcoal)",
                    textDecoration: "none",
                  }}
                >
                  {account.service_label}
                </a>
              ))}
            </div>
          )}

          {/* Gravatar profile link */}
          {gravatar.profile_url && (
            <div style={{ marginTop: "0.75rem" }}>
              <a
                href={gravatar.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--gold)",
                  textDecoration: "none",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                View Gravatar Profile &rarr;
              </a>
            </div>
          )}
        </div>
      )}

      {/* Vehicles section */}
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.25rem",
          fontWeight: 400,
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          marginBottom: "1.25rem",
        }}
      >
        Vehicles
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {registrations.map((reg) => (
          <div
            key={reg.id}
            style={{
              background: "var(--white)",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Vehicle image */}
            {reg.ai_image_url ? (
              <img
                src={reg.ai_image_url}
                alt={`${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}`}
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "200px",
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

            {/* Vehicle details */}
            <div style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem" }}>
                  <span style={{ color: "var(--gold)" }}>#{reg.car_number}</span>{" "}
                  {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
                  {reg.vehicle_color ? ` \u2014 ${reg.vehicle_color}` : ""}
                </span>
                <PaymentBadge status={reg.payment_status} />
              </div>

              {/* Check-in status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.2rem 0.6rem",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    background: reg.checked_in ? "#e8f5e9" : "#f5f5f5",
                    color: reg.checked_in ? "#2e7d32" : "#616161",
                  }}
                >
                  {reg.checked_in ? "Checked In" : "Not Checked In"}
                </span>
                {reg.checked_in && reg.checked_in_at && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-light)",
                    }}
                  >
                    {new Date(reg.checked_in_at).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Link to full registration */}
              <Link
                href={`/admin/registrations/${reg.id}`}
                style={{
                  fontSize: "0.8rem",
                  color: "var(--gold)",
                  textDecoration: "none",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                View Full Details &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-light)",
          marginBottom: "0.2rem",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "0.95rem", color: "var(--charcoal)" }}>{value}</p>
    </div>
  );
}

function PaymentBadge({
  status,
}: {
  status: Registration["payment_status"];
}) {
  const config: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
    pending: { label: "Unpaid", bg: "#fff3e0", color: "#e65100" },
    refunded: { label: "Refunded", bg: "#fce4ec", color: "#c62828" },
    archived: { label: "Archived", bg: "#f5f5f5", color: "#616161" },
  };
  const { label, bg, color } = config[status] || config.pending;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}
