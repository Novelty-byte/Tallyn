// Proves the ZXing fallback (used on iPhone / desktop without BarcodeDetector) decodes
// real EAN-13 bars with the same format hints barcodeCamera.ts uses.
import { describe, it, expect } from "vitest";
import {
  MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer,
} from "@zxing/library";

// EAN-13 encoding tables
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function ean13Check(d12: string): string {
  const sum = [...d12].reduce((s, ch, i) => s + Number(ch) * (i % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

function ean13Modules(code: string): string {
  const d = code.split("").map(Number);
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (PARITY[d[0]][i - 1] === "L" ? L : G)[d[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  return bits + "101";
}

/** Render bars as an 8-bit luminance image with a quiet zone (like a sharp camera frame). */
function render(bits: string, moduleWidth = 3, height = 60) {
  const quiet = 12 * moduleWidth;
  const width = bits.length * moduleWidth + quiet * 2;
  const lum = new Uint8ClampedArray(width * height).fill(255);
  for (let y = 0; y < height; y++)
    for (let i = 0; i < bits.length; i++)
      if (bits[i] === "1")
        for (let k = 0; k < moduleWidth; k++) lum[y * width + quiet + i * moduleWidth + k] = 0;
  return { lum, width, height };
}

function decode(code: string) {
  const { lum, width, height } = render(ean13Modules(code));
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128]);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  const result = reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height))));
  return { text: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] };
}

describe("ZXing EAN-13 decoding", () => {
  it.each(["896101412001", "544900000099", "627100000123"])("decodes %s + check digit", (d12) => {
    const code = d12 + ean13Check(d12);
    expect(decode(code)).toEqual({ text: code, format: "EAN_13" });
  });
});
