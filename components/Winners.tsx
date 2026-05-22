import { createServerClient } from "@/lib/supabase-server";
import type { AwardCategory, Registration } from "@/types/database";

type WinnerRow = Pick<
  Registration,
  | "id"
  | "car_number"
  | "vehicle_year"
  | "vehicle_make"
  | "vehicle_model"
  | "first_name"
  | "last_name"
  | "hide_owner_details"
  | "award_category"
>;

export default async function Winners() {
  const supabase = createServerClient();

  const [categoriesRes, winnersRes] = await Promise.all([
    supabase
      .from("award_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("registrations")
      .select(
        "id, car_number, vehicle_year, vehicle_make, vehicle_model, first_name, last_name, hide_owner_details, award_category"
      )
      .not("award_category", "is", null),
  ]);

  const categories = (categoriesRes.data ?? []) as AwardCategory[];
  const winners = (winnersRes.data ?? []) as WinnerRow[];
  const winnerByCategory = new Map(winners.map((w) => [w.award_category, w]));

  // "Best in Show" gets a hero treatment, the rest go in the grid
  const bestInShow = winners.find((w) => w.award_category === "Best in Show");
  const otherCategories = categories.filter((c) => c.name !== "Best in Show");

  if (winners.length === 0) {
    return null;
  }

  return (
    <section
      id="winners"
      style={{
        background: "linear-gradient(180deg, var(--cream) 0%, #ffffff 100%)",
        padding: "6rem 1.5rem",
        scrollMarginTop: "80px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "var(--gold)",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            🏆 2026 Award Winners
          </span>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 400,
              marginBottom: "0.75rem",
              lineHeight: 1.1,
            }}
          >
            Congratulations to this year&apos;s winners
          </h2>
          <p
            style={{
              color: "var(--text-light)",
              fontSize: "1rem",
              maxWidth: "640px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            From classics to exotics, modern marvels to motorcycles &mdash;
            here are the cars that took home the trophies at the 4th annual
            Crystal Lake Cars &amp; Caffeine Charity Car Show.
          </p>
        </div>

        {/* Best in Show — featured */}
        {bestInShow && <FeaturedWinner winner={bestInShow} />}

        {/* Other categories — grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginTop: bestInShow ? "3rem" : 0,
          }}
        >
          {otherCategories.map((cat) => {
            const winner = winnerByCategory.get(cat.name);
            return <WinnerCard key={cat.id} category={cat.name} winner={winner} />;
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedWinner({ winner }: { winner: WinnerRow }) {
  return (
    <div
      style={{
        background: "var(--white)",
        boxShadow: "0 16px 48px rgba(201,168,76,0.18)",
        border: "2px solid var(--gold)",
        padding: "3rem 2.5rem",
        textAlign: "center",
        position: "relative",
      }}
    >
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "var(--gold)",
          marginBottom: "1rem",
        }}
      >
        🏆 Best in Show
      </p>
      <p
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
          fontWeight: 400,
          lineHeight: 1.15,
          marginBottom: "0.75rem",
        }}
      >
        <span style={{ color: "var(--gold)" }}>#{winner.car_number}</span>{" "}
        {winner.vehicle_year} {winner.vehicle_make.trim()}{" "}
        {winner.vehicle_model.trim()}
      </p>
      {!winner.hide_owner_details && (
        <p style={{ color: "var(--charcoal)", fontSize: "1rem", fontWeight: 500 }}>
          Owner: {winner.first_name} {winner.last_name}
        </p>
      )}
    </div>
  );
}

function WinnerCard({
  category,
  winner,
}: {
  category: string;
  winner: WinnerRow | undefined;
}) {
  if (!winner) {
    return (
      <div
        style={{
          background: "var(--white)",
          padding: "1.5rem",
          border: "1px solid rgba(0,0,0,0.06)",
          opacity: 0.6,
        }}
      >
        <p
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "var(--text-light)",
          }}
        >
          {category}
        </p>
        <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Not yet announced
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--white)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        padding: "1.5rem 1.5rem 1.75rem",
        borderTop: "3px solid var(--gold)",
      }}
    >
      <p
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--gold)",
          marginBottom: "0.6rem",
        }}
      >
        🏆 {category}
      </p>
      <p
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.15rem",
          lineHeight: 1.25,
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ color: "var(--gold)" }}>#{winner.car_number}</span>{" "}
        {winner.vehicle_year} {winner.vehicle_make.trim()}{" "}
        {winner.vehicle_model.trim()}
      </p>
      {!winner.hide_owner_details && (
        <p style={{ fontSize: "0.9rem", color: "var(--charcoal)" }}>
          {winner.first_name} {winner.last_name}
        </p>
      )}
    </div>
  );
}
