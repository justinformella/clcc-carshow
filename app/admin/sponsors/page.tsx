"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Sponsor, SponsorStatus, Admin } from "@/types/database";

type SortField = "company" | "name" | "status" | "sponsorship_level" | "sponsorship_amount" | "created_at";

export default function SponsorsPage() {
  const router = useRouter();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (f: SortField) => {
    if (sortField === f) { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
    else { setSortField(f); setSortDir(f === "sponsorship_amount" || f === "created_at" ? "desc" : "asc"); }
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [sponsorsRes, adminsRes] = await Promise.all([
        supabase.from("sponsors").select("*").order("created_at", { ascending: false }),
        supabase.from("admins").select("*").order("name"),
      ]);

      setSponsors((sponsorsRes.data as Sponsor[]) || []);
      setAdmins((adminsRes.data as Admin[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = sponsors.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter
      ? s.status === statusFilter
      : s.status !== "archived";

    const matchesAssignee =
      !assigneeFilter ||
      (assigneeFilter === "unassigned" ? !s.assigned_to : s.assigned_to === assigneeFilter);

    return matchesSearch && matchesStatus && matchesAssignee;
  }).sort((a, b) => {
    const statusOrder: Record<string, number> = { prospect: 0, inquired: 1, engaged: 2, paid: 3, archived: 4 };
    let cmp = 0;
    if (sortField === "sponsorship_amount") {
      cmp = (a.sponsorship_amount || 0) - (b.sponsorship_amount || 0);
    } else if (sortField === "created_at") {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === "status") {
      cmp = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
    } else {
      cmp = (a[sortField] || "").toString().localeCompare((b[sortField] || "").toString());
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
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
          Sponsors ({filtered.length})
        </h1>
        <button
          onClick={() => router.push("/admin/sponsors/new")}
          style={{
            padding: "0.6rem 1.5rem",
            background: "var(--gold)",
            color: "var(--charcoal)",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Add Sponsor
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Status</option>
          <option value="prospect">Prospect</option>
          <option value="inquired">Inquired</option>
          <option value="engaged">Committed</option>
          <option value="paid">Paid</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          style={{
            padding: "0.6rem 1rem",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
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
              <th style={{ ...thStyle, width: "60px" }}></th>
              <SortTh field="company" label="Company" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortTh field="name" label="Contact" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortTh field="sponsorship_level" label="Level" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortTh field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <th style={thStyle}>Assigned To</th>
              <SortTh field="sponsorship_amount" label="Received" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <th style={thStyle}>Payment</th>
              <SortTh field="created_at" label="Date" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const logoSrc = getLogoSrc(s);
              return (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/sponsors/${s.id}`)}
                  style={{
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ ...tdStyle, width: "60px", textAlign: "center" }}>
                    {logoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoSrc}
                        alt={s.company}
                        style={{
                          width: "44px",
                          height: "44px",
                          objectFit: "contain",
                          borderRadius: "4px",
                          background: "var(--cream)",
                          verticalAlign: "middle",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "44px",
                          height: "44px",
                          borderRadius: "4px",
                          background: "var(--cream)",
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "0.85rem",
                          color: "var(--text-light)",
                        }}
                      >
                        {s.company.charAt(0)}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>{s.company}</td>
                  <td style={tdStyle}>
                    <div>{s.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>{s.email}</div>
                  </td>
                  <td style={tdStyle}>{s.sponsorship_level}</td>
                  <td style={tdStyle}>
                    <SponsorStatusBadge status={s.status} />
                  </td>
                  <td style={tdStyle}>
                    {s.assigned_to ? (admins.find((a) => a.id === s.assigned_to)?.name || "—") : "—"}
                  </td>
                  <td style={tdStyle}>
                    {s.status === "paid" && s.sponsorship_amount > 0
                      ? `$${(((s.sponsorship_amount || 0) + (s.donation_cents || 0)) / 100).toLocaleString()}`
                      : "—"}
                  </td>
                  <td style={tdStyle}>
                    {s.payment_method === "stripe" ? (
                      <span style={{ fontSize: "0.8rem", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: 4 }}>
                        Card
                      </span>
                    ) : s.payment_method === "check" ? (
                      <span style={{ fontSize: "0.8rem", background: "#fff3e0", color: "#e65100", padding: "2px 8px", borderRadius: 4 }}>
                        Check{s.status !== "paid" ? " (pending)" : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#999" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-light)",
                  }}
                >
                  No sponsors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SponsorStatusBadge({ status }: { status: SponsorStatus }) {
  const config: Record<SponsorStatus, { label: string; bg: string; color: string }> = {
    prospect: { label: "Prospect", bg: "#ede7f6", color: "#5e35b1" },
    inquired: { label: "Inquired", bg: "#e3f2fd", color: "#1565c0" },
    engaged: { label: "Committed", bg: "#fff3e0", color: "#e65100" },
    paid: { label: "Paid", bg: "#e8f5e9", color: "#2e7d32" },
    archived: { label: "Archived", bg: "#f5f5f5", color: "#757575" },
  };

  const { label, bg, color } = config[status] || config.prospect;

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

function getLogoSrc(sponsor: Sponsor): string | null {
  if (sponsor.logo_url) return sponsor.logo_url;
  if (sponsor.website) {
    const domain = sponsor.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  return null;
}

function SortTh({ field, label, sortField, sortDir, onSort }: { field: SortField; label: string; sortField: SortField; sortDir: string; onSort: (f: SortField) => void }) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
    >
      {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
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
