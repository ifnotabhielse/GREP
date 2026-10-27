import { describe, expect, it } from "vitest";
import { formatDate, formatMonth, formatTime, nbspTimes, upcomingMonths } from "../../lib/format";
import { bandPosition, paceToSec, secToPace } from "../../lib/pace";
import { EMPTY_INPUT, normPhone, toRow, validateAll, validateStep, type ApplicationInput } from "../../lib/application";

describe("format (IST)", () => {
  it("formats dates like Sun, 17 Jan 2027", () => {
    expect(formatDate("2027-01-17")).toBe("Sun, 17 Jan 2027");
    expect(formatDate("2026-11-02")).toBe("Mon, 2 Nov 2026");
  });
  it("uses IST for timestamps near midnight UTC", () => {
    // 20:00 UTC on 16 Jan = 01:30 IST on 17 Jan
    expect(formatDate(new Date("2027-01-16T20:00:00Z"))).toBe("Sun, 17 Jan 2027");
  });
  it("formats times like 6:00 AM", () => {
    expect(formatTime(new Date("2026-11-02T00:30:00Z"))).toBe("6:00 AM");
    expect(formatTime(new Date("2026-11-02T13:15:00Z"))).toBe("6:45 PM");
  });
  it("formats months", () => expect(formatMonth("2027-02-01")).toBe("February 2027"));
  it("keeps times on one line", () => expect(nbspTimes("Tue and Thu, 5:45 AM")).toBe("Tue and Thu, 5:45 AM"));
  it("lists this month plus 14", () => {
    const m = upcomingMonths(15, new Date("2026-10-27T10:00:00Z"));
    expect(m).toHaveLength(15);
    expect(m[0]).toEqual({ value: "2026-10", label: "October 2026" });
    expect(m[14].value).toBe("2027-12");
  });
});

describe("pace", () => {
  it("parses m:ss and m.ss", () => {
    expect(paceToSec("6:45")).toBe(405);
    expect(paceToSec("6.45")).toBe(405);
    expect(paceToSec("12:00")).toBe(720);
    expect(paceToSec("6:75")).toBeNaN();
    expect(paceToSec("fast")).toBeNaN();
  });
  it("formats", () => expect(secToPace(390)).toBe("6:30"));
  it("matches the static page's band positions", () => {
    expect(bandPosition(390, 435)).toEqual({ left: 28.57, width: 21.43 });
    expect(bandPosition(450, 510)).toEqual({ left: 57.14, width: 28.57 });
    expect(bandPosition(420, 480)).toEqual({ left: 42.86, width: 28.57 });
  });
});

const good: ApplicationInput = {
  ...EMPTY_INPUT,
  name: "Abhi Singh", age: "23", email: "Abhi@Example.com", area: "Gachibowli", phone: "98765 43210",
  activity: "Running", target: "Half marathon under 2:30", month: "2027-02", level: "Consistent", sessions: "3-4",
  pace: "6.45", distance: "25", devices: ["Strava", "Garmin"], days: ["Sat", "Tue"], times: ["early_morning"], consent: true,
};

describe("application rules", () => {
  it("passes a complete sign-up", () => expect(validateAll(good)).toBeNull());
  it.each([
    ["17", false], ["18", true], ["80", true], ["81", false], ["27.5", false], ["", false],
  ])("age %s → valid=%s", (age, ok) => {
    expect(validateStep(0, { ...good, age }).some(([k]) => k === "f-age")).toBe(!ok);
  });
  it.each([
    ["9876543210", true], ["+91 98765 43210", true], ["09876543210", true], ["919876543210", true],
    ["5876543210", false], ["987654321", false], ["98765432100", false],
  ])("phone %s → valid=%s", (phone, ok) => {
    expect(validateStep(0, { ...good, phone }).some(([k]) => k === "f-phone")).toBe(!ok);
  });
  it.each([["2:59", false], ["3:00", true], ["12:00", true], ["12:01", false], ["6:4", false]])(
    "pace %s → valid=%s",
    (pace, ok) => expect(validateStep(2, { ...good, pace }).some(([k]) => k === "f-pace")).toBe(!ok),
  );
  it("ignores pace for activities that don't show it", () => {
    expect(validateStep(2, { ...good, activity: "HYROX", pace: "nonsense" })).toEqual([]);
    expect(toRow({ ...good, activity: "HYROX" }).easy_pace_sec).toBeNull();
  });
  it("requires an email", () => expect(validateStep(0, { ...good, email: "abhi" })[0][0]).toBe("f-email"));
  it("requires 'Other' city text", () => {
    expect(validateStep(0, { ...good, city: "Other" })[0][0]).toBe("f-city-other");
    expect(toRow({ ...good, city: "Other", cityOther: "Kolkata" }).city).toBe("Kolkata");
  });
  it("requires consent, days and times", () => {
    expect(validateStep(3, { ...good, consent: false, days: [], times: [] }).map(([k]) => k)).toEqual(["days", "times", "f-consent"]);
  });
  it("rejects values outside the lists", () => {
    expect(validateStep(3, { ...good, days: ["Funday"] })[0][0]).toBe("days");
    expect(validateStep(1, { ...good, activity: "Chess" })[0][0]).toBe("activity");
  });
  it("reports the first failing step", () => expect(validateAll({ ...good, level: "" })?.step).toBe(2));
  it("normalises the row", () => {
    expect(normPhone("+91 98765-43210")).toBe("9876543210");
    expect(toRow(good)).toMatchObject({
      email: "abhi@example.com", phone: "+919876543210", age: 23, target_month: "2027-02-01",
      easy_pace_sec: 405, weekly_km: 25, days: ["Tue", "Sat"], devices: ["Garmin", "Strava"], times: ["early_morning"],
    });
  });
});
