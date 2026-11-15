/**
 * Tallyn AI — request contract (Deno Edge Function).
 *
 * The browser sends the shopkeeper's question plus a STORE SNAPSHOT that the app
 * computed in tested code (src/domain/storeSnapshot.ts). Everything is clamped here so a
 * hostile client can't smuggle huge payloads, non-finite numbers or markup into the
 * prompt. Names (products, customers, shop) are untrusted text: control characters,
 * angle brackets and backticks are stripped.
 */
import { z } from "https://esm.sh/zod@3.23.8";

const Text = (max: number) =>
  z.string().transform((s) => s.replace(/[\u0000-\u001f<>`]/g, " ").replace(/\s+/g, " ").trim().slice(0, max));

const Money = z.number().finite().min(-1_000_000_000).max(1_000_000_000);
const Qty = z.number().finite().min(-1_000_000).max(1_000_000);
const Count = z.number().int().nonnegative().max(1_000_000);
const Ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SnapshotSchema = z.object({
  shopName: Text(120),
  city: Text(80),
  currency: Text(8),
  date: Ymd,
  today: z.object({ revenue: Money, salesCount: Count, cash: Money, credit: Money, grossProfit: Money }).strict(),
  last7Days: z.object({ revenue: Money, salesCount: Count, grossProfit: Money }).strict(),
  udhaar: z.object({ total: Money, customersOwing: Count, overdueCustomers: Count }).strict(),
  stock: z.object({ productCount: Count, lowStockCount: Count }).strict(),
  expensesThisMonth: Money,
  products: z.array(z.object({
    name: Text(100), category: Text(30), stock: Qty, unit: Text(16),
    buyPrice: Money, sellPrice: Money, minStock: Qty, low: z.boolean(),
  }).strict()).max(80),
  customers: z.array(z.object({
    name: Text(80), balance: Money, overdueDays: Count, nextDueDate: Ymd.nullable(),
  }).strict()).max(40),
  topSellers7d: z.array(z.object({ name: Text(100), units: Qty, revenue: Money }).strict()).max(8),
  notSold30d: z.array(z.object({ name: Text(100), stock: Qty, stockValueAtCost: Money }).strict()).max(10),
  notSold30dSummary: z.object({ itemCount: Count, valueAtCost: Money }).strict(),
}).strict();

export const AskRequestSchema = z.object({
  question: Text(1000).pipe(z.string().min(1, "question is empty")),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: Text(2000),
  }).strict()).max(8).default([]),
  snapshot: SnapshotSchema,
  /** "chat" (default) answers the question; "radio" writes one spoken tip for Kiryana Radio. */
  mode: z.enum(["chat", "radio"]).default("chat"),
  radio: z.object({
    language: z.enum(["English", "Urdu"]),
    script: z.enum(["latin", "urdu", "devanagari"]).default("latin"),
  }).strict().optional(),
}).strict().refine((r) => r.mode !== "radio" || r.radio !== undefined, {
  message: "radio settings are required in radio mode", path: ["radio"],
});

export const AnswerSchema = z.string().trim().min(1).max(4000);

export type Snapshot = z.infer<typeof SnapshotSchema>;
export type AskRequest = z.infer<typeof AskRequestSchema>;
