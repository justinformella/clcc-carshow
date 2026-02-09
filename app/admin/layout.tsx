"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/check-in", label: "Check-In" },
  { href: "/admin/placards", label: "Placards" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/admins", label: "Admins" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't wrap login page with admin nav
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Admin Header */}
      <div
        style={{
          background: "var(--charcoal)",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link
            href="/admin"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "var(--gold)",
              textDecoration: "none",
              fontSize: "1.1rem",
            }}
          >
            CLCC Admin
          </Link>
          <nav
            style={{
              display: "flex",
              gap: "1.5rem",
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color:
                    pathname === item.href
                      ? "var(--gold)"
                      : "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  transition: "color 0.2s",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
              fontSize: "0.8rem",
            }}
          >
            View Site
          </Link>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.6)",
              padding: "0.4rem 1rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Admin Content */}
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}
