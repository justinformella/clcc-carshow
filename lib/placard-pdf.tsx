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

/* ── Palette ───────────────────────────────────────────────────── */
const BLACK = "#000000";
const DARK = "#1C1C1C";
const MID = "#555555";
const RULE = "#999999";
const GOLD = "#D4A44A";

/* ── Styles ─────────────────────────────────────────────────────── */
const PAGE_MARGIN = 28; // safe print margin on all edges
const DIVIDER_SPACE = 10; // space for dashed cut line between halves
const HALF_HEIGHT = (11 * 72 - PAGE_MARGIN * 2 - DIVIDER_SPACE) / 2;

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    color: DARK,
    display: "flex",
    flexDirection: "column",
    padding: PAGE_MARGIN,
  },

  /* ── Half-page container ─────────────────────────── */
  halfPage: {
    height: HALF_HEIGHT,
    flexDirection: "column",
  },
  halfDivider: {
    height: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    borderBottomStyle: "dashed",
    marginVertical: 2,
  },

  /* ── Header banner ─────────────────────────────── */
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
  },
  logo: {
    width: 36,
    height: 36,
  },
  bannerTextWrap: {
    flexDirection: "column",
  },
  bannerTitle: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 15,
    color: DARK,
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 8,
    color: GOLD,
    letterSpacing: 1.5,
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
    paddingTop: 14,
    paddingLeft: 16,
    paddingRight: 20,
    paddingBottom: 10,
    flexDirection: "column",
    justifyContent: "center",
  },

  /* Right column — car number */
  rightCol: {
    width: "40%",
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 10,
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
    fontSize: 8,
    color: MID,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 18,
    color: DARK,
    marginBottom: 3,
  },
  fieldRule: {
    height: 1,
    backgroundColor: RULE,
    marginBottom: 12,
  },

  /* Side-by-side row for year/make */
  fieldRow: {
    flexDirection: "row",
    gap: 20,
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
    fontSize: 10,
    color: MID,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  carNumber: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 100,
    color: BLACK,
    textAlign: "center",
    lineHeight: 1,
  },

  /* ── Footer ────────────────────────────────────── */
  footer: {
    borderTopWidth: 2,
    borderTopColor: BLACK,
    paddingTop: 4,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 7,
    color: MID,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});

/* ── Single placard (half-page) ────────────────────────────────── */
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

/* ── Blank placard (half-page, fields empty with lines) ────────── */
function BlankPlacardHalf({ logoUrl }: { logoUrl: string }) {
  const blankLine = {
    height: 1,
    backgroundColor: RULE,
    marginBottom: 14,
    marginTop: 20,
  } as const;

  return (
    <View style={s.halfPage}>
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

      <View style={s.body}>
        <View style={s.leftCol}>
          <Text style={s.fieldLabel}>Owner</Text>
          <View style={blankLine} />

          <View style={s.fieldRow}>
            <View style={s.fieldGroupNarrow}>
              <Text style={s.fieldLabel}>Year</Text>
              <View style={blankLine} />
            </View>
            <View style={s.fieldGroupWide}>
              <Text style={s.fieldLabel}>Make</Text>
              <View style={blankLine} />
            </View>
          </View>

          <Text style={s.fieldLabel}>Model</Text>
          <View style={blankLine} />

          <Text style={s.fieldLabel}>Color</Text>
          <View style={blankLine} />
        </View>

        <View style={s.rightCol}>
          <Text style={s.numberLabel}>Car No.</Text>
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>crystallakecarshow.com</Text>
      </View>
    </View>
  );
}

/* ── Blank placards document ───────────────────────────────────── */
export function BlankPlacardDocument({
  count,
  logoUrl,
}: {
  count: number;
  logoUrl: string;
}) {
  const pages = Math.ceil(count / 2);

  return (
    <Document
      title="CLCC Car Show Blank Placards"
      author="Crystal Lake Cars & Caffeine"
    >
      {Array.from({ length: pages }).map((_, pageIdx) => {
        const isLastPage = pageIdx === pages - 1;
        const hasSecond = !isLastPage || count % 2 === 0;
        return (
          <Page key={pageIdx} size="LETTER" orientation="portrait" style={s.page}>
            <BlankPlacardHalf logoUrl={logoUrl} />
            {hasSecond && (
              <>
                <View style={s.halfDivider} />
                <BlankPlacardHalf logoUrl={logoUrl} />
              </>
            )}
          </Page>
        );
      })}
    </Document>
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
        <Page key={pageIdx} size="LETTER" orientation="portrait" style={s.page}>
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
