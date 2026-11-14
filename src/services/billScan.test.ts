import { describe, it, expect } from "vitest";
import { parseBillScanResponse, BillScanError } from "@/services/billScan";

describe("parseBillScanResponse", () => {
  it("accepts a well-formed scan", () => {
    const r = parseBillScanResponse({
      readable: true,
      supplier: "  Metro Cash & Carry ",
      invoiceNumber: "MW-9812",
      billDate: "2026-11-14",
      billTotal: 6960,
      lines: [{ name: "Tapal Danedar 450g", nameEnglish: "Tapal Danedar Tea 450g", quantity: 12, unit: "pack", unitPrice: 580, lineTotal: 6960 }],
    });
    expect(r.readable).toBe(true);
    expect(r.supplier).toBe("Metro Cash & Carry");
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].unitPrice).toBe(580);
  });

  it("nulls out bad numbers instead of trusting them", () => {
    const r = parseBillScanResponse({
      lines: [{ name: "Oil", quantity: -3, unitPrice: "1,250", lineTotal: Infinity }],
    });
    expect(r.lines[0].quantity).toBeNull();
    expect(r.lines[0].unitPrice).toBe(1250); // "1,250" printed with a comma
    expect(r.lines[0].lineTotal).toBeNull();
  });

  it("drops lines without a name and rejects bad dates", () => {
    const r = parseBillScanResponse({ billDate: "14/11/2026", lines: [{ name: "  " }, { name: "Sugar" }] });
    expect(r.lines.map((l) => l.name)).toEqual(["Sugar"]);
    expect(r.billDate).toBeNull();
  });

  it("is unreadable when no lines survive", () => {
    expect(parseBillScanResponse({ readable: true, lines: [] }).readable).toBe(false);
    expect(parseBillScanResponse({ readable: false, lines: [{ name: "x" }] }).readable).toBe(false);
  });

  it("throws on a malformed payload", () => {
    expect(() => parseBillScanResponse(null)).toThrow(BillScanError);
    expect(() => parseBillScanResponse({ lines: "nope" })).toThrow(BillScanError);
  });

  it("caps the number of lines", () => {
    const r = parseBillScanResponse({ lines: Array.from({ length: 200 }, (_, i) => ({ name: `Item ${i}` })) });
    expect(r.lines).toHaveLength(80);
  });
});
