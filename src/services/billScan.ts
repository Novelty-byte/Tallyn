// Supplier bill scanning — browser side.
//  1. compressImage(): shrink the camera photo (max 1600px, JPEG) before upload.
//  2. scanBillImage(): send it to the `bill-scan` Edge Function. The Gemini key lives
//     only on the server; this file never talks to Google directly.
//  3. parseBillScanResponse(): strict shape check of what came back (never trust it blindly).
// The extracted lines are DRAFTS: nothing is saved until the shopkeeper confirms the review sheet.

export interface BillScanLine {
  /** Item name exactly as printed (may be Urdu script). */
  name: string;
  /** Best-effort English reading of the item, for catalog matching. */
  nameEnglish: string | null;
  quantity: number | null;
  unit: string | null;
  /** Price per unit as printed. */
  unitPrice: number | null;
  /** Line amount as printed. */
  lineTotal: number | null;
}

export interface BillScanResult {
  readable: boolean;
  supplier: string | null;
  invoiceNumber: string | null;
  billDate: string | null;
  billTotal: number | null;
  lines: BillScanLine[];
}

export type BillScanErrorKind =
  | "not_configured" | "rate_limited" | "unreadable" | "too_large"
  | "unavailable" | "network" | "bad_response" | "unsupported_image" | "aborted";

export class BillScanError extends Error {
  constructor(public kind: BillScanErrorKind, message: string) {
    super(message);
    this.name = "BillScanError";
  }
}

/* ------------------------------- compression ------------------------------- */

export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 1600;

export interface CompressedImage {
  base64: string;
  mimeType: "image/jpeg";
  bytes: number;
  width: number;
  height: number;
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img>, which also applies EXIF orientation */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Downscale + re-encode a photo so a bill uploads in ~200–500 KB even on slow mobile data. */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new BillScanError("unsupported_image", "That file is not a photo.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new BillScanError("too_large", "That photo is too large. Please take a new photo.");
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new BillScanError(
      "unsupported_image",
      "This photo format can't be opened here. Take a new photo, or use a JPG or PNG.",
    );
  }

  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new BillScanError("unsupported_image", "Your browser couldn't process the photo.");
  ctx.fillStyle = "#fff"; // transparent PNGs become white paper, not black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();

  const toJpeg = (q: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", q),
    );

  let blob = await toJpeg(0.82);
  if (blob.size > 1_500_000) blob = await toJpeg(0.65);

  return { base64: await blobToBase64(blob), mimeType: "image/jpeg", bytes: blob.size, width, height };
}

/* ------------------------------ response check ------------------------------ */

const MAX_LINES = 80;

function str(v: unknown, max = 160): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function num(v: unknown, max = 100_000_000): number | null {
  if (typeof v === "string" && v.trim() !== "") v = Number(v.replace(/,/g, ""));
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) return null;
  return v;
}

/** Validate the Edge Function payload. Throws BillScanError("bad_response") on anything malformed. */
export function parseBillScanResponse(body: unknown): BillScanResult {
  if (!body || typeof body !== "object") {
    throw new BillScanError("bad_response", "The scanner returned an unexpected answer.");
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.lines)) {
    throw new BillScanError("bad_response", "The scanner returned an unexpected answer.");
  }

  const lines: BillScanLine[] = [];
  for (const raw of b.lines.slice(0, MAX_LINES)) {
    if (!raw || typeof raw !== "object") continue;
    const l = raw as Record<string, unknown>;
    const name = str(l.name);
    if (!name) continue; // a line without a readable name can't be reviewed
    lines.push({
      name,
      nameEnglish: str(l.nameEnglish),
      quantity: num(l.quantity, 1_000_000),
      unit: str(l.unit, 24),
      unitPrice: num(l.unitPrice),
      lineTotal: num(l.lineTotal),
    });
  }

  const billDate = str(b.billDate, 10);
  return {
    readable: b.readable !== false && lines.length > 0,
    supplier: str(b.supplier, 120),
    invoiceNumber: str(b.invoiceNumber, 60),
    billDate: billDate && /^\d{4}-\d{2}-\d{2}$/.test(billDate) ? billDate : null,
    billTotal: num(b.billTotal),
    lines,
  };
}

/* --------------------------------- network --------------------------------- */

const SCAN_TIMEOUT_MS = 120_000; // free-tier AI providers can queue for a while

/**
 * Send a compressed bill photo to the `bill-scan` Edge Function.
 * `accessToken` is the signed-in user's Supabase session token; demo visitors
 * send none and are served under the function's stricter per-visitor limit.
 */
export async function scanBillImage(
  image: Pick<CompressedImage, "base64" | "mimeType">,
  opts: { accessToken?: string | null; signal?: AbortSignal } = {},
): Promise<BillScanResult> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new BillScanError("not_configured", "Bill scanning isn't set up on this server.");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/bill-scan`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${opts.accessToken || anonKey}`,
      },
      body: JSON.stringify({ image: { mimeType: image.mimeType, data: image.base64 } }),
    });
  } catch {
    if (opts.signal?.aborted) throw new BillScanError("aborted", "Scan cancelled.");
    if (controller.signal.aborted) throw new BillScanError("unavailable", "The scanner took too long to answer. Please try again.");
    throw new BillScanError("network", "No internet connection. You can enter the bill by hand.");
  } finally {
    window.clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  const serverMsg = str((body as { error?: unknown } | null)?.error, 300);

  if (!res.ok) {
    switch (res.status) {
      case 404:
        throw new BillScanError("not_configured", "Bill scanning isn't switched on yet (the bill-scan function isn't deployed).");
      case 413:
        throw new BillScanError("too_large", serverMsg ?? "That photo is too large.");
      case 422:
        throw new BillScanError("unreadable", serverMsg ?? "Couldn't read this bill.");
      case 429:
        throw new BillScanError("rate_limited", serverMsg ?? "Daily scan limit reached. Please enter the bill by hand.");
      case 503:
        throw new BillScanError("not_configured", serverMsg ?? "Bill scanning isn't configured on the server.");
      default:
        throw new BillScanError("unavailable", serverMsg ?? "The scanner is unavailable right now.");
    }
  }

  const result = parseBillScanResponse(body);
  if (!result.readable) {
    throw new BillScanError(
      "unreadable",
      "Couldn't find any items on this photo. Lay the bill flat in good light with the whole bill in frame.",
    );
  }
  return result;
}
