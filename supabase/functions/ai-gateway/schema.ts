/**
 * Tallyn AI Gateway — Zod contracts (Deno Edge Function)
 *
 * Two directions of validation:
 *  1. INBOUND  — StoreContextInput / GatewayRequest: what the browser is
 *     ALLOWED to send. Numbers here are treated as *reported* values that were
 *     deterministically computed by the app from RLS-scoped data; every field
 *     is clamped so a hostile client cannot smuggle huge payloads or negative /
 *     non-finite numbers into the prompt.
 *  2. OUTBOUND — GeminiAnswer: the strict shape the model MUST return. Any
 *     deviation (extra fields, computed arithmetic, oversize text) fails
 *     validation and the raw model output is never returned to the client.
 *
 * Rule 1 of Tallyn: the model never computes numbers. It only frames,
 * translates, and formats the deterministic values handed to it.
 */
import { z } from "https://esm.sh/zod@3.23.8";

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

/** Money / quantity: finite, non-negative, hard-clamped to sane bounds. */
const Money = z
  .number({ invalid_type_error: "must be a number" })
  .finite()
  .nonnegative()
  .max(1_000_000_000); // 1e9 PKR ceiling — anything larger is garbage

const Count = z
  .number()
  .int()
  .finite()
  .nonnegative()
  .max(100_000);

/** Untrusted text: trimmed, length-clamped. Further sanitized in index.ts. */
const ShortText = z.string().trim().max(120);
const MediumText = z.string().trim().max(1000);
const QueryText = z.string().trim().min(1).max(1000);

/* ------------------------------------------------------------------ */
/* 1. INBOUND: what the client may send                                */
/* ------------------------------------------------------------------ */

export const LowStockItemSchema = z
  .object({
    name: ShortText,
    stock: z.number().finite().nonnegative().max(100_000),
    unit: z.string().trim().max(12),
    wholesalePrice: Money.optional(),
  })
  .strict();

export const DebtorSchema = z
  .object({
    name: ShortText,
    balance: Money,
    phone: z.string().trim().max(20).optional(),
  })
  .strict();

/** Exactly the deterministic metrics the app computed from RLS-scoped data. */
export const StoreContextInputSchema = z
  .object({
    shopName: ShortText.optional(),
    shopCity: ShortText.optional(),
    shopAddress: ShortText.optional(),
    totalProducts: Count,
    lowStockItems: z.array(LowStockItemSchema).max(50).default([]),
    topDebtors: z.array(DebtorSchema).max(20).default([]),
    totalUdhaar: Money,
    todaySalesCount: Count,
    todayRevenue: Money,
    recentSalesTotal: Money,
  })
  .strict(); // .strict() rejects unknown keys → no prompt smuggling via extras

export const ConversationTurnSchema = z
  .object({
    role: z.enum(["user", "model"]),
    text: MediumText,
  })
  .strict();

export const FeatureSchema = z.enum([
  "advisor", // general retail advisor chat
  "restock", // inventory replenishment guidance
  "udhaar", // credit (debt) recovery framing
  "mahngai", // inflation / wholesale benchmark framing
]);

export const LanguageSchema = z.enum(["en", "ur", "roman-ur"]);

export const GatewayRequestSchema = z
  .object({
    feature: FeatureSchema,
    query: QueryText,
    language: LanguageSchema.default("roman-ur"),
    context: StoreContextInputSchema,
    history: z.array(ConversationTurnSchema).max(6).default([]),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* 2. OUTBOUND: the only shape we will ever hand back to the client    */
/* ------------------------------------------------------------------ */

/**
 * The model must return strict JSON matching this schema.
 * `numbersProvidedByApp: true` is an attestation field: the model repeats back
 * that it invented no numbers. The harder enforcement is the arithmetic
 * refinement below — if the answer contains `a + b`-style computed sums we
 * reject the whole response and fall back.
 */
export const GeminiAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(4000),
    language: LanguageSchema,
    referenced_metrics: z
      .array(
        z.enum([
          "today_revenue",
          "today_sales_count",
          "total_udhaar",
          "low_stock_items",
          "top_debtors",
          "total_products",
          "recent_sales_total",
        ])
      )
      .max(7)
      .default([]),
    numbersProvidedByApp: z.literal(true), // must be exactly true
  })
  .strict()
  // Guardrail: reject arithmetic the model tried to perform itself
  // (digit <op> digit, including x and unicode ×, ÷).
  .refine(
    (v) =>
      !/\d\s*(\+|\-|\*|\/|x|×|÷|=)\s*\d/.test(v.answer),
    {
      message:
        "Model attempted numeric computation inside the answer; Tallyn computes all math in TypeScript/Postgres only.",
    }
  )
  // Guardrail: reject markdown that tries to embed instructions back at us.
  .refine((v) => !v.answer.includes("```") && !v.answer.includes("<script"), {
    message: "Model output contains forbidden markup.",
  });

/* ------------------------------------------------------------------ */

export type LowStockItem = z.infer<typeof LowStockItemSchema>;
export type Debtor = z.infer<typeof DebtorSchema>;
export type StoreContextInput = z.infer<typeof StoreContextInputSchema>;
export type GatewayRequest = z.infer<typeof GatewayRequestSchema>;
export type GeminiAnswer = z.infer<typeof GeminiAnswerSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type Language = z.infer<typeof LanguageSchema>;
