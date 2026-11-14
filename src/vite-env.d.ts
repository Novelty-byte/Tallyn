/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_AI_BASE_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* Minimal Web Speech API typings (not yet in lib.dom for all TS versions). */
interface SpeechRecognitionAlternativeLite { transcript: string; confidence: number }
interface SpeechRecognitionResultLite { readonly length: number; [index: number]: SpeechRecognitionAlternativeLite }
interface SpeechRecognitionEvent extends Event {
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultLite };
}
interface SpeechRecognitionErrorEvent extends Event { readonly error: string }
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
