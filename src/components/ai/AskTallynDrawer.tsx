import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { callGateway } from "@/lib/gateway";
import { supabase } from "@/lib/supabase";
import {
  X,
  Send,
  Sparkles,
  Bot,
  Loader2,
  Store,
  TrendingUp,
  AlertTriangle,
  Users,
  Package
} from "lucide-react";

interface Message {
  sender: "user" | "tallyn";
  text: string;
  isLoading?: boolean;
}

export const AskTallynDrawer: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const {
    isAskTallynOpen,
    setIsAskTallynOpen,
    products,
    customers,
    sales,
    shop,
  } = useApp();

  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Build live store context for Gateway
  const storeContext = {
    shopName: shop.name,
    shopCity: shop.city || "Pakistan",
    shopAddress: shop.address,
    totalProducts: products.length,
    lowStockItems: products
      .filter(p => p.quantity <= p.minQuantity)
      .map(p => ({
        name: p.name,
        stock: p.quantity,
        unit: p.unit,
        wholesalePrice: p.buyPrice || 0,
      }))
      .slice(0, 5),
    topDebtors: [...customers]
      .sort((a, b) => b.creditBalance - a.creditBalance)
      .slice(0, 4)
      .map(c => ({
        name: c.name,
        balance: c.creditBalance,
        phone: c.phone
      })),
    totalUdhaar: customers.reduce((s, c) => s + c.creditBalance, 0),
    todaySalesCount: sales.filter(s => s.status === "completed").length,
    todayRevenue: sales.filter(s => s.status === "completed").reduce((s, x) => s + x.totalAmount, 0),
    recentSalesTotal: sales.reduce((s, x) => s + x.totalAmount, 0),
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "tallyn",
      text: `Assalam-o-Alaikum! I'm Tallyn AI, your autonomous Kiryana retail advisor. I'm monitoring **${shop.name}** (${shop.city}) live — ${products.length} SKUs, ${formatCurrency(storeContext.totalUdhaar)} udhaar outstanding, ${storeContext.todaySalesCount} transactions today.\n\nAsk me anything about your store!`,
    },
  ]);

  // Keep messages ref for scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset greeting on shop change
  useEffect(() => {
    setMessages([{
      sender: "tallyn",
      text: `Assalam-o-Alaikum! Monitoring ${shop.name} (${shop.city}). ${products.length} products, ${formatCurrency(customers.reduce((s, c) => s + c.creditBalance, 0))} total udhaar outstanding.`,
    }]);
    setConversationHistory([]);
  }, [shop.id]);

  if (!isAskTallynOpen) return null;

  const generateIntelligentAnswer = (
    query: string,
    context: typeof storeContext
  ): string => {
    const q = query.toLowerCase().trim();

    // 1. Greetings & Pleasantries ("hello", "what?", "salam", "kia haal")
    if (
      q === "hello" || q === "hi" || q === "hey" || q === "salam" ||
      q.includes("assalam") || q.includes("kia haal") || q.includes("kya haal") ||
      q.includes("how are you") || q === "aoa"
    ) {
      return `Walaikum Assalam! I'm Tallyn AI. I'm actively monitoring **${context.shopName}** (${context.shopCity}). All ${context.totalProducts} commodities and customer ledgers are live and synchronized. How can I help you right now? You can ask about outstanding udhaar, low stock items, or today's revenue.`;
    }

    // 2. Who owes the most / Udhaar (Customer Credit)
    if (
      q.includes("udhaar") || q.includes("debt") || q.includes("owe") ||
      q.includes("bakaya") || q.includes("khata") || q.includes("credit") ||
      q.includes("paisay") || q.includes("who owes")
    ) {
      const topDebtors = [...customers]
        .filter(c => c.creditBalance > 0)
        .sort((a, b) => b.creditBalance - a.creditBalance);

      if (topDebtors.length === 0) {
        return `Great news! There is zero outstanding customer udhaar right now across all neighbourhood accounts.`;
      }

      const highest = topDebtors[0];
      const top3 = topDebtors.slice(0, 3).map(c => `• **${c.name}**: ${formatCurrency(c.creditBalance)} (${c.overdueDays || 0} days overdue, Tel: ${c.phone})`).join("\n");

      
      return `Total outstanding udhaar across your neighbourhood accounts is **${formatCurrency(context.totalUdhaar)}**.\n\nThe highest debtor is **${highest.name}** owing **${formatCurrency(highest.creditBalance)}** (${highest.overdueDays || 0} days overdue, Tel: ${highest.phone}).\n\nTop active balances:\n${top3}\n\nTip: You can send a 1-click polite WhatsApp reminder directly from the Udhaar screen!`;
    }

    // 3. Low stock / Restocking
    if (
      q.includes("stock") || q.includes("low") || q.includes("reorder") ||
      q.includes("khatam") || q.includes("short") || q.includes("restock") ||
      q.includes("inventory") || q.includes("maal")
    ) {
      const lowItems = products.filter(p => p.quantity <= p.minQuantity);
      if (lowItems.length === 0) {
        return `Inventory is healthy! All ${products.length} commodities are currently stocked above their minimum alert thresholds.`;
      }

      const itemsList = lowItems.slice(0, 5).map(p => `• **${p.name}**: ${p.quantity} ${p.unit} remaining (minimum: ${p.minQuantity})`).join("\n");

      return `Stock Alert: **${lowItems.length} commodities** are critically low:\n\n${itemsList}\n\nRecommendation: Place a restocking purchase order with your wholesale mandi distributor today to avoid counter stockouts.`;
    }

    // 4. Revenue / Sales / Profit
    if (
      q.includes("sale") || q.includes("revenue") || q.includes("profit") ||
      q.includes("kamai") || q.includes("faida") || q.includes("today") ||
      q.includes("munafa") || q.includes("bikri") || q.includes("total")
    ) {
      const completed = sales.filter(s => s.status === "completed");
      const rev = completed.reduce((sum, s) => sum + s.totalAmount, 0);
      const cash = completed.filter(s => s.paymentType === "cash").reduce((sum, s) => sum + s.totalAmount, 0);
      const credit = completed.filter(s => s.paymentType === "credit").reduce((sum, s) => sum + s.totalAmount, 0);

      let cogs = 0;
      completed.forEach(s => s.items.forEach(i => { cogs += i.unitCost * i.quantity; }));
      const grossProfit = rev - cogs;
      const margin = rev > 0 ? Math.round((grossProfit / rev) * 1000) / 10 : 0;

      return `Today's performance for **${context.shopName}** across **${completed.length} transactions**:\n\n• Total Revenue: **${formatCurrency(rev)}**\n• Cash Collected: **${formatCurrency(cash)}**\n• Udhaar Extended: **${formatCurrency(credit)}**\n• Estimated Gross Profit: **${formatCurrency(grossProfit)}** (${margin}% gross margin).`;
    }

    // 5. Ramadan / Seasonal Demand
    if (
      q.includes("ramadan") || q.includes("season") || q.includes("eid") ||
      q.includes("rooh afza") || q.includes("surge") || q.includes("forecast")
    ) {
      return `Ramadan & Seasonal Demand Model (Feature 8):\n\nHistorical retail velocity for Rooh Afza syrup, white sugar, basmati rice, and gram flour surges **+280% in Ramadan**. Wholesale Mandi spot rates typically climb 12–15% ten days prior to moon sighting.\n\nRecommendation: Lock supplier purchase orders for 30 cartons of syrup and bulk sugar now to protect a 22% retail profit margin.`;
    }

    // 6. Clarification / "what?" / Help
    if (q === "what" || q === "what?" || q.includes("kya") || q.includes("help") || q.includes("who are you")) {
      return `I am Tallyn AI — your autonomous Kiryana retail intelligence partner. I'm connected to **${context.shopName}** (${context.totalProducts} SKUs, ${formatCurrency(context.totalUdhaar)} udhaar ledger).\n\nYou can ask me:\n• *"Who has the most udhaar?"*\n• *"Which items are low on stock?"*\n• *"What was today's profit margin?"*`;
    }

    // Default Contextual Query Answer
    return `Store Report for **${context.shopName}** (${context.shopCity}): ${context.todaySalesCount} sales recorded today totaling ${formatCurrency(context.todayRevenue)}. Current neighbourhood udhaar stands at ${formatCurrency(context.totalUdhaar)}, and ${context.lowStockItems.length} products require restocking. Feel free to ask about any specific item, debtor, or Mandi price!`;
  };

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isThinking) return;

    // Add user message
    const userMsg: Message = { sender: "user", text: q };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery("");

    // Show thinking indicator
    const thinkingMsg: Message = { sender: "tallyn", text: "...", isLoading: true };
    setMessages(prev => [...prev, thinkingMsg]);

    // Check Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token || "";

    if (accessToken) {
      try {
        const answerData = await callGateway({
          accessToken,
          feature: "advisor",
          query: q,
          language: "en",
          context: storeContext,
          history: conversationHistory,
        });

        setMessages(prev => {
          const withoutLoader = prev.filter(m => !m.isLoading);
          return [...withoutLoader, { sender: "tallyn", text: answerData.answer }];
        });

        setConversationHistory(prev => [
          ...prev.slice(-6),
          { role: "user", text: q },
          { role: "model", text: answerData.answer }
        ]);
        setIsThinking(false);
        return;
      } catch (err) {
        console.warn("Gateway error, using store knowledgebase engine:", err);
      }
    }

    // Dynamic Account Knowledgebase Engine (Demo & Offline Fail-Open)
    const intelligentAnswer = generateIntelligentAnswer(q, storeContext);
    
    // Add small realistic processing pause
    setTimeout(() => {
      setMessages(prev => {
        const withoutLoader = prev.filter(m => !m.isLoading);
        return [...withoutLoader, { sender: "tallyn", text: intelligentAnswer }];
      });

      setConversationHistory(prev => [
        ...prev.slice(-6),
        { role: "user", text: q },
        { role: "model", text: intelligentAnswer }
      ]);
      setIsThinking(false);
    }, 400);
  };

  const quickChips = [
    "Who has the most udhaar?",
    "Which items are low on stock?",
    "What was today's total revenue?",
    "Give me profit tips for this season",
  ];

  // Simple markdown-to-JSX renderer for bold and bullets
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold (** or ##)
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const isHeading = line.startsWith("### ");
      const isBullet = line.startsWith("• ") || line.startsWith("- ");
      const cleanLine = boldLine.replace(/^(###|##|#)\s/, "").replace(/^[•\\-]\s/, "");

      if (isHeading) return <p key={i} className="font-black text-emerald-800 text-xs mt-2 mb-1" dangerouslySetInnerHTML={{ __html: cleanLine }} />;
      if (isBullet) return <div key={i} className="flex gap-1.5 mb-0.5"><span className="text-emerald-600 shrink-0">•</span><span dangerouslySetInnerHTML={{ __html: cleanLine }} /></div>;
      if (line.trim() === "") return <div key={i} className="h-1.5" />;
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: boldLine }} />;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between">

        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-950 to-emerald-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center shadow-inner">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black">{t("ai.title")}</h3>
              <p className="text-[11px] text-emerald-300">
                Live AI Retail Advisor • {shop.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Live Stats Chips */}
            <div className="hidden sm:flex gap-1.5 text-[10px]">
              <span className="bg-emerald-800/50 border border-emerald-700 px-2 py-1 rounded-full flex items-center gap-1 text-emerald-200">
                <Package className="h-3 w-3" />
                {products.length} SKUs
              </span>
              {storeContext.lowStockItems.length > 0 && (
                <span className="bg-rose-900/50 border border-rose-700 px-2 py-1 rounded-full flex items-center gap-1 text-rose-200">
                  <AlertTriangle className="h-3 w-3" />
                  {storeContext.lowStockItems.length} Low
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

        {/* Quick Suggestion Chips */}
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

        {/* Chat History */}
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
                  <div className="space-y-0.5">
                    {renderMarkdown(m.text)}
                  </div>
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
              placeholder={isThinking ? "Tallyn AI is thinking..." : (t("ai.placeholder") || "Ask about your store...")}
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
                <Send className="h-4 w-4 " />
              )}
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-400 mt-1.5">
            Powered by Tallyn AI Gateway
          </p>
        </div>
      </div>
    </div>
  );
};