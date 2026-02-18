"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Registration } from "@/types/database";

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

type Attendee = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  addressCity: string | null;
  addressState: string | null;
  vehicles: Registration[];
  totalPaid: number;
  checkedInCount: number;
};

function groupByEmail(registrations: Registration[]): Attendee[] {
  const map = new Map<string, Registration[]>();
  for (const reg of registrations) {
    const key = reg.email.toLowerCase();
    const list = map.get(key) || [];
    list.push(reg);
    map.set(key, list);
  }

  const attendees = Array.from(map.entries()).map(([email, vehicles]) => {
    const first = vehicles[0];
    return {
      email,
      firstName: first.first_name,
      lastName: first.last_name,
      phone: first.phone,
      addressCity: first.address_city,
      addressState: first.address_state,
      vehicles,
      totalPaid: vehicles.reduce((sum, v) => sum + (v.amount_paid || 0) + (v.donation_cents || 0), 0),
      checkedInCount: vehicles.filter((v) => v.checked_in).length,
    };
  });

  attendees.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return attendees;
}

export default function AttendeesPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .in("payment_status", ["paid", "pending"])
        .order("created_at", { ascending: true });
      setRegistrations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const attendees = groupByEmail(registrations);

  const filtered = attendees.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (`${a.firstName} ${a.lastName}`.toLowerCase().includes(q)) return true;
    if (`${a.lastName}, ${a.firstName}`.toLowerCase().includes(q)) return true;
    if (a.email.includes(q)) return true;
    for (const v of a.vehicles) {
      if (
        `${v.vehicle_year} ${v.vehicle_make} ${v.vehicle_model}`
          .toLowerCase()
          .includes(q)
      )
        return true;
    }
    return false;
  });

  const totalVehicles = attendees.reduce((s, a) => s + a.vehicles.length, 0);
  const fullyCheckedIn = attendees.filter(
    (a) => a.checkedInCount === a.vehicles.length
  ).length;

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
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "1.5rem",
        }}
      >
        Attendees ({filtered.length})
      </h1>

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard label="Attendees" value={`${attendees.length}`} />
        <StatCard label="Total Vehicles" value={`${totalVehicles}`} />
        <StatCard
          label="Fully Checked In"
          value={`${fullyCheckedIn}`}
          note={`of ${attendees.length}`}
        />
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search name, email, or vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--white)",
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ background: "var(--cream)", textAlign: "left" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Vehicles</th>
              <th style={thStyle}>Total Paid</th>
              <th style={thStyle}>Check-In</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.email}
                onClick={() =>
                  router.push(
                    `/admin/attendees/${encodeURIComponent(a.email)}`
                  )
                }
                style={{
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--cream)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "")
                }
              >
                <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AvatarImg email={a.email} firstName={a.firstName} lastName={a.lastName} />
                  {a.lastName}, {a.firstName}
                </td>
                <td style={tdStyle}>{a.email}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: "#e3f2fd",
                      color: "#1565c0",
                    }}
                  >
                    {a.vehicles.length}{" "}
                    {a.vehicles.length === 1 ? "vehicle" : "vehicles"}
                  </span>
                </td>
                <td style={tdStyle}>
                  ${(a.totalPaid / 100).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  <CheckInBadge
                    checkedIn={a.checkedInCount}
                    total={a.vehicles.length}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-light)",
                  }}
                >
                  No attendees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: "1rem 1.25rem",
      }}
    >
      <p
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-light)",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.8rem",
          color: "var(--charcoal)",
        }}
      >
        {value}
      </p>
      {note && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function CheckInBadge({
  checkedIn,
  total,
}: {
  checkedIn: number;
  total: number;
}) {
  const allDone = checkedIn === total;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        background: allDone ? "#e8f5e9" : "#fff3e0",
        color: allDone ? "#2e7d32" : "#e65100",
      }}
    >
      {checkedIn}/{total} checked in
    </span>
  );
}

function getInitialsColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#1565c0", "#2e7d32", "#c62828", "#6a1b9a",
    "#ef6c00", "#00838f", "#4527a0", "#ad1457",
    "#2e7d32", "#d84315",
  ];
  return colors[Math.abs(hash) % colors.length];
}

function AvatarImg({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    sha256(email).then((hash) => {
      setSrc(`https://gravatar.com/avatar/${hash}?s=64&d=404`);
    });
  }, [email]);

  if (!src || errored) {
    const initials = `${(firstName[0] || "").toUpperCase()}${(lastName[0] || "").toUpperCase()}`;
    return (
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: getInitialsColor(email),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
          letterSpacing: "0.03em",
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      onError={() => setErrored(true)}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
};
