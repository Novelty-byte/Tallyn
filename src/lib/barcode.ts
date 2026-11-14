// Barcode helpers — pure and unit-tested. Used by the camera scanner, the manual
// barcode box, and handheld USB/Bluetooth scanners (which "type" the code + Enter).

import type { Product } from "@/types";

/** Strip whitespace / control characters a scanner or camera might add. */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[\s\u0000-\u001f\u007f]/g, "").trim();
}

/**
 * Codes that identify the same item: a 12-digit UPC-A is the same product as the
 * 13-digit EAN-13 with a leading 0 (cameras and printers report either form).
 */
export function equivalentBarcodes(code: string): string[] {
  const c = normalizeBarcode(code);
  const out = new Set([c]);
  if (/^\d{12}$/.test(c)) out.add(`0${c}`);
  if (/^0\d{12}$/.test(c)) out.add(c.slice(1));
  return Array.from(out);
}

export function findProductByBarcode(products: Product[], code: string): Product | undefined {
  const keys = new Set(equivalentBarcodes(code));
  if (keys.size === 0 || [...keys][0] === "") return undefined;
  return products.find((p) => p.barcode && equivalentBarcodes(p.barcode).some((k) => keys.has(k)));
}

/**
 * Cameras report the same barcode many times per second. Accept a code, then ignore
 * that SAME code until it has been out of view for `cooldownMs` — so holding an item
 * in front of the camera adds it once, while scanning a second unit (after a pause)
 * or a different item works straight away.
 */
export function createScanGate(cooldownMs = 1500) {
  let lastCode: string | null = null;
  let lastSeen = -Infinity;
  return {
    accept(code: string, now: number): boolean {
      const same = code === lastCode;
      const fresh = !same || now - lastSeen > cooldownMs;
      lastCode = code;
      lastSeen = now; // seeing it again keeps it "held"
      return fresh;
    },
    reset() {
      lastCode = null;
      lastSeen = -Infinity;
    },
  };
}

/**
 * Detects a handheld barcode scanner acting as a keyboard: a fast burst of
 * printable keys (each < maxGapMs apart) ending in Enter. Human typing is too slow
 * to trigger it. Feed every keydown; returns the code when a burst completes.
 */
export function createKeyboardWedgeDetector(opts: { minLength?: number; maxGapMs?: number } = {}) {
  const minLength = opts.minLength ?? 6;
  const maxGapMs = opts.maxGapMs ?? 50;
  let buffer = "";
  let lastAt = -Infinity;
  return {
    feed(key: string, at: number): string | null {
      if (at - lastAt > maxGapMs) buffer = "";
      lastAt = at;
      if (key === "Enter") {
        const code = buffer;
        buffer = "";
        return code.length >= minLength ? code : null;
      }
      if (key.length === 1) buffer += key;
      else buffer = ""; // Shift, arrows, etc. break the burst
      return null;
    },
  };
}
