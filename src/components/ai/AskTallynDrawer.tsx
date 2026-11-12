import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
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
}

// ─── App Feature Knowledge Base ────────────────────────────────────────────
// This is injected into every system prompt so Tallyn can answer how-to questions.
const APP_FEATURE_GUIDE = `
## Tallyn App — Feature Guide (How-To Knowledge)

### Counter POS (Point of Sale)
- Go to the "Counter POS" tab in the top navigation.
- You will see a product grid. Tap any product card to add it to the cart.
- To use **Voice POS**: tap the amber "🎙 Speak Order" button at the top of the product panel. The mic activates — say the order clearly, e.g. "two tea one oil udhaar Asif". Products matching your words are auto-added to the cart.
- Use the search bar to find products by name or barcode.
- Tap the camera icon to scan a barcode with the device camera.
- Select "Cash Sale" or "Credit (Udhaar)" for payment type.
- For credit sales, choose the customer from the dropdown.
- Tap "Record Sale" to commit the sale — inventory is deducted automatically.
- An undo banner appears for 10 seconds after each sale. Tap "Undo Sale" to reverse it.

### Dashboard
- Shows today's KPI cards: Total Revenue, Cash Received, Credit Extended, Gross Profit, Net Margin.
- The 7-Day Sales Performance bar chart shows the last 7 days of cash (green) and credit/udhaar (amber) sales.
- Action cards show urgent alerts: low-stock items and overdue udhaar accounts.
- Quick navigation cards at the bottom link to POS, Udhaar, and Inventory.

### Smart Inventory
- Go to "Inventory" tab to see all products with stock levels, buy price, sell price, and margin.
- Items below minimum stock are highlighted in amber — these need restocking.
- Tap "Add New Product" to add a product (name, category, buy price, sell price, stock quantity, minimum alert level, barcode).
- Tap the edit (pencil) icon on any product to update its details.
- Tap the stock adjustment button to add or remove units (e.g. after a supplier delivery).

### Udhaar Ledger (Customer Credit)
- Go to "Udhaar Ledger" tab.
- See all credit customers with outstanding balances and overdue days.
- Tap "Record Debt Payment" on a customer's card to log a cash payment received.
- Tap "Send WhatsApp Reminder" to open a pre-written WhatsApp message to the customer — it's culturally respectful and ready to send.

### Sales History
- Go to "Sales History" tab to see every completed sale with date, items, amount, and payment type.

### Smart Insights
- Go to "Smart Insights" tab for wholesale price benchmarks (Mandi rate comparisons) and seasonal demand forecasts.

### Purchases & Scanner
- Go to "Purchases & Scanner" tab to log wholesale supplier purchases and use the bill scanner.

### Store Settings
- Go to "Store Settings" tab to update store name, address, city, and other details.

### Store Switcher
- In the top-left of the navbar, click the store name dropdown to switch between your branches.
- Each branch has its own inventory, customers, and sales data.

### Kiryana Radio
- Click the amber "Kiryana Radio" button in the top navbar to hear an AI audio briefing of today's store performance.

### Ask Tallyn AI (this feature)
- Click "Ask Tallyn AI" in the navbar from anywhere in the app.
- Ask about your store data, how to use features, or get retail advice.
`;

// ─── Direct Gemini API call (browser-side) ─────────────────────────────────
async function callGeminiDirect(
  apiKey: string,
  systemPrompt: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userMessage: string
): Promise<string> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [
    // System instruction as first user turn (Gemini REST API style)
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. I am Tallyn AI, ready to help." }] },
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 600,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text as string;
}

