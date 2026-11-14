import { describe, it, expect } from "vitest";
import {
  addDays, dayDiff, defaultDueDate, daysOverdue, daysUntilDue,
  customerOverdueDays, summarizeCredit, toLocalYmd,
} from "@/domain/credit";

describe("calendar helpers", () => {
  it("adds days across month and leap-year boundaries", () => {
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("computes signed day differences", () => {
    expect(dayDiff("2026-11-14", "2026-11-21")).toBe(7);
    expect(dayDiff("2026-11-21", "2026-11-14")).toBe(-7);
  });

  it("defaults the due date to 7 days after the sale", () => {
    expect(defaultDueDate("2026-11-14")).toBe("2026-11-21");
    expect(defaultDueDate("2026-11-14", 30)).toBe("2026-12-14");
  });

  it("formats local dates as YYYY-MM-DD", () => {
    expect(toLocalYmd(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("daysOverdue", () => {
  it("is 0 before and on the due date", () => {
    expect(daysOverdue("2026-11-21", "2026-11-14")).toBe(0);
    expect(daysOverdue("2026-11-21", "2026-11-21")).toBe(0);
  });
  it("counts whole days after the due date", () => {
    expect(daysOverdue("2026-11-21", "2026-11-22")).toBe(1);
    expect(daysOverdue("2026-11-01", "2026-11-14")).toBe(13);
  });
  it("is 0 with no due date", () => {
    expect(daysOverdue(undefined, "2026-11-14")).toBe(0);
  });
  it("daysUntilDue goes negative once overdue", () => {
    expect(daysUntilDue("2026-11-21", "2026-11-14")).toBe(7);
    expect(daysUntilDue("2026-11-10", "2026-11-14")).toBe(-4);
  });
  it("customers who owe nothing are never overdue", () => {
    expect(customerOverdueDays({ creditBalance: 0, nextDueDate: "2026-10-01" }, "2026-11-14")).toBe(0);
    expect(customerOverdueDays({ creditBalance: 500, nextDueDate: "2026-11-10" }, "2026-11-14")).toBe(4);
  });
});

describe("summarizeCredit (FIFO payment allocation)", () => {
  const sales = [
    { id: "s2", amount: 1000, createdAt: "2026-11-05T10:00:00Z", dueDate: "2026-11-12" },
    { id: "s1", amount: 500, createdAt: "2026-11-01T10:00:00Z", dueDate: "2026-11-08" },
    { id: "s3", amount: 300, createdAt: "2026-11-10T10:00:00Z", dueDate: "2026-11-17" },
  ];

  it("with no payments, the oldest sale's due date is next", () => {
    const r = summarizeCredit(sales, 0);
    expect(r.balance).toBe(1800);
    expect(r.openSales.map((o) => o.id)).toEqual(["s1", "s2", "s3"]);
    expect(r.nextDueDate).toBe("2026-11-08");
  });

  it("a payment clears the oldest sale first and moves the due date forward", () => {
    const r = summarizeCredit(sales, 500);
    expect(r.balance).toBe(1300);
    expect(r.openSales.map((o) => o.id)).toEqual(["s2", "s3"]);
    expect(r.nextDueDate).toBe("2026-11-12");
  });

  it("partial payment leaves the remainder on the oldest open sale", () => {
    const r = summarizeCredit(sales, 700);
    expect(r.openSales[0]).toEqual({ id: "s2", remaining: 800, dueDate: "2026-11-12" });
  });

  it("full payment leaves no open sales and no due date", () => {
    const r = summarizeCredit(sales, 1800);
    expect(r.balance).toBe(0);
    expect(r.openSales).toEqual([]);
    expect(r.nextDueDate).toBeUndefined();
  });

  it("overpayment shows as a negative balance (advance)", () => {
    const r = summarizeCredit(sales, 2000);
    expect(r.balance).toBe(-200);
    expect(r.nextDueDate).toBeUndefined();
  });

  it("does not drift with fractional paisa amounts", () => {
    const r = summarizeCredit(
      [{ id: "a", amount: 0.1, createdAt: "2026-11-01T00:00:00Z" }, { id: "b", amount: 0.2, createdAt: "2026-11-02T00:00:00Z" }],
      0.3,
    );
    expect(r.balance).toBe(0);
    expect(r.openSales).toEqual([]);
  });

  it("falls back to sale date + term when a sale has no due date", () => {
    const r = summarizeCredit([{ id: "x", amount: 100, createdAt: new Date(2026, 10, 1, 12).toISOString(), dueDate: null }], 0);
    expect(r.nextDueDate).toBe("2026-11-08");
  });
});
