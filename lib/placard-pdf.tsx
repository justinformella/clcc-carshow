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

/* ── Colours ────────────────────────────────────────────────────── */
const GOLD = "#D4A44A";
const CHARCOAL = "#1C1C1C";
const LIGHT = "#6B6B6B";

/* ── Styles ─────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    width: "11in",
    height: "8.5in",
    paddingTop: "0.5in",
    paddingBottom: "0.5in",
    paddingHorizontal: "0.65in",
    fontFamily: "Inter",
    color: CHARCOAL,
    display: "flex",
    flexDirection: "column",
  },

  /* Header row: logo + event name | car number */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  eventText: {
    flexDirection: "column",
  },
  eventName: {
    fontFamily: "Playfair Display",
    fontSize: 14,
    color: CHARCOAL,
  },
  eventDate: {
    fontSize: 8,
    color: LIGHT,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  carNumber: {
    fontFamily: "Playfair Display",
    fontSize: 64,
    fontWeight: 700,
    lineHeight: 1,
    color: CHARCOAL,
  },

  /* Gold rule */
  goldRule: {
    height: 3,
    backgroundColor: GOLD,
    marginBottom: 18,
  },

  /* Vehicle title */
  vehicle: {
    fontFamily: "Playfair Display",
    fontSize: 38,
    lineHeight: 1.15,
    color: CHARCOAL,
    marginBottom: 6,
  },

  /* Owner */
  ownerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 14,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 600,
    color: CHARCOAL,
  },
  ownerHometown: {
    fontSize: 14,
    color: LIGHT,
    marginLeft: 6,
  },

  /* Category badge */
  categoryBadge: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: GOLD,
  },

  /* Thin divider */
  divider: {
    height: 0.75,
    backgroundColor: "#D0D0D0",
    marginBottom: 16,
  },

  /* Details section */
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    marginBottom: 16,
  },
  detailItem: {
    width: "33%",
    marginBottom: 12,
    paddingRight: 16,
  },
  detailLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: LIGHT,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 12,
    lineHeight: 1.5,
    color: CHARCOAL,
  },

  /* Story — fills remaining space */
  storyWrap: {
    flex: 1,
    justifyContent: "flex-start",
  },
  storyLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: LIGHT,
    marginBottom: 6,
  },
  storyText: {
    fontSize: 13,
    lineHeight: 1.75,
    color: CHARCOAL,
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 0.75,
    borderTopColor: "#D0D0D0",
    paddingTop: 8,
    marginTop: "auto",
  },
  footerLeft: {
    fontSize: 7,
    color: LIGHT,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerRight: {
    fontSize: 7,
    color: LIGHT,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

/* ── Single placard page ────────────────────────────────────────── */
function PlacardPage({ reg, logoUrl }: { reg: Registration; logoUrl: string }) {
  const hometown = [reg.address_city, reg.address_state]
    .filter(Boolean)
    .join(", ");

  const details: { label: string; value: string }[] = [];

  return (
    <Page size="LETTER" orientation="landscape" style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Image src={logoUrl} style={s.logo} />
          <View style={s.eventText}>
            <Text style={s.eventName}>Crystal Lake Cars &amp; Caffeine</Text>
            <Text style={s.eventDate}>May 17, 2026 &bull; Downtown Crystal Lake</Text>
          </View>
        </View>
        <Text style={s.carNumber}>#{reg.car_number}</Text>
      </View>

      {/* Gold accent rule */}
      <View style={s.goldRule} />

      {/* Vehicle */}
      <Text style={s.vehicle}>
        {reg.vehicle_year} {reg.vehicle_make} {reg.vehicle_model}
      </Text>

      {/* Owner */}
      {!reg.hide_owner_details && (
        <View style={s.ownerRow}>
          <Text style={s.ownerName}>
            {reg.first_name} {reg.last_name}
          </Text>
          {hometown && <Text style={s.ownerHometown}>&mdash; {hometown}</Text>}
        </View>
      )}

      {/* Category badge */}
      {reg.award_category && (
        <View style={s.categoryBadge}>
          <Text style={s.categoryText}>{reg.award_category}</Text>
        </View>
      )}

      {/* Divider */}
      {details.length > 0 && <View style={s.divider} />}

      {/* Details grid */}
      {details.length > 0 && (
        <View style={s.detailsGrid}>
          {details.map((d) => (
            <View key={d.label} style={s.detailItem}>
              <Text style={s.detailLabel}>{d.label}</Text>
              <Text style={s.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Story */}
      {reg.story && (
        <View style={s.storyWrap}>
          <Text style={s.storyLabel}>Owner&apos;s Story</Text>
          <Text style={s.storyText}>{reg.story}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerLeft}>
          All proceeds benefit the Crystal Lake Food Pantry
        </Text>
        <Text style={s.footerRight}>crystallakecarshow.com</Text>
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
