"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Admin } from "@/types/database";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
    ],
  },
  {
    label: "Event",
    items: [
      { href: "/admin/registrations", label: "Registrations", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { href: "/admin/attendees", label: "Attendees", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
      { href: "/admin/sponsors", label: "Sponsors", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/help-desk", label: "Help Desk", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" },
      { href: "/admin/awards", label: "Awards", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
      { href: "/admin/check-in", label: "Check-In", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
      { href: "/admin/placards", label: "Placards", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/marketing", label: "Marketing", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
      { href: "/admin/finances", label: "Finances", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
      { href: "/admin/analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/email-log", label: "Email Log", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
      { href: "/admin/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
      { href: "/admin/admins", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

const SIDEBAR_WIDTH = 200;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<Admin["role"] | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("admins")
        .select("role")
        .ilike("email", user.email)
        .maybeSingle();
      if (data?.role) setUserRole(data.role);
    };
    fetchRole();
  }, []);

  const navItems = allNavItems.filter(
    (item) => !("adminOnly" in item) || userRole === "admin"
  );

  // Don't wrap login page with admin nav
  if (pathname === "/admin/login" || pathname === "/admin/set-password" || pathname === "/admin/accept-invite") {
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0.25rem 0", overflowY: "auto" }}>
          {navGroups.map((group) => (
            <div key={group.label || "top"}>
              {group.label && (
                <p style={{
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "rgba(255,255,255,0.25)",
                  padding: "0.75rem 1.25rem 0.3rem",
                  margin: 0,
                }}>
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.55rem 1.25rem",
                      color: isActive ? "var(--gold)" : "rgba(255,255,255,0.55)",
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderLeft: isActive
                        ? "3px solid var(--gold)"
                        : "3px solid transparent",
                      background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                      transition: "color 0.2s, background 0.2s, border-color 0.2s",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}
                    >
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
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
