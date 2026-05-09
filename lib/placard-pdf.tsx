import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Registration } from "@/types/database";

/* ── Register fonts (static TTF files in public/fonts/) ────────── */
Font.register({
  family: "Playfair Display",
  fonts: [
    { src: "/fonts/PlayfairDisplay-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/PlayfairDisplay-Bold.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-SemiBold.ttf", fontWeight: 600 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

/* ── Black & white palette ─────────────────────────────────────── */
const BLACK = "#000000";
const DARK = "#1C1C1C";
const MID = "#555555";
const RULE = "#999999";
const GOLD = "#D4A44A";

/* ── Styles ─────────────────────────────────────────────────────── */
const HALF_HEIGHT = 4.25 * 72; // 4.25 inches in points

const s = StyleSheet.create({
  page: {
    width: "11in",
    height: "8.5in",
    fontFamily: "Inter",
    color: DARK,
    display: "flex",
    flexDirection: "column",
  },

  /* ── Half-page container ─────────────────────────── */
  halfPage: {
    height: HALF_HEIGHT,
    flexDirection: "column",
    overflow: "hidden",
  },
  halfDivider: {
    height: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    borderBottomStyle: "dashed",
  },

  /* ── Header banner ─────────────────────────────── */
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 32,
    gap: 14,
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  bannerTextWrap: {
    flexDirection: "column",
  },
  bannerTitle: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 18,
    color: DARK,
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 4,
  },

  /* ── Body (two columns) ────────────────────────── */
  body: {
    flex: 1,
    flexDirection: "row",
  },

  /* Left column — vehicle info */
  leftCol: {
    width: "58%",
    paddingTop: 16,
    paddingLeft: 36,
    paddingRight: 32,
    paddingBottom: 12,
    flexDirection: "column",
    justifyContent: "center",
  },

  /* Right column — car number */
  rightCol: {
    width: "42%",
    paddingTop: 16,
    paddingHorizontal: 32,
    paddingBottom: 12,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 2,
    borderLeftColor: BLACK,
  },

  /* ── Field labels & values ──────────────────────── */
  fieldLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 9,
    color: MID,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  fieldValue: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 20,
    color: DARK,
    marginBottom: 4,
  },
  fieldRule: {
    height: 1,
    backgroundColor: RULE,
    marginBottom: 14,
  },

  /* Side-by-side row for year/make */
  fieldRow: {
    flexDirection: "row",
    gap: 28,
  },
  fieldGroupNarrow: {
    width: "28%",
    flexDirection: "column",
  },
  fieldGroupWide: {
    flex: 1,
    flexDirection: "column",
  },

  /* ── Car number (right col) ────────────────────── */
  numberLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 12,
    color: MID,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 16,
  },
  carNumber: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 120,
    color: BLACK,
    textAlign: "center",
    lineHeight: 1,
  },

  /* ── Footer ────────────────────────────────────── */
  footer: {
    borderTopWidth: 2,
    borderTopColor: BLACK,
    paddingVertical: 10,
    paddingHorizontal: 32,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 8,
    color: MID,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});

/* ── Single placard (half-page, 11" x 4.25") ──────────────────── */
function PlacardHalf({
  reg,
  logoUrl,
}: {
  reg: Registration;
  logoUrl: string;
}) {
  return (
    <View style={s.halfPage}>
      {/* ── Header banner ──────────────────────────── */}
      <View style={s.banner}>
        <Image src={logoUrl} style={s.logo} />
        <View style={s.bannerTextWrap}>
          <Text style={s.bannerTitle}>
            2026 Crystal Lake Cars &amp; Caffeine Charity Car Show
          </Text>
          <Text style={s.bannerSubtitle}>
            All Entry Proceeds Benefit the Crystal Lake Food Pantry
          </Text>
        </View>
      </View>

      {/* ── Two-column body ────────────────────────── */}
      <View style={s.body}>
        {/* Left column — vehicle details */}
        <View style={s.leftCol}>
          {/* OWNER */}
          {!reg.hide_owner_details && (
            <>
              <Text style={s.fieldLabel}>Owner</Text>
              <Text style={s.fieldValue}>
                {reg.first_name} {reg.last_name}
              </Text>
              <View style={s.fieldRule} />
            </>
          )}

          {/* YEAR / MAKE — side by side */}
          <View style={s.fieldRow}>
            <View style={s.fieldGroupNarrow}>
              <Text style={s.fieldLabel}>Year</Text>
              <Text style={s.fieldValue}>{reg.vehicle_year}</Text>
              <View style={s.fieldRule} />
            </View>
            <View style={s.fieldGroupWide}>
              <Text style={s.fieldLabel}>Make</Text>
              <Text style={s.fieldValue}>{reg.vehicle_make}</Text>
              <View style={s.fieldRule} />
            </View>
          </View>

          {/* MODEL */}
          <Text style={s.fieldLabel}>Model</Text>
          <Text style={s.fieldValue}>{reg.vehicle_model}</Text>
          <View style={s.fieldRule} />

          {/* COLOR */}
          {reg.vehicle_color && (
            <>
              <Text style={s.fieldLabel}>Color</Text>
              <Text style={s.fieldValue}>{reg.vehicle_color}</Text>
            </>
          )}
        </View>

        {/* Right column — car number */}
        <View style={s.rightCol}>
          <Text style={s.numberLabel}>Car No.</Text>
          <Text style={s.carNumber}>{reg.car_number}</Text>
        </View>
      </View>

      {/* ── Footer ─────────────────────────────────── */}
      <View style={s.footer}>
        <Text style={s.footerText}>crystallakecarshow.com</Text>
      </View>
    </View>
  );
}

/* ── Full document — two placards per page ─────────────────────── */
export function PlacardDocument({
  registrations,
  logoUrl,
}: {
  registrations: Registration[];
  logoUrl: string;
}) {
  // Pair registrations: [0,1], [2,3], etc. Last page may have only one.
  const pages: (Registration | null)[][] = [];
  for (let i = 0; i < registrations.length; i += 2) {
    pages.push([
      registrations[i],
      registrations[i + 1] || null,
    ]);
  }

  return (
    <Document
      title="CLCC Car Show Placards"
      author="Crystal Lake Cars & Caffeine"
    >
      {pages.map((pair, pageIdx) => (
        <Page key={pageIdx} size="LETTER" orientation="landscape" style={s.page}>
          <PlacardHalf reg={pair[0]!} logoUrl={logoUrl} />
          {pair[1] && (
            <>
              <View style={s.halfDivider} />
              <PlacardHalf reg={pair[1]} logoUrl={logoUrl} />
            </>
          )}
        </Page>
      ))}
    </Document>
  );
}
