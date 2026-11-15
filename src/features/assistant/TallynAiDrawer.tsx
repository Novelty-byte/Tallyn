import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/services/supabaseClient";
import { buildStoreSnapshot, type StoreSnapshot } from "@/domain/storeSnapshot";
import { askTallyn, AskTallynError, type ChatTurn } from "@/services/tallynAi";
import { inlineMarkdownToSafeHtml } from "@/lib/chatMarkdown";
import { validateAgentAction, type AgentAction } from "@/domain/agentActions";
import { AgentActionCard, type ActionStatus } from "@/features/assistant/AgentActionCard";
import {
  X,
  Send,
  Sparkles,
  Bot,
  Loader2,
  Package,
  AlertTriangle,
} from "lucide-react";

interface Message {
  sender: "user" | "tallyn";
  text: string;
  isLoading?: boolean;
  /** An action Tallyn AI proposed; saved only when the shopkeeper approves the card. */
  action?: AgentAction;
  /** Kept on the message so a closed-and-reopened drawer never re-offers a done action. */
  actionStatus?: ActionStatus;
}

// ─── Component ──────────────────────────────────────────────────────────────
export const TallynAiDrawer: React.FC = () => {
  const {
    isAskTallynOpen,
    setIsAskTallynOpen,
    products,
    customers,
    sales,
    shop,
    expenses,
    isDemoMode,
  } = useApp();

  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Initial greeting message ───────────────────────────────────────────────
  const makeGreeting = () => ({
    sender: "tallyn" as const,
    text: `Assalam-o-Alaikum! I'm **Tallyn AI** — your store advisor for **${shop.name}**.\n\nI can see your full inventory (${products.length} products), customer ledger, and sales data. Ask me about your store, how to use Tallyn, or anything about running your business: what to stock for Ramadan or Eid, pricing, suppliers, collecting udhaar and more.

I can also **do things for you**: record a sale or udhaar, a purchase, a payment received, or send a WhatsApp reminder. I'll prepare it and you approve it.`,
  });

  const [messages, setMessages] = useState<Message[]>([makeGreeting()]);

  // Reset on shop change
  useEffect(() => {
    setMessages([makeGreeting()]);
    setHistory([]);
  }, [shop.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isAskTallynOpen) return null;

  // ── Send handler ───────────────────────────────────────────────────────────
  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isThinking) return;

    setMessages((prev) => [...prev, { sender: "user", text: q }]);
    setInputQuery("");
    setIsThinking(true);
    setMessages((prev) => [...prev, { sender: "tallyn", text: "...", isLoading: true }]);

    // Every number the AI may quote is computed here, in tested code (lib/askContext).
    const snapshot = buildStoreSnapshot({ shop, products, customers, sales, expenses });

    try {
      const accessToken = isDemoMode ? null : (await supabase.auth.getSession()).data.session?.access_token ?? null;
      // Names + ids the AI may propose actions on; it sees them only as codes (P1…, C1…).
      const refs = {
        products: products.map((p) => ({ id: p.id, name: p.nameEn, ...(p.nameUr ? { nameUr: p.nameUr } : {}) })),
        customers: customers.map((c) => ({ id: c.id, name: c.name })),
      };
      const result = await askTallyn({ question: q, history, snapshot, refs, accessToken });
      const answer = result.answer;
      const action = validateAgentAction(result.action, products, customers) ?? undefined;

      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, { sender: "tallyn", text: answer, action, actionStatus: action ? { state: "pending" } : undefined }];
      });
      setHistory((prev) => [
        ...prev.slice(-6), // keep the last few turns
        { role: "user", text: q },
        { role: "assistant", text: answer },
      ]);
    } catch (err) {
      // Fail open: answer from the same computed snapshot, and say why AI isn't answering.
      const note =
        err instanceof AskTallynError && err.kind === "rate_limited"
          ? err.message
          : "Live AI is unavailable right now, so this answer comes straight from your store data.";
      const fallback = buildLocalFallback(q, snapshot);
      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, { sender: "tallyn", text: `${fallback}\n\n(${note})` }];
      });
    } finally {
      setIsThinking(false);
    }
  };

  // Action examples built from this shop's own data, so they work when tapped.
  const actionChips = (() => {
    const chips: string[] = [];
    const firstName = (n: string) => n.split(/[\s(]/)[0];
    const debtor = [...customers].sort((a, b) => b.creditBalance - a.creditBalance)[0];
    const tea = products.find((p) => /\b(tea|chai)\b/i.test(p.nameEn));
    if (debtor && tea) chips.push(`Udhaar mein ${firstName(debtor.name)} ko 2 chai likh do`);
    const low = products.find((p) => p.quantity <= p.minQuantity);
    if (low) chips.push(`Add 12 ${low.nameEn.split(" ").slice(0, 2).join(" ")} to purchases`);
    if (debtor && debtor.creditBalance > 0) chips.push(`${firstName(debtor.name)} ko udhaar ka reminder bhej do`);
    return chips;
  })();

  const quickChips = [
    ...actionChips,
    "What should I stock before Ramadan?",
    "Which items didn't sell this month?",
    "Who has the most udhaar?",
    "Which items are low on stock?",
    "How do I use voice checkout?",
    "What was today's revenue?",
  ];

  // ── Markdown renderer ──────────────────────────────────────────────────────
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const isHeading = /^#{1,3}\s/.test(line);
      const isBullet = /^(•|-|\*)\s/.test(line);
      const body = line.replace(/^#{1,3}\s/, "").replace(/^(•|-|\*)\s/, "");
      // Escape first, then bold: replies and names are untrusted.
      const html = inlineMarkdownToSafeHtml(body);

      if (isHeading) return <p key={i} className="font-semibold text-emerald-800 text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: html }} />;
      if (isBullet) return <div key={i} className="flex gap-1.5 mb-0.5"><span className="text-emerald-600 shrink-0">•</span><span dangerouslySetInnerHTML={{ __html: html }} /></div>;
      if (line.trim() === "") return <div key={i} className="h-1.5" />;
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };

  const lowStockCount = products.filter((p) => p.quantity <= p.minQuantity).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 animate-fade-in">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between border-s border-slate-200">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center shadow-inner">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Tallyn AI</h3>
              <p className="text-xs text-emerald-300">
                Live Store Advisor • {shop.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1.5 text-xs">
              <span className="bg-emerald-900/80 border border-emerald-700 px-2 py-1 rounded-full flex items-center gap-1 text-emerald-200">
                <Package className="h-3 w-3" />
                {products.length} SKUs
              </span>
              {lowStockCount > 0 && (
                <span className="bg-rose-950/80 border border-rose-700 px-2 py-1 rounded-full flex items-center gap-1 text-rose-200">
                  <AlertTriangle className="h-3 w-3" />
                  {lowStockCount} Low
                </span>
              )}
            </div>
            <button
              onClick={() => setIsAskTallynOpen(false)}
              className="h-10 w-10 rounded-xl bg-emerald-900/80 flex items-center justify-center text-slate-300 hover:text-white hover:bg-emerald-800 transition-colors min-h-[40px] min-w-[40px]"
              aria-label="Close Tallyn AI"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Chips */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto text-xs scrollbar-none shrink-0">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={isThinking}
              className="whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-emerald-900 hover:bg-emerald-50 hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-200 font-medium shrink-0 disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2.5 animate-slide-up ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
            >
              {m.sender === "tallyn" && (
                <div className="h-7 w-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  {m.isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </div>
              )}
              <div
                className={`rounded-2xl p-3 max-w-[85%] leading-relaxed ${
                  m.sender === "user"
                    ? "bg-slate-900 text-white rounded-tr-xs"
                    : "bg-slate-100 text-slate-900 rounded-tl-xs"
                } ${m.isLoading ? "opacity-60" : ""}`}
              >
                {m.isLoading ? (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                    <span className="ms-1 text-xs font-semibold">Tallyn AI is thinking...</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0.5">{renderMarkdown(m.text)}</div>
                    {m.action && m.actionStatus && (
                      <AgentActionCard
                        action={m.action}
                        status={m.actionStatus}
                        onResolved={(st) => setMessages((prev) => prev.map((x, j) => (j === i ? { ...x, actionStatus: st } : x)))}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={isThinking ? "Tallyn AI is thinking..." : "Ask about your store or business..."}
              disabled={isThinking}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400 min-h-[44px]"
            />
            <button
              type="submit"
              aria-label="Send message to Tallyn AI"
              className="h-11 w-11 rounded-xl bg-emerald-800 text-amber-200 flex items-center justify-center hover:bg-emerald-900 transition-colors shrink-0 shadow-xs min-h-[44px] min-w-[44px] disabled:opacity-40"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-1.5">
            Gemini with backup AI • Full store context loaded
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Local fallback when the AI is unavailable ────────────────────────────
// Uses the same computed snapshot as the AI, so the numbers always agree.
function buildLocalFallback(query: string, snap: StoreSnapshot): string {
  const q = query.toLowerCase();
  const money = (n: number) => formatCurrency(n, snap.currency);

  if (/udhaar|udhar|debt|owe|credit|qarz/.test(q)) {
    if (snap.customers.length === 0) return "No customer owes you money right now.";
    return `Total udhaar: **${money(snap.udhaar.total)}** from ${snap.udhaar.customersOwing} customers (${snap.udhaar.overdueCustomers} overdue).

Largest balances:
${snap.customers
      .slice(0, 3)
      .map((c) => `- **${c.name}**: ${money(c.balance)}${c.overdueDays > 0 ? ` (${c.overdueDays} days overdue)` : c.nextDueDate ? ` (due ${c.nextDueDate})` : ""}`)
      .join("\n")}`;
  }
  if (/not sold|didn.?t sell|dead|slow|nahi bik/.test(q)) {
    if (snap.notSold30d.length === 0) return "Every item in stock has sold at least once in the last 30 days.";
    return `Not sold in the last 30 days:
${snap.notSold30d.slice(0, 5).map((n) => `- **${n.name}**: ${n.stock} in stock (${money(n.stockValueAtCost)} at cost)`).join("\n")}`;
  }
  if (/stock|inventory|low|item|maal/.test(q)) {
    const low = snap.products.filter((p) => p.low);
    if (low.length === 0) return `All ${snap.stock.productCount} products are above their minimum level.`;
    return `**${snap.stock.lowStockCount} items** are at or below minimum:
${low.slice(0, 5).map((p) => `- **${p.name}**: ${p.stock} ${p.unit} left (min ${p.minStock})`).join("\n")}`;
  }
  if (/best|top|selling|bikta/.test(q)) {
    if (snap.topSellers7d.length === 0) return "No sales in the last 7 days yet.";
    return `Top sellers, last 7 days:
${snap.topSellers7d.slice(0, 5).map((t) => `- **${t.name}**: ${t.units} sold (${money(t.revenue)})`).join("\n")}`;
  }
  if (/revenue|sale|profit|today|aaj|week/.test(q)) {
    return `Today: **${money(snap.today.revenue)}** from ${snap.today.salesCount} sales (cash ${money(snap.today.cash)}, udhaar ${money(snap.today.credit)}), gross profit ${money(snap.today.grossProfit)}.
Last 7 days: ${money(snap.last7Days.revenue)} from ${snap.last7Days.salesCount} sales.`;
  }
  return `**${snap.shopName}**: ${snap.stock.productCount} products (${snap.stock.lowStockCount} low), ${money(snap.udhaar.total)} udhaar outstanding, today's sales ${money(snap.today.revenue)}. What would you like to know?`;
}
