// WhatsApp udhaar reminders — deterministic template, no AI.
// Tone: the "Urdu-friendly English" shopkeepers actually type on WhatsApp — Roman Urdu
// courtesy words mixed with simple English, never pure Urdu script and never stiff English.
// Every number (amount, date) comes from the credit engine; the template only places it.

import { formatCurrency } from "@/lib/utils";
import { daysOverdue, toLocalYmd } from "@/lib/credit";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-21" -> "21 Nov 2026" (no locale/timezone dependence). */
export function formatFriendlyDate(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Pakistani mobile number -> wa.me format (92XXXXXXXXXX), or null if it doesn't look valid.
 * Accepts 03001234567, 0300-1234567, +92 300 1234567, 923001234567, 3001234567.
 */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^923\d{9}$/.test(digits)) return digits;
  if (/^03\d{9}$/.test(digits)) return `92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `92${digits}`;
  if (/^00923\d{9}$/.test(digits)) return digits.slice(2);
  return null;
}

export interface ReminderInput {
  customerName: string;
  shopName: string;
  balance: number;
  /** YYYY-MM-DD of the oldest unpaid credit sale. */
  nextDueDate?: string;
  currency?: string;
}

export function buildUdhaarReminder(r: ReminderInput, todayYmd: string = toLocalYmd()): string {
  const amount = formatCurrency(r.balance, r.currency);
  let dueLine = "";
  if (r.nextDueDate) {
    const when = formatFriendlyDate(r.nextDueDate);
    dueLine = daysOverdue(r.nextDueDate, todayYmd) > 0
      ? ` Yeh payment ${when} tak due thi.`
      : r.nextDueDate === todayYmd
        ? ` Yeh payment aaj (${when}) due hai.`
        : ` Due date ${when} hai.`;
  }
  return [
    `Assalam-o-Alaikum ${r.customerName}! 🙏`,
    `${r.shopName} ki taraf se a gentle reminder: aap ke account par ${amount} udhaar baqi hai.${dueLine}`,
    `Jab bhi aap ko convenient ho, please clear kar dijiye ga.`,
    `Bohat shukriya! 😊`,
  ].join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
