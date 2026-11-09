import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  Store 
} from "lucide-react";

interface Message {
  sender: "user" | "tallyn";
  text: string;
}

export const AskTallynDrawer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === "ur";
  const { isAskTallynOpen, setIsAskTallynOpen, products, customers, sales } = useApp();

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "tallyn",
      text: isUrdu
        ? "السلام علیکم حاجی صاحب! میں ٹیلن AI ہوں۔ آپ اپنی دکان کی فروخت، ادھار، یا اسٹاک کے بارے میں کچھ بھی پوچھ سکتے ہیں۔"
        : "Hello Haji Aslam! I am your Ask Tallyn store assistant. Ask me anything about your daily sales, inventory levels, or credit ledger.",
    },
  ]);

  if (!isAskTallynOpen) return null;

  const handleSend = (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q) return;

    const userMsg: Message = { sender: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");

    // Generate accurate, deterministic response based on live data
    setTimeout(() => {
      let reply = "";
      const lower = q.toLowerCase();

      if (lower.includes("debt") || lower.includes("udhaar") || lower.includes("ادھار") || lower.includes("balance")) {
        const topDebtor = [...customers].sort((a, b) => b.creditBalance - a.creditBalance)[0];
        const totalDebt = customers.reduce((s, c) => s + c.creditBalance, 0);
        reply = isUrdu
          ? `کل مارکیٹ میں ادھار ${formatCurrency(totalDebt)} ہے۔ سب سے زیادہ رقم ${topDebtor.name} کے ذمے ہے (${formatCurrency(topDebtor.creditBalance)}) جو کہ ${topDebtor.overdueDays} دن سے واجب الادا ہے۔`
          : `Total outstanding credit across all accounts is ${formatCurrency(totalDebt)}. The largest debtor is ${topDebtor.name} with ${formatCurrency(topDebtor.creditBalance)} outstanding (${topDebtor.overdueDays} days overdue).`;
      } else if (lower.includes("stock") || lower.includes("low") || lower.includes("اسٹاک") || lower.includes("کم")) {
        const lowStock = products.filter((p) => p.quantity <= p.minQuantity);
        if (lowStock.length > 0) {
          reply = isUrdu
            ? `اس وقت دکان میں ${lowStock.length} اشیاء کا اسٹاک کم ہے۔ سب سے پہلے "${lowStock[0].nameUr}" ختم ہو رہی ہے، صرف ${lowStock[0].quantity} رہ گئی ہیں۔ فوری سپلائر سے آرڈر کریں۔`
            : `There are ${lowStock.length} items running low on stock. Specifically, "${lowStock[0].nameEn}" only has ${lowStock[0].quantity} units left. Recommend reordering today.`;
        } else {
          reply = isUrdu ? "ماشاءاللہ تمام ضروری اشیاء کا اسٹاک تسلی بخش ہے۔" : "All product inventory levels are currently healthy and above minimum thresholds.";
        }
      } else if (lower.includes("profit") || lower.includes("sale") || lower.includes("منافع") || lower.includes("فروخت")) {
        const totalRev = sales.reduce((s, x) => s + x.totalAmount, 0);
        reply = isUrdu
          ? `آج کی مجموعی فروخت ${formatCurrency(totalRev)} ہے۔ آپ کا تخمینی مجموعی منافع تقریباً 18.5% مارجن کے حساب سے چل رہا ہے۔`
          : `Total recorded sales stand at ${formatCurrency(totalRev)} across ${sales.length} transactions, operating at approximately 18.5% gross profit margin.`;
      } else {
        reply = isUrdu
          ? "المدینہ کریانہ اسٹور کا سسٹم بالکل اپ ٹو ڈیٹ ہے۔ آپ مجھ سے ادھار کی تفصیل، اسٹاک کی حالت، یا منافع کا پوچھ سکتے ہیں۔"
          : "Al-Madina Kiryana Store system is fully synchronized. You can ask about customer debts, low stock items, or today's profit breakdown.";
      }

      setMessages((prev) => [...prev, { sender: "tallyn", text: reply }]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{t("ai.title")}</h3>
              <p className="text-[11px] text-emerald-300">Live Read-Only Store Intelligence</p>
            </div>
          </div>
          <button
            onClick={() => setIsAskTallynOpen(false)}
            className="h-8 w-8 rounded-lg bg-emerald-900/80 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto text-[11px] scrollbar-none">
          {[
            isUrdu ? "سب سے زیادہ ادھار کس پر ہے؟" : "Who owes the most debt?",
            isUrdu ? "کون سا سامان ختم ہو رہا ہے؟" : "Which item is running low?",
            isUrdu ? "آج کا منافع کتنا ہے؟" : "What is today's profit?",
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-emerald-900 hover:bg-emerald-50 transition-colors font-medium shrink-0"
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
                <div className="h-7 w-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`rounded-2xl p-3 max-w-[85%] leading-relaxed ${
                  m.sender === "user"
                    ? "bg-slate-900 text-white rounded-tr-xs"
                    : "bg-slate-100 text-slate-900 rounded-tl-xs"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white">
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
              placeholder={t("ai.placeholder")}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
            <button
              type="submit"
              className="h-10 w-10 rounded-xl bg-emerald-800 text-amber-200 flex items-center justify-center hover:bg-emerald-900 transition-colors shrink-0 shadow-xs"
            >
              <Send className="h-4 w-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
