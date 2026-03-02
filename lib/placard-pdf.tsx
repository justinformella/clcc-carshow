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

/* ── Styles ─────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    width: "11in",
    height: "8.5in",
    fontFamily: "Inter",
    color: DARK,
    display: "flex",
    flexDirection: "column",
  },

  /* ── Header banner ─────────────────────────────── */
  banner: {
    backgroundColor: BLACK,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 28,
    gap: 14,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  bannerTextWrap: {
    flex: 1,
    flexDirection: "column",
  },
  bannerTitle: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  bannerSubtitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 9,
    color: "#CCCCCC",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginTop: 3,
  },

  /* ── Body (two columns) ────────────────────────── */
  body: {
    flex: 1,
    flexDirection: "row",
  },

  /* Left column — vehicle info */
  leftCol: {
    width: "60%",
    paddingTop: 28,
    paddingLeft: 32,
    paddingRight: 28,
    paddingBottom: 24,
    flexDirection: "column",
  },

  /* Right column — car number */
  rightCol: {
    width: "40%",
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 24,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1.5,
    borderLeftColor: BLACK,
  },

  /* ── Field labels & values (no boxes) ──────────── */
  fieldLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 8,
    color: MID,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 18,
    color: DARK,
    marginBottom: 6,
  },
  fieldRule: {
    height: 1,
    backgroundColor: RULE,
    marginBottom: 18,
  },

  /* Side-by-side row for year/make */
  fieldRow: {
    flexDirection: "row",
    gap: 24,
  },
  fieldGroupNarrow: {
    width: "28%",
    flexDirection: "column",
  },
  fieldGroupWide: {
    flex: 1,
    flexDirection: "column",
  },

  /* Story section */
  storyLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 8,
    color: MID,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  storyText: {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: 12,
    color: DARK,
    lineHeight: 1.7,
  },

  /* ── Car number (right col) ────────────────────── */
  numberLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 10,
    color: MID,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 14,
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
    borderTopWidth: 1.5,
    borderTopColor: BLACK,
    paddingVertical: 8,
    paddingHorizontal: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 7,
    color: MID,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

/* ── Single placard page ────────────────────────────────────────── */
function PlacardPage({
  reg,
  logoUrl,
}: {
  reg: Registration;
  logoUrl: string;
}) {
  return (
    <Page size="LETTER" orientation="landscape" style={s.page}>
      {/* ── Header banner ──────────────────────────── */}
      <View style={s.banner}>
        <Image src={logoUrl} style={s.logo} />
        <View style={s.bannerTextWrap}>
          <Text style={s.bannerTitle}>Crystal Lake Cars &amp; Caffeine</Text>
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
              <View style={s.fieldRule} />
            </>
          )}

          {/* STORY */}
          {reg.story && (
            <View style={{ flex: 1 }}>
              <Text style={s.storyLabel}>About This Car</Text>
              <Text style={s.storyText}>{reg.story}</Text>
            </View>
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
        <Text style={s.footerText}>
          All proceeds benefit the Crystal Lake Food Pantry
        </Text>
        <Text style={s.footerText}>crystallakecarshow.com</Text>
      </View>
    </Page>
  );
}

/* ── Full document ──────────────────────────────────────────────── */
export function PlacardDocument({
  registrations,
  logoUrl,
}: {
  registrations: Registration[];
  logoUrl: string;
}) {
  return (
    <Document
      title="CLCC Car Show Placards"
      author="Crystal Lake Cars & Caffeine"
    >
      {registrations.map((reg) => (
        <PlacardPage key={reg.id} reg={reg} logoUrl={logoUrl} />
      ))}
    </Document>
  );
}