// ─── Component ──────────────────────────────────────────────────────────────
export const AskTallynDrawer: React.FC = () => {
  const {
    isAskTallynOpen,
    setIsAskTallynOpen,
    products,
    customers,
    sales,
    shop,
    expenses,
  } = useApp();

  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState<
    { role: "user" | "model"; parts: { text: string }[] }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Build rich store context snapshot ─────────────────────────────────────
  const buildSystemPrompt = () => {
    const completedSales = sales.filter((s) => s.status === "completed");
    const totalRevenue = completedSales.reduce((s, x) => s + x.totalAmount, 0);
    const cashRevenue = completedSales.filter((s) => s.paymentType === "cash").reduce((s, x) => s + x.totalAmount, 0);
    const creditRevenue = completedSales.filter((s) => s.paymentType === "credit").reduce((s, x) => s + x.totalAmount, 0);
    const totalUdhaar = customers.reduce((s, c) => s + c.creditBalance, 0);
    const lowStock = products.filter((p) => p.quantity <= p.minQuantity);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Build full product list (capped at 60 for prompt size)
    const productLines = products.slice(0, 60).map(
      (p) => `  - ${p.name || p.nameEn} | Category: ${p.category} | Stock: ${p.quantity} ${p.unit} | Buy: Rs${p.buyPrice} | Sell: Rs${p.sellPrice} | Min Alert: ${p.minQuantity}${p.quantity <= p.minQuantity ? " ⚠️ LOW STOCK" : ""}${p.isDeadStock ? " 🔴 DEAD STOCK" : ""}`
    ).join("\n");

    // Build full customer list
    const customerLines = customers.map(
      (c) => `  - ${c.name} | Phone: ${c.phone} | Udhaar: Rs${c.creditBalance.toLocaleString()} | Overdue: ${c.overdueDays || 0} days`
    ).join("\n");

    // Build recent sales summary (last 10)
    const recentSales = completedSales.slice(-10).map(
      (s) => `  - Rs${s.totalAmount} | ${s.paymentType} | ${s.items.length} items | ${s.customerName || "walk-in"} | ${s.createdAt ? s.createdAt.split("T")[0] : "today"}`
    ).join("\n");

    return `You are "Tallyn AI" — the intelligent retail advisor built into the Tallyn Retail OS app for Pakistani kiryana (neighbourhood grocery) store owners.

## YOUR IDENTITY & SCOPE
- You are a helpful, warm, conversational AI assistant.
- You have full access to the store owner's live data (shown below).
- You can answer questions about: store data, inventory, customers, sales, udhaar/credit, how to use app features, retail advice, supplier tips, pricing strategy, Ramadan/seasonal planning — anything related to this app or their kiryana business.
- If someone asks something COMPLETELY unrelated to retail, this app, or business (e.g. "who is Lebron James?", "what's the weather?", cricket scores, general knowledge) — politely decline and say you're focused on helping with their store and the Tallyn app.
- You may answer greetings, pleasantries, and conversational messages warmly.
- Do NOT use JSON output. Just reply in plain conversational text.
- Keep replies concise and helpful — typically 2–5 sentences unless detail is needed.
- Use **bold** for emphasis where helpful.

## CURRENT STORE: ${shop.name}
- Address: ${shop.address || "N/A"} | City: ${shop.city || "Pakistan"}
- Total SKUs: ${products.length}
- Today's Revenue: Rs${totalRevenue.toLocaleString()} (${completedSales.length} sales)
- Cash Collected: Rs${cashRevenue.toLocaleString()} | Credit Extended: Rs${creditRevenue.toLocaleString()}
- Total Outstanding Udhaar: Rs${totalUdhaar.toLocaleString()}
- Low Stock Items: ${lowStock.length > 0 ? lowStock.map(p => p.name || p.nameEn).join(", ") : "None"}
- Total Expenses Logged: Rs${totalExpenses.toLocaleString()}

## FULL PRODUCT INVENTORY
${productLines || "No products loaded."}

## CUSTOMERS & UDHAAR LEDGER
${customerLines || "No customers loaded."}

## RECENT SALES (last 10)
${recentSales || "No sales recorded yet."}

${APP_FEATURE_GUIDE}

Always be helpful, warm, and practical. Reply in English unless the user writes in another language, in which case match their language.`;
  };

  // ── Initial greeting message ───────────────────────────────────────────────
  const makeGreeting = () => ({
    sender: "tallyn" as const,
    text: `Assalam-o-Alaikum! I'm **Tallyn AI** — your store advisor for **${shop.name}**.\n\nI can see your full inventory (${products.length} products), customer ledger, and sales data. Ask me anything about your store, how to use a feature, or get retail advice!`,
  });

  const [messages, setMessages] = useState<Message[]>([makeGreeting()]);

  // Reset on shop change
  useEffect(() => {
    setMessages([makeGreeting()]);
    setGeminiHistory([]);
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

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    try {
      if (!apiKey) throw new Error("No VITE_GEMINI_API_KEY configured");

      const systemPrompt = buildSystemPrompt();
      const answer = await callGeminiDirect(apiKey, systemPrompt, geminiHistory, q);

      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, { sender: "tallyn", text: answer }];
      });

      setGeminiHistory((prev) => [
        ...prev.slice(-8), // keep last 8 turns in history
        { role: "user", parts: [{ text: q }] },
        { role: "model", parts: [{ text: answer }] },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      // Graceful local fallback
      const fallback = buildLocalFallback(q, { products, customers, sales, shop, formatCurrency });
      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, { sender: "tallyn", text: fallback + `\n\n*(AI offline: ${errMsg.slice(0, 80)})*` }];
      });
    } finally {
      setIsThinking(false);
    }
  };

  const quickChips = [
    "What's in my inventory?",
    "Who has the most udhaar?",
    "Which items are low on stock?",
    "How do I use Voice POS?",
    "What was today's revenue?",
  ];

  // ── Markdown renderer ──────────────────────────────────────────────────────
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      const isHeading = line.startsWith("### ") || line.startsWith("## ");
      const isBullet = line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ");
      const cleanLine = boldLine.replace(/^(###|##|#)\s/, "").replace(/^[•\-\*]\s/, "");

      if (isHeading) return <p key={i} className="font-black text-emerald-800 text-xs mt-2 mb-1" dangerouslySetInnerHTML={{ __html: cleanLine }} />;
      if (isBullet) return <div key={i} className="flex gap-1.5 mb-0.5"><span className="text-emerald-600 shrink-0">•</span><span dangerouslySetInnerHTML={{ __html: cleanLine }} /></div>;
      if (line.trim() === "") return <div key={i} className="h-1.5" />;
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: boldLine }} />;
    });
  };

  const lowStockCount = products.filter((p) => p.quantity <= p.minQuantity).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-950 to-emerald-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center shadow-inner">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black">Ask Tallyn AI</h3>
              <p className="text-[11px] text-emerald-300">
                Live Store Advisor • {shop.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1.5 text-[10px]">
              <span className="bg-emerald-800/50 border border-emerald-700 px-2 py-1 rounded-full flex items-center gap-1 text-emerald-200">
                <Package className="h-3 w-3" />
                {products.length} SKUs
              </span>
              {lowStockCount > 0 && (
                <span className="bg-rose-900/50 border border-rose-700 px-2 py-1 rounded-full flex items-center gap-1 text-rose-200">
                  <AlertTriangle className="h-3 w-3" />
                  {lowStockCount} Low
                </span>
              )}
            </div>
            <button
              onClick={() => setIsAskTallynOpen(false)}
              className="h-8 w-8 rounded-lg bg-emerald-900/80 flex items-center justify-center text-slate-300 hover:text-white hover:bg-emerald-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Chips */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto text-[11px] scrollbar-none shrink-0">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={isThinking}
              className="whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-emerald-900 hover:bg-emerald-50 transition-colors font-medium shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
              className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
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
                    <span className="ms-1 text-[10px] font-semibold">Tallyn AI is thinking...</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">{renderMarkdown(m.text)}</div>
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
              placeholder={isThinking ? "Tallyn AI is thinking..." : "Ask anything about your store..."}
              disabled={isThinking}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              type="submit"
              disabled={isThinking || !inputQuery.trim()}
              className="h-10 w-10 rounded-xl bg-emerald-800 text-amber-200 flex items-center justify-center hover:bg-emerald-900 transition-colors shrink-0 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-400 mt-1.5">
            Powered by Gemini • Full store context loaded
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Local fallback when Gemini is offline ────────────────────────────────
function buildLocalFallback(
  query: string,
  { products, customers, sales, shop, formatCurrency }: {
    products: ReturnType<typeof useApp>["products"];
    customers: ReturnType<typeof useApp>["customers"];
    sales: ReturnType<typeof useApp>["sales"];
    shop: ReturnType<typeof useApp>["shop"];
    formatCurrency: (n: number) => string;
  }
): string {
  const q = query.toLowerCase();
  const completed = sales.filter((s) => s.status === "completed");
  const totalUdhaar = customers.reduce((s, c) => s + c.creditBalance, 0);
  const totalRevenue = completed.reduce((s, x) => s + x.totalAmount, 0);

  if (q.includes("udhaar") || q.includes("debt") || q.includes("owe") || q.includes("credit")) {
    const top = [...customers].sort((a, b) => b.creditBalance - a.creditBalance).slice(0, 3);
    return `Total outstanding udhaar: **${formatCurrency(totalUdhaar)}**.\n\nTop accounts:\n${top.map(c => `• **${c.name}**: ${formatCurrency(c.creditBalance)} (${c.overdueDays || 0} days overdue)`).join("\n")}`;
  }
  if (q.includes("stock") || q.includes("inventory") || q.includes("low") || q.includes("item")) {
    const low = products.filter((p) => p.quantity <= p.minQuantity);
    if (low.length === 0) return `All ${products.length} products in **${shop.name}** are stocked above minimum levels.`;
    return `**${low.length} low-stock items** need restocking:\n${low.slice(0, 5).map(p => `• **${p.name || p.nameEn}**: ${p.quantity} ${p.unit} left`).join("\n")}`;
  }
  if (q.includes("revenue") || q.includes("sale") || q.includes("profit") || q.includes("today")) {
    return `**${shop.name}** has recorded **${formatCurrency(totalRevenue)}** across **${completed.length} sales**.`;
  }
  return `**${shop.name}**: ${products.length} products, ${formatCurrency(totalUdhaar)} udhaar outstanding, ${formatCurrency(totalRevenue)} in sales. What would you like to know?`;
}
