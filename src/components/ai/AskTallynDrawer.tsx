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
  const isUrdu = i18n.language === "ur";
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
        name: isUrdu ? p.nameUr : p.nameEn,
        stock: p.quantity,
        unit: p.unit,
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
      text: isUrdu
        ? `السلام علیکم! میں ٹیلن AI ہوں، آپ کا ذہین دکان مشیر۔ مَیں ${shop.name} (${shop.city}) کے تمام ریکارڈ لائیو مانیٹر کر رہا ہوں۔ آپ اسٹاک، ادھار، فروخت، یا مارکیٹ قیمتوں کے بارے میں کچھ بھی پوچھ سکتے ہیں۔`
        : `Assalam-o-Alaikum! I'm Tallyn AI, your autonomous Kiryana retail advisor. I'm monitoring **${shop.name}** (${shop.city}) live — ${products.length} SKUs, ${formatCurrency(storeContext.totalUdhaar)} udhaar outstanding, ${storeContext.todaySalesCount} transactions today.\n\nAsk me anything about your store!`,
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
      text: isUrdu
        ? `السلام علیکم! ${shop.name} میں آپ کی سلامتی۔ میں ${products.length} محصولات اور ${formatCurrency(customers.reduce((s, c) => s + c.creditBalance, 0))} مجموعی ادھار کے ساتھ حال حاضری حفظ کر رہا ہوں۔`
        : `Assalam-o-Alaikum! Monitoring ${shop.name} (${shop.city}). ${products.length} products, ${formatCurrency(customers.reduce((s, c) => s + c.creditBalance, 0))} total udhaar outstanding.`,
    }]);
    setConversationHistory([]);
  }, [shop.id]);

  if (!isAskTallynOpen) return null;

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

    // Fresh session per send (handles token refresh); demo mode has none.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token || "";

    if (!accessToken) {
      // Fail-open (Rule 5): deterministic local summary, no gateway needed.
      setMessages(prev => {
        const withoutLoader = prev.filter(m => !m.isLoading);
        return [...withoutLoader, {
          sender: "tallyn",
          text: `**${storeContext.shopName}** (${storeContext.shopCity}): ${storeContext.todaySalesCount} transactions today, Rs ${storeContext.todayRevenue.toLocaleString()} revenue, Rs ${storeContext.totalUdhaar.toLocaleString()} udhaar outstanding. ${storeContext.lowStockItems.length} items low on stock.`
        }];
      });
      setIsThinking(false);
      return;
    }

    try {
      // Call the EDGE FUNCTION via the gateway client (not direct Gemini)
      const answerData = await callGateway({
        accessToken,
        feature: "advisor",
        query: q,
        language: isUrdu ? "ur" : "roman-ur",
        context: storeContext,
        history: conversationHistory,
      });

      // Replace thinking indicator with real response
      setMessages(prev => {
        const withoutLoader = prev.filter(m => !m.isLoading);
        return [...withoutLoader, { sender: "tallyn", text: answerData.answer }];
      });

      // Maintain conversation history for context
      setConversationHistory(prev => [
        ...prev.slice(-6), // Keep last 6 turns max
        { role: "user", text: q },
        { role: "model", text: answerData.answer }
      ]);
    } catch (err) {
      setMessages(prev => {
        const withoutLoader = prev.filter(m => !m.isLoading);
        return [...withoutLoader, {
          sender: "tallyn",
          text: err instanceof Error ? err.message : "I'm having trouble connecting to AI right now. Try again."
        }];
      });
    } finally {
      setIsThinking(false);
    }
  };

  const quickChips = isUrdu
    ? [
        "سب سے زیادہ ادھار کس پر ہے؟",
        "کون سا سامان ختم ہو رہا ہے؟",
        "آج کی فروخت کتنی ہے؟",
        "منافع بڑھانے کا مشورہ دیں",
      ]
    : [
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
                <Send className="h-4 w-4 rtl:rotate-180" />
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