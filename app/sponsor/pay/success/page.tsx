import { Suspense } from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";

function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f8f5f0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#888" }}>Loading...</p>
    </div>
  );
}

async function SuccessContent({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const isCheck = params.method === "check";

  let company = decodeURIComponent(params.company || "");
  let tierName = decodeURIComponent(params.level || "");
  let amountDisplay = "";
  let amountPaidCents = 0;
  let donationCents = 0;

  if (sessionId) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sponsorId = session.metadata?.sponsor_id;

    if (sponsorId) {
      const supabase = createServerClient();
      const { data: sponsor } = await supabase
        .from("sponsors")
        .select("company, sponsorship_level, sponsorship_amount, donation_cents")
        .eq("id", sponsorId)
        .single();

      if (sponsor) {
        company = sponsor.company;
        tierName = sponsor.sponsorship_level;
        amountPaidCents = sponsor.sponsorship_amount;
        amountDisplay = `$${(sponsor.sponsorship_amount / 100).toLocaleString()}`;
        donationCents = sponsor.donation_cents || 0;
      }
    }

    if (!amountDisplay && session.amount_total) {
      amountDisplay = `$${(session.amount_total / 100).toLocaleString()}`;
    }
  }

  return (
    <>
      {/* Header - matching registration page */}
      <header className="scrolled reg-header" id="header">
        <div className="header-inner">
          <Link href="/" className="logo reg-logo">
            <img src="/images/CLCC_Logo2026.png" alt="CLCC Logo" className="reg-logo-img" />
            <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <span className="logo-text" style={{ color: "var(--charcoal)" }}>
                Crystal Lake Cars &amp; Caffeine
              </span>
              <span className="logo-tagline reg-logo-tagline" style={{ color: "var(--text-light)" }}>
                Est. 2021 &middot; Crystal Lake, Illinois
              </span>
            </div>
          </Link>
          <nav><ul><li><Link href="/">Home</Link></li></ul></nav>
        </div>
      </header>

      <div style={{ paddingTop: "120px", paddingBottom: "80px", background: "var(--cream)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 2rem" }}>
          {/* White card */}
          <div style={{ background: "var(--white)", padding: "2.5rem" }}>
            {/* Checkmark and heading */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 28, color: "#2e7d32" }}>
                ✓
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.8rem", color: "var(--charcoal)", margin: "0 0 0.5rem", fontWeight: 400 }}>
                {isCheck ? "Check Payment Noted" : "Thank You!"}
              </h1>
              <p style={{ fontSize: "1rem", color: "var(--text-light)", margin: 0 }}>
                {isCheck
                  ? `We've noted your check payment for ${company}.`
                  : `Your sponsorship payment for ${company} has been received.`}
              </p>
            </div>

            {/* Payment details */}
            <div style={{ background: "#f8f5f0", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <table width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  {company && (
                    <tr>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Company</td>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "var(--charcoal)", fontWeight: 600 }}>{company}</td>
                    </tr>
                  )}
                  {tierName && (
                    <tr>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Sponsorship Level</td>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "var(--charcoal)" }}>{tierName}</td>
                    </tr>
                  )}
                  {amountDisplay && (
                    <tr>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Sponsorship</td>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "var(--charcoal)", fontWeight: 600 }}>{amountDisplay}</td>
                    </tr>
                  )}
                  {donationCents > 0 && (
                    <tr>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Additional Donation</td>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "#2e7d32", fontWeight: 600 }}>${(donationCents / 100).toLocaleString()}</td>
                    </tr>
                  )}
                  {donationCents > 0 && (
                    <tr>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Total</td>
                      <td style={{ padding: "6px 0", fontSize: 14, color: "var(--charcoal)", fontWeight: 700 }}>${((amountPaidCents + donationCents) / 100).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: "6px 0", fontSize: 14, color: "#888", width: 140 }}>Payment Method</td>
                    <td style={{ padding: "6px 0", fontSize: 14, color: "var(--charcoal)" }}>{isCheck ? "Check" : "Credit Card"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Check instructions */}
            {isCheck && (
              <div style={{ background: "#fff3e0", border: "1px solid #ffe0b2", padding: "1rem", marginBottom: "1.5rem", fontSize: 14, color: "#e65100", lineHeight: 1.6 }}>
                <strong>Check Instructions:</strong><br />
                Please make checks payable to <strong>Downtown Crystal Lake / Main Street</strong> and mail to:<br />
                Raue House, 25 W. Crystal Lake Avenue, Crystal Lake, IL 60014
              </div>
            )}

            {/* Tax receipt info */}
            <div style={{ borderLeft: "4px solid var(--gold, #c9a84c)", paddingLeft: "1rem", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.1rem", color: "var(--charcoal)", margin: "0 0 0.5rem", fontWeight: 600 }}>
                Tax Receipt Information
              </h2>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, margin: 0 }}>
                <strong>Organization:</strong> Downtown Crystal Lake / Main Street<br />
                <strong>Type:</strong> 501(c)(3) not-for-profit, founded 1996<br />
                <strong>Address:</strong> Raue House, 25 W. Crystal Lake Avenue, Crystal Lake, IL 60014<br />
                <strong>Phone:</strong> 815-479-0835<br />
                <strong>Website:</strong> downtowncl.org<br />
                <strong>Accreditation:</strong> Main Street America accredited program
              </p>
            </div>

            {/* Event details */}
            <div style={{ textAlign: "center", padding: "1rem 0", borderTop: "1px solid #eee" }}>
              <p style={{ fontSize: 14, color: "#888", margin: "0 0 4px" }}>
                Crystal Lake Cars &amp; Caffeine Car Show
              </p>
              <p style={{ fontSize: 14, color: "var(--charcoal)", margin: "0 0 4px", fontWeight: 600 }}>
                May 17, 2026 · 7:30 AM – 2:00 PM
              </p>
              <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
                Grant, Brink &amp; Williams Streets · Downtown Crystal Lake, IL
              </p>
            </div>

            {/* Back button */}
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 2rem",
                  background: "var(--gold, #c9a84c)",
                  color: "var(--charcoal, #2c2c2c)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .reg-header .header-inner {
          flex-wrap: nowrap;
        }
        .reg-header nav {
          width: auto;
          order: 0;
        }
        .reg-header nav ul {
          display: flex !important;
          background: none !important;
          padding: 0 !important;
          flex-direction: row !important;
        }
        .reg-header nav ul li a {
          color: var(--text-dark) !important;
          padding: 0 !important;
        }
        .reg-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .reg-logo-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .reg-logo .logo-text {
            font-size: 1rem !important;
            letter-spacing: 0.03em !important;
          }
          .reg-logo-tagline {
            display: none;
          }
          .reg-logo-img {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>
    </>
  );
}

export default function SponsorPaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
