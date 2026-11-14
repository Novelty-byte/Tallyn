import { describe, it, expect } from "vitest";
import type { Product } from "@/types";
import {
  normalizeBarcode, equivalentBarcodes, findProductByBarcode, createScanGate, createKeyboardWedgeDetector,
} from "@/domain/barcode";

const p = (id: string, barcode?: string): Product => ({
  id, nameEn: id, category: "staples", quantity: 5, buyPrice: 1, sellPrice: 2, minQuantity: 1, unit: "pc", barcode,
});

describe("barcode lookup", () => {
  const products = [p("tea", "896101412001"), p("cola", "5449000000996"), p("nocode")];

  it("normalises scanner noise", () => {
    expect(normalizeBarcode(" 8961 0141\t2001\r\n")).toBe("896101412001");
  });
  it("finds exact codes", () => {
    expect(findProductByBarcode(products, "5449000000996")?.id).toBe("cola");
  });
  it("treats UPC-A and EAN-13-with-leading-zero as the same item", () => {
    expect(equivalentBarcodes("896101412001")).toEqual(["896101412001", "0896101412001"]);
    expect(findProductByBarcode(products, "0896101412001")?.id).toBe("tea");
  });
  it("returns nothing for unknown or empty codes", () => {
    expect(findProductByBarcode(products, "123")).toBeUndefined();
    expect(findProductByBarcode(products, "  ")).toBeUndefined();
  });
});

describe("createScanGate", () => {
  it("accepts a held barcode once", () => {
    const g = createScanGate(1500);
    expect(g.accept("A", 0)).toBe(true);
    expect(g.accept("A", 200)).toBe(false);
    expect(g.accept("A", 1600)).toBe(false); // still in view (seen at 200..1600)
  });
  it("accepts the same code again after it left the view", () => {
    const g = createScanGate(1500);
    g.accept("A", 0);
    expect(g.accept("A", 2000)).toBe(true);
  });
  it("accepts a different code immediately", () => {
    const g = createScanGate(1500);
    g.accept("A", 0);
    expect(g.accept("B", 100)).toBe(true);
    expect(g.accept("A", 200)).toBe(true);
  });
});

describe("createKeyboardWedgeDetector", () => {
  const typeBurst = (d: ReturnType<typeof createKeyboardWedgeDetector>, text: string, start: number, gap: number) => {
    let out: string | null = null;
    [...text].forEach((ch, i) => { out = d.feed(ch, start + i * gap) ?? out; });
    return d.feed("Enter", start + text.length * gap) ?? out;
  };

  it("recognises a fast scanner burst", () => {
    expect(typeBurst(createKeyboardWedgeDetector(), "896101412001", 0, 8)).toBe("896101412001");
  });
  it("ignores human typing speed", () => {
    expect(typeBurst(createKeyboardWedgeDetector(), "896101412001", 0, 180)).toBeNull();
  });
  it("ignores short bursts", () => {
    expect(typeBurst(createKeyboardWedgeDetector(), "123", 0, 5)).toBeNull();
  });
});
