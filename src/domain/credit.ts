// Deterministic Udhaar (credit) engine.
// Inviolable Rule 1: every balance, due date and overdue figure is computed here, never by AI.
//
// Model:
//  - Every credit sale carries its own due date (default: sale date + DEFAULT_CREDIT_TERM_DAYS).
//  - Payments are applied FIFO to the oldest open credit sales.
//  - A customer's "next due date" is the earliest due date among sales still (partly) unpaid.
//  - "Overdue" means today is past that date; the due day itself is not overdue.
//
// Dates are calendar days ("YYYY-MM-DD") in the shop's local time, compared as UTC midnights
// so daylight-saving or timezone offsets never shift a day count.

export const DEFAULT_CREDIT_TERM_DAYS = 7;

const DAY_MS = 86_400_000;

/** Local calendar date of `d` as YYYY-MM-DD. */
export function toLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** `ymd` shifted by `days` calendar days. */
export function addDays(ymd: string, days: number): string {
  return new Date(ymdToUtcMs(ymd) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Signed whole-day difference `to - from`. */
export function dayDiff(from: string, to: string): number {
  return Math.round((ymdToUtcMs(to) - ymdToUtcMs(from)) / DAY_MS);
}

/** Default due date for a credit sale made on `fromYmd` (today by default). */
export function defaultDueDate(fromYmd: string = toLocalYmd(), termDays = DEFAULT_CREDIT_TERM_DAYS): string {
  return addDays(fromYmd, termDays);
}

/** Days past the due date (0 when not yet due, due today, or no date). */
export function daysOverdue(dueDate: string | undefined | null, todayYmd: string = toLocalYmd()): number {
  if (!dueDate) return 0;
  return Math.max(dayDiff(dueDate, todayYmd), 0);
}

/** Days until the due date (negative once overdue). */
export function daysUntilDue(dueDate: string, todayYmd: string = toLocalYmd()): number {
  return dayDiff(todayYmd, dueDate);
}

/** Overdue days for a customer, or 0 when they owe nothing / are not past due. */
export function customerOverdueDays(
  c: { creditBalance: number; nextDueDate?: string },
  todayYmd: string = toLocalYmd(),
): number {
  return c.creditBalance > 0 ? daysOverdue(c.nextDueDate, todayYmd) : 0;
}

export interface CreditSaleLine {
  id: string;
  amount: number;
  /** ISO timestamp of the sale. */
  createdAt: string;
  /** YYYY-MM-DD; when missing, sale date + term is used. */
  dueDate?: string | null;
}

export interface OpenCreditSale {
  id: string;
  remaining: number;
  dueDate: string;
}

export interface CreditSummary {
  /** Owed minus paid. Negative means the customer has paid in advance. */
  balance: number;
  openSales: OpenCreditSale[];
  /** Earliest due date among sales that are still not fully paid. */
  nextDueDate?: string;
}

/**
 * Apply `totalPaid` FIFO across credit sales (oldest sale first).
 * Works in integer paisa so repeated partial payments never drift.
 */
export function summarizeCredit(
  sales: CreditSaleLine[],
  totalPaid: number,
  termDays = DEFAULT_CREDIT_TERM_DAYS,
): CreditSummary {
  const toPaisa = (n: number) => Math.round(n * 100);
  const ordered = [...sales].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const paidP = Math.max(toPaisa(totalPaid), 0);
  let unapplied = paidP;
  let owedP = 0;
  const openSales: OpenCreditSale[] = [];

  for (const s of ordered) {
    const amt = Math.max(toPaisa(s.amount), 0);
    owedP += amt;
    const applied = Math.min(amt, unapplied);
    unapplied -= applied;
    const left = amt - applied;
    if (left > 0) {
      openSales.push({
        id: s.id,
        remaining: left / 100,
        dueDate: s.dueDate ? s.dueDate.slice(0, 10) : addDays(toLocalYmd(new Date(s.createdAt)), termDays),
      });
    }
  }

  const nextDueDate = openSales.map((o) => o.dueDate).sort()[0];
  return { balance: (owedP - paidP) / 100, openSales, nextDueDate };
}
