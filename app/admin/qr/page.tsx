"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

const BASE_URL = "https://crystallakecarshow.com/register";

export default function QRPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [utmSource] = useState("day-of");
  const [utmMedium] = useState("qr");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const registerUrl = `${BASE_URL}?utm_source=${utmSource}&utm_medium=${utmMedium}`;

  useEffect(() => {
    QRCode.toDataURL(registerUrl, {
      width: 800,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [registerUrl]);

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          nav, .admin-sidebar, .admin-nav, .no-print { display: none !important; }
          body { background: white !important; }
          .print-sheet {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
            padding: 1in;
          }
        }
      `}</style>

      <div className="no-print">
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            fontWeight: 400,
            marginBottom: "1.5rem",
          }}
        >
          Registration QR Code
        </h1>

        <p
          style={{
            color: "var(--text-light)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Print this and display it at the registration table for day-of walk-up
          registrations. Attendees scan the code, fill out the form on their
          phone, and pay through Stripe.
        </p>

        <button
          onClick={handlePrint}
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
            marginBottom: "2rem",
          }}
        >
          Print QR Code
        </button>
      </div>

      {/* Preview + print sheet */}
      <div className="print-sheet">
        <div
          style={{
            background: "var(--white)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            padding: "3rem",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--text-light)",
              marginBottom: "0.5rem",
            }}
          >
            Crystal Lake Cars &amp; Caffeine
          </p>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.8rem",
              fontWeight: 400,
              color: "var(--charcoal)",
              marginBottom: "1.5rem",
            }}
          >
            Register Your Vehicle
          </h2>

          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Registration QR Code"
              style={{
                width: "280px",
                height: "280px",
                display: "block",
                margin: "0 auto 1.5rem",
              }}
            />
          ) : (
            <div
              style={{
                width: "280px",
                height: "280px",
                margin: "0 auto 1.5rem",
                background: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-light)",
                fontSize: "0.85rem",
              }}
            >
              Generating...
            </div>
          )}

          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--charcoal)",
              marginBottom: "0.25rem",
            }}
          >
            Scan to register &amp; pay
          </p>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-light)",
            }}
          >
            $30 per vehicle &middot; All proceeds benefit the Crystal Lake Food Pantry
          </p>
        </div>
      </div>

      {/* URL reference */}
      <div className="no-print" style={{ marginTop: "1.5rem" }}>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-light)",
            fontFamily: "monospace",
          }}
        >
          Links to: {registerUrl}
        </p>
      </div>
    </>
  );
}
