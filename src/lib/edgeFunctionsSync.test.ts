// Each Supabase Edge Function is deployed on its own, so the AI provider chain lives in two
// identical files. This fails if someone edits one copy and forgets the other.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../../supabase/functions", p), "utf8").replace(/\r\n/g, "\n");

describe("edge function shared code", () => {
  it("bill-scan/providers.ts is an exact copy of ai-gateway/providers.ts", () => {
    expect(read("bill-scan/providers.ts")).toBe(read("ai-gateway/providers.ts"));
  });
});
