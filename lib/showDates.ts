// Show-date formatting shared by emails, pages and calendar files.
// Pure functions (no database access), safe in client and server code.

export type ShowDateInfo = { year: number; event_date: string }; // event_date: YYYY-MM-DD

const TZ = "America/Chicago";
const CHECK_IN = "073000"; // 7:30 AM local
const SHOW_END = "140000"; // 2:00 PM local

function asDate(ev: ShowDateInfo): Date {
  // noon avoids any timezone rolling the calendar day
  return new Date(`${ev.event_date}T12:00:00`);
}

/** "Sunday, May 16, 2027" */
export function showDateLong(ev: ShowDateInfo): string {
  return asDate(ev).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "May 16, 2027" */
export function showDateShort(ev: ShowDateInfo): string {
  return asDate(ev).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function compact(ev: ShowDateInfo): string {
  return ev.event_date.replace(/-/g, "");
}

/** Google Calendar "add event" link for show day, 7:30 AM to 2 PM Central. */
export function googleCalendarUrl(ev: ShowDateInfo): string {
  const d = compact(ev);
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=Crystal+Lake+Cars+%26+Caffeine+Car+Show" +
    `&dates=${d}T${CHECK_IN}/${d}T${SHOW_END}` +
    `&ctz=${encodeURIComponent(TZ)}` +
    "&location=Grant%2C+Brink+%26+Williams+Streets%2C+Downtown+Crystal+Lake%2C+IL" +
    "&details=Annual+car+show+benefiting+the+Crystal+Lake+Food+Pantry.+Check-in+opens+at+7%3A30+AM."
  );
}

/** Lines of an .ics file for show day (times in Central). */
export function showIcsLines(ev: ShowDateInfo): string[] {
  const d = compact(ev);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CLCC Car Show//EN",
    "BEGIN:VEVENT",
    `UID:clcc-car-show-${ev.year}@crystallakecarshow.com`,
    `DTSTART;TZID=${TZ}:${d}T${CHECK_IN}`,
    `DTEND;TZID=${TZ}:${d}T${SHOW_END}`,
    "SUMMARY:CLCC Annual Charity Car Show",
    "LOCATION:Downtown Crystal Lake\\, IL — Grant\\, Brink & Williams Streets",
    "DESCRIPTION:Check-in starts at 7:30 AM. Bring your registered vehicle. 100% of net proceeds go to the Crystal Lake Food Pantry.",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
}
