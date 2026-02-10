"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/check-in", label: "Check-In" },
  { href: "/admin/placards", label: "Placards" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/admins", label: "Admins" },
];

const SIDEBAR_WIDTH = 200;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't wrap login page with admin nav
  if (pathname === "/admin/login" || pathname === "/admin/set-password") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <style>{`
        .admin-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: ${SIDEBAR_WIDTH}px;
          height: 100vh;
          background: var(--charcoal);
          display: flex;
          flex-direction: column;
          z-index: 200;
          transition: transform 0.25s ease;
        }
        .admin-content {
          margin-left: ${SIDEBAR_WIDTH}px;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .admin-mobile-bar {
          display: none;
        }
        .admin-backdrop {
          display: none;
        }
        @media (max-width: 899px) {
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .admin-content {
            margin-left: 0;
          }
          .admin-mobile-bar {
            display: flex;
            align-items: center;
            gap: 1rem;
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--charcoal);
            padding: 0.75rem 1rem;
          }
          .admin-backdrop.open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 150;
          }
        }
      `}</style>

      {/* Mobile top bar */}
      <div className="admin-mobile-bar">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--gold)",
            fontSize: "1.5rem",
            cursor: "pointer",
            padding: "0.25rem",
            lineHeight: 1,
          }}
        >
          &#9776;
        </button>
        <Image
          src="/images/CLCC_Logo2026.png"
          alt="CLCC Logo"
          width={32}
          height={32}
          style={{ borderRadius: "50%" }}
        />
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "var(--gold)",
            fontSize: "1rem",
          }}
        >
          CLCC Admin
        </span>
      </div>

      {/* Backdrop for mobile */}
      <div
        className={`admin-backdrop${sidebarOpen ? " open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <nav
        className={`admin-sidebar${sidebarOpen ? " open" : ""}`}
      >
        {/* Brand */}
        <div style={{ padding: "1.25rem 1.25rem 0.75rem" }}>
          <Link
            href="/admin"
            onClick={closeSidebar}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              textDecoration: "none",
            }}
          >
            <Image
              src="/images/CLCC_Logo2026.png"
              alt="CLCC Logo"
              width={40}
              height={40}
              style={{ borderRadius: "50%" }}
            />
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "var(--gold)",
                fontSize: "1rem",
                lineHeight: 1.2,
              }}
            >
              CLCC Admin
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0.5rem 0" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                style={{
                  display: "block",
                  padding: "0.7rem 1.25rem",
                  color: isActive ? "var(--gold)" : "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  borderLeft: isActive
                    ? "3px solid var(--gold)"
                    : "3px solid transparent",
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  transition: "color 0.2s, background 0.2s, border-color 0.2s",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div
          style={{
            padding: "1rem 1.25rem 1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <Link
            href="/"
            onClick={closeSidebar}
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
              width: "100%",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="admin-content">
        <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </>
  );
}
