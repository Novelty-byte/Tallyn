// Live camera barcode scanning.
//  - Native BarcodeDetector where the browser has it (Chrome/Edge on Android, macOS, ChromeOS):
//    fast and no extra download.
//  - Otherwise ZXing (iPhone Safari, Windows/Linux desktop, Firefox), loaded only when needed.
// Always call stop(): it releases the camera (the phone's camera light goes off).

export type ScanEngine = "native" | "zxing";

export type CameraErrorKind = "insecure" | "unsupported" | "denied" | "not_found" | "in_use" | "unknown";

export class CameraError extends Error {
  constructor(public kind: CameraErrorKind, message: string) {
    super(message);
    this.name = "CameraError";
  }
}

export interface RunningScanner {
  engine: ScanEngine;
  /** Present only when the camera reports a controllable flashlight. */
  setTorch?: (on: boolean) => Promise<void>;
  stop: () => void;
}

/** Formats found on retail goods in Pakistan (EAN/UPC), plus common shelf/QR codes. */
const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
}
interface NativeDetectorCtor {
  new (opts?: { formats?: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

function toCameraError(err: unknown): CameraError {
  const name = (err as { name?: string } | null)?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new CameraError("denied", "Camera permission was blocked. Allow the camera for this site in your browser settings, then try again.");
    case "NotFoundError":
    case "OverconstrainedError":
      return new CameraError("not_found", "No camera was found on this device.");
    case "NotReadableError":
    case "AbortError":
      return new CameraError("in_use", "The camera is busy in another app or tab. Close it and try again.");
    default:
      return new CameraError("unknown", "The camera couldn't start. You can type the barcode instead.");
  }
}

async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new CameraError("insecure", "The camera only works on a secure (https) page.");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError("unsupported", "This browser can't use the camera. You can type the barcode instead.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    throw toCameraError(err);
  }
}

async function nativeDetector(): Promise<NativeDetector | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = (await Ctor.getSupportedFormats?.()) ?? [];
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    // Retail barcodes are EAN/UPC; without them the native detector is no use here.
    if (!formats.includes("ean_13")) return null;
    return new Ctor({ formats });
  } catch {
    return null;
  }
}

function torchControl(stream: MediaStream): RunningScanner["setTorch"] {
  const track = stream.getVideoTracks()[0];
  const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
  if (!caps.torch) return undefined;
  return (on: boolean) => track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
}

/**
 * Start the camera in `video` and call `onDetect` for every barcode read
 * (the caller de-duplicates with createScanGate).
 */
export async function startCameraScanner(
  video: HTMLVideoElement,
  onDetect: (code: string, format: string) => void,
): Promise<RunningScanner> {
  const stream = await openCamera();
  const stopTracks = () => stream.getTracks().forEach((t) => t.stop());

  try {
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", "true"); // iOS: don't go fullscreen
    await video.play();
  } catch (err) {
    stopTracks();
    throw toCameraError(err);
  }

  const setTorch = torchControl(stream);

  // ---- native path ----
  const detector = await nativeDetector();
  if (detector) {
    let running = true;
    let timer: number | undefined;
    const tick = async () => {
      if (!running) return;
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          if (running) for (const c of codes) if (c.rawValue) onDetect(c.rawValue, c.format);
        } catch {
          /* a frame can fail to decode; keep going */
        }
      }
      if (running) timer = window.setTimeout(tick, 120);
    };
    void tick();
    return {
      engine: "native",
      setTorch,
      stop: () => {
        running = false;
        window.clearTimeout(timer);
        stopTracks();
        video.srcObject = null;
      },
    };
  }

  // ---- ZXing fallback (lazy-loaded chunk) ----
  try {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 120 });
    const controls = await reader.decodeFromVideoElement(video, (result) => {
      if (result) onDetect(result.getText(), String(BarcodeFormat[result.getBarcodeFormat()] ?? "unknown"));
    });
    return {
      engine: "zxing",
      setTorch,
      stop: () => {
        controls.stop();
        stopTracks();
        video.srcObject = null;
      },
    };
  } catch (err) {
    stopTracks();
    video.srcObject = null;
    throw err instanceof CameraError ? err : new CameraError("unknown", "The barcode reader couldn't start. You can type the barcode instead.");
  }
}
