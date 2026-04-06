import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CLCC Arcade — Redline Motor Condos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getRandomDashUrl(): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/registrations?select=pixel_dashboard_url&pixel_dashboard_url=not.is.null&payment_status=in.(paid,comped)&limit=50`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const rows: { pixel_dashboard_url: string }[] = await res.json();
    if (rows.length === 0) return null;
    return rows[Math.floor(Math.random() * rows.length)].pixel_dashboard_url;
  } catch {
    return null;
  }
}

export default async function OGImage() {
  const dashUrl = await getRandomDashUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#08090c",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dashboard background image — fills entire card */}
        {dashUrl ? (
          <img
            src={dashUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          /* Fallback: simple dark gradient */
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "linear-gradient(to bottom, #0a1628, #1a1a1e)",
            }}
          />
        )}

        {/* Dark overlay for text readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "rgba(0,0,0,0.55)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            position: "relative",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            CLCC ARCADE
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#ffd700",
              letterSpacing: "-0.02em",
              textShadow: "0 4px 30px rgba(0,0,0,0.8), 0 2px 10px rgba(255,215,0,0.4)",
              display: "flex",
            }}
          >
            REDLINE MOTOR CONDOS
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "8px",
            }}
          >
            {["DRAG RACE", "CRUISE", "DYNO", "DETAIL"].map((game) => (
              <div
                key={game}
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#ffd700",
                  padding: "8px 20px",
                  border: "2px solid #b8860b",
                  background: "rgba(26,26,46,0.8)",
                  letterSpacing: "0.1em",
                  display: "flex",
                }}
              >
                {game}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.15em",
              marginTop: "4px",
              display: "flex",
            }}
          >
            Crystal Lake Cars &amp; Caffeine
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
