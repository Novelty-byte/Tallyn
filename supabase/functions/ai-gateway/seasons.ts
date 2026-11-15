/**
 * Retail calendar for Pakistani kiryana shops.
 *
 * Islamic dates are approximate (they depend on moon sighting in Pakistan, usually ±1 day).
 * "Days away" is computed here in code, never by the model (Rule 1).
 */

export interface SeasonEvent {
  /** First day, YYYY-MM-DD. */
  start: string;
  name: string;
  /** True when the date depends on moon sighting. */
  approx: boolean;
  /** What typically sells more — general retail knowledge, no figures. */
  demand: string;
}

const RAMADAN = "dates (khajoor), Rooh Afza and sherbets, besan, cooking oil and ghee, sugar, flour, pakora/samosa ingredients, vermicelli, chickpeas, fruit chaat masala, milk and yogurt";
const EID_FITR = "sevaiyan (vermicelli), milk, sugar, dry fruits, mehndi, bangles, biscuits and sweets, soft drinks, gift packs";
const EID_ADHA = "spices and masalas, ginger-garlic, onions and tomatoes, cooking oil, rice, charcoal and skewers, plastic bags, freezer bags, soft drinks";
const MUHARRAM = "milk, sugar and sherbet ingredients for sabeel, rice and daal for niaz, disposable glasses and plates";
const MILAD = "sweets, decorations and lights, rice and daal for niaz, disposable plates";

const LUNAR: SeasonEvent[] = [
  { start: "2026-02-19", name: "Ramadan", approx: true, demand: RAMADAN },
  { start: "2026-03-21", name: "Eid ul Fitr", approx: true, demand: EID_FITR },
  { start: "2026-05-27", name: "Eid ul Adha", approx: true, demand: EID_ADHA },
  { start: "2026-06-25", name: "Ashura (9-10 Muharram)", approx: true, demand: MUHARRAM },
  { start: "2026-08-26", name: "Eid Milad un Nabi (12 Rabi ul Awwal)", approx: true, demand: MILAD },
  { start: "2027-02-08", name: "Ramadan", approx: true, demand: RAMADAN },
  { start: "2027-03-10", name: "Eid ul Fitr", approx: true, demand: EID_FITR },
  { start: "2027-05-17", name: "Eid ul Adha", approx: true, demand: EID_ADHA },
  { start: "2027-06-15", name: "Ashura (9-10 Muharram)", approx: true, demand: MUHARRAM },
  { start: "2027-08-15", name: "Eid Milad un Nabi (12 Rabi ul Awwal)", approx: true, demand: MILAD },
  { start: "2028-01-28", name: "Ramadan", approx: true, demand: RAMADAN },
  { start: "2028-02-27", name: "Eid ul Fitr", approx: true, demand: EID_FITR },
  { start: "2028-05-05", name: "Eid ul Adha", approx: true, demand: EID_ADHA },
];

/** Yearly fixed-date seasons, as MM-DD. */
const YEARLY: Array<Omit<SeasonEvent, "start" | "approx"> & { mmdd: string }> = [
  { mmdd: "04-01", name: "New school session (books, lunch boxes, snacks)", demand: "biscuits, juices, chips, stationery, lunch-box snacks" },
  { mmdd: "06-01", name: "Peak summer", demand: "cold drinks, ice, sherbets, Rooh Afza, lassi and yogurt, ice cream, ORS, mineral water" },
  { mmdd: "07-15", name: "Monsoon", demand: "pakora ingredients (besan, oil), tea, mosquito coils and repellents, candles and matches" },
  { mmdd: "08-14", name: "Independence Day", demand: "flags, badges, green-and-white decorations, sweets" },
  { mmdd: "11-15", name: "Winter and wedding season", demand: "tea and milk, eggs, dry fruits, gur, soup packets, honey, carrots and halwa ingredients, gift packs, cooking oil and rice in bulk" },
];

const DAY_MS = 86_400_000;
const toUtc = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));

export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((toUtc(toYmd) - toUtc(fromYmd)) / DAY_MS);
}

/** Events starting within `horizonDays` of `today`, plus the next Ramadan even if it is further out. */
export function upcomingSeasons(today: string, horizonDays = 150): Array<SeasonEvent & { daysAway: number }> {
  const year = +today.slice(0, 4);
  const yearly: SeasonEvent[] = [year, year + 1].flatMap((y) =>
    YEARLY.map((e) => ({ start: `${y}-${e.mmdd}`, name: e.name, approx: false, demand: e.demand })),
  );
  const all = [...LUNAR, ...yearly]
    .map((e) => ({ ...e, daysAway: daysBetween(today, e.start) }))
    .filter((e) => e.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway);

  const picked = all.filter((e) => e.daysAway <= horizonDays);
  const nextRamadan = all.find((e) => e.name === "Ramadan");
  if (nextRamadan && !picked.includes(nextRamadan)) picked.push(nextRamadan);
  return picked;
}

export function renderSeasons(today: string): string {
  const list = upcomingSeasons(today);
  if (!list.length) return "- none listed";
  return list
    .map((e) => {
      const when = e.daysAway === 0 ? "starts today" : `starts ${e.approx ? "around " : ""}${e.start}, ${e.approx ? "about " : ""}${e.daysAway} days away`;
      return `- ${e.name}: ${when}${e.approx ? " (moon sighting may shift it a day)" : ""}. Usually sells more: ${e.demand}.`;
    })
    .join("\n");
}
