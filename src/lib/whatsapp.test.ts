import { describe, it, expect } from "vitest";
import { buildUdhaarReminder, buildWhatsAppUrl, formatFriendlyDate, toWhatsAppNumber } from "./whatsapp";

describe("toWhatsAppNumber", () => {
  it.each([
    ["03001234567", "923001234567"],
    ["0300-1234567", "923001234567"],
    ["+92 300 1234567", "923001234567"],
    ["923001234567", "923001234567"],
    ["3001234567", "923001234567"],
    ["0092 300 1234567", "923001234567"],
  ])("%s -> %s", (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });

  it("rejects numbers that are not Pakistani mobiles", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber("051-1234567")).toBeNull();
    expect(toWhatsAppNumber("12345")).toBeNull();
  });
});

describe("buildUdhaarReminder", () => {
  const base = { customerName: "Asif Bhai", shopName: "Madina Store", balance: 3400 };

  it("is Urdu-friendly English with the exact amount", () => {
    const msg = buildUdhaarReminder(base, "2026-11-14");
    expect(msg).toContain("Assalam-o-Alaikum Asif Bhai!");
    expect(msg).toContain("Madina Store ki taraf se");
    expect(msg).toContain("PKR 3,400 udhaar baqi hai.");
    expect(msg).toContain("Bohat shukriya!");
    expect(msg).not.toMatch(/[؀-ۿ]/); // no Urdu script
  });

  it("mentions an overdue date in the past tense", () => {
    const msg = buildUdhaarReminder({ ...base, nextDueDate: "2026-11-07" }, "2026-11-14");
    expect(msg).toContain("Yeh payment 7 Nov 2026 tak due thi.");
  });

  it("mentions a future due date", () => {
    const msg = buildUdhaarReminder({ ...base, nextDueDate: "2026-11-21" }, "2026-11-14");
    expect(msg).toContain("Due date 21 Nov 2026 hai.");
  });

  it("handles a payment due today", () => {
    const msg = buildUdhaarReminder({ ...base, nextDueDate: "2026-11-14" }, "2026-11-14");
    expect(msg).toContain("aaj (14 Nov 2026) due hai");
  });
});

describe("helpers", () => {
  it("formats dates without timezone drift", () => {
    expect(formatFriendlyDate("2027-01-01")).toBe("1 Jan 2027");
  });
  it("builds a wa.me link or null for a bad number", () => {
    expect(buildWhatsAppUrl("0300-1234567", "Hi there")).toBe("https://wa.me/923001234567?text=Hi%20there");
    expect(buildWhatsAppUrl("123", "Hi")).toBeNull();
  });
});
