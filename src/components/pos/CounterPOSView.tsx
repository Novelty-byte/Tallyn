import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/utils";
import { audio } from "@/lib/audio";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { 
  ShoppingCart, 
  Trash2, 
  RotateCcw, 
  Mic, 
  Plus, 
  Minus, 
  Sparkles, 
  Search, 
  Smartphone, 
  Monitor, 
  Check,
  Volume2,
  Camera
} from "lucide-react";

export const CounterPOSView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === "ur";
  const { 
    shop,
    products, 
    customers, 
    recordSale, 
    undoSale, 
    lastSaleUndo, 
    undoSeconds,
    addCustomer,
    setIsBarcodeScannerOpen
  } = useApp();

  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("c1");
  const [is390pxMobileFrame, setIs390pxMobileFrame] = useState<boolean>(true);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.quantity <= (cart[productId] || 0)) return;

    audio.playBarcodeBeep();
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) {
        next[productId] -= 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  const totalAmount = Object.entries(cart).reduce((sum, [productId, qty]) => {
    const p = products.find((item) => item.id === productId);
    return sum + (p ? p.sellPrice * qty : 0);
  }, 0);

  const totalItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const handleCheckout = () => {
    if (totalItemsCount === 0) return;

    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = products.find((item) => item.id === productId)!;
      return {
        productId,
        productName: isUrdu ? p.nameUr : p.nameEn,
        quantity,
        unitPrice: p.sellPrice,
        unitCost: p.buyPrice,
      };
    });

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);

    recordSale({
      shopId: shop.id,
      paymentType,
      customerId: paymentType === "credit" ? selectedCustomerId : undefined,
      customerName: paymentType === "credit" && selectedCust ? selectedCust.name : undefined,
      totalAmount,
      items,
    });

    clearCart();
  };

  // Real Audio Voice POS simulation with speech synthesis
  const handleSimulateVoice = async () => {
    setIsSpeakingVoice(true);
    const spokenTextUrdu = "دو چائے اور ایک گھی ادھار آصف بھائی";
    const spokenNotice = isUrdu ? "بولا گیا: '2 چائے اور 1 گھی ادھار آصف'" : "Spoken: '2 Tapal Tea, 1 Dalda Oil credit Asif'";
    setVoiceNotice(spokenNotice);

    // Speak aloud with SpeechSynthesis
    await audio.speak(spokenTextUrdu, "ur");

    // Populate cart automatically
    setCart({
      p1: 2, // 2 Tapal Tea
      p7: 1, // 1 Dalda Oil
    });
    setPaymentType("credit");
    setSelectedCustomerId("c1");
    setIsSpeakingVoice(false);

    setTimeout(() => setVoiceNotice(null), 5000);
  };

  const handleAddNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    addCustomer({
      name: newCustName,
      phone: newCustPhone || "0300-0000000",
      creditLimit: 10000,
    });
    setNewCustName("");
    setNewCustPhone("");
    setIsNewCustomerModalOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const name = isUrdu ? p.nameUr : p.nameEn;
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("pos.title")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("pos.subtitle")}
          </p>
        </div>

        {/* Viewport Frame Mode Toggle (390px Mobile vs Full Desktop) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500">Layout Mode:</span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setIs390pxMobileFrame(true)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                is390pxMobileFrame
                  ? "bg-emerald-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>390px Counter Phone</span>
            </button>
            <button
              onClick={() => setIs390pxMobileFrame(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                !is390pxMobileFrame
                  ? "bg-emerald-800 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Full Desktop Split</span>
            </button>
          </div>
        </div>
      </div>

      {/* 10-Second Undo Toast Banner */}
      {undoSeconds > 0 && lastSaleUndo && (
        <div className="mb-6 rounded-2xl bg-slate-900 p-4 text-white shadow-xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                Sale #{lastSaleUndo.id.slice(-6)} Committed Atomically
              </p>
              <p className="text-sm font-extrabold text-amber-300">
                {formatCurrency(lastSaleUndo.totalAmount)} • {lastSaleUndo.items.length} items deducted from stock
              </p>
            </div>
          </div>
          <button
            onClick={undoSale}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-colors shadow-md min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t("pos.undoSale")} ({undoSeconds}s)</span>
          </button>
        </div>
      )}

      {/* Main POS Container */}
      <div className={is390pxMobileFrame ? "mx-auto max-w-[420px]" : "w-full"}>
        <div className="rounded-3xl border-4 border-slate-900 bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          
          {/* Products Panel */}
          <div className={`flex-1 flex flex-col border-b lg:border-b-0 ${!is390pxMobileFrame ? "lg:border-e lg:border-slate-200" : ""}`}>
            {/* Say-It Voice POS Banner with Speech Synthesis */}
            <div className="bg-emerald-900 px-4 py-3 text-amber-100 flex items-center justify-between gap-2 border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-amber-300 ${isSpeakingVoice ? "animate-pulse ring-2 ring-amber-400" : ""}`}>
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold tracking-wide uppercase text-amber-300 flex items-center gap-1">
                    <span>{t("pos.voicePOS")}</span>
                    {isSpeakingVoice && <Volume2 className="h-3 w-3 animate-ping" />}
                  </p>
                  <p className="text-xs text-emerald-100 truncate max-w-[210px]">
                    {t("pos.voicePOSPrompt")}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSimulateVoice}
                disabled={isSpeakingVoice}
                className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition-colors shrink-0 shadow-xs min-h-[40px] flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSpeakingVoice ? "Speaking..." : t("pos.simulateVoice")}</span>
              </button>
            </div>

            {/* Voice Notice Toast */}
            {voiceNotice && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{voiceNotice}</span>
              </div>
            )}

            {/* Search & Camera Barcode Button */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("pos.searchPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3.5 text-xs placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden min-h-[40px]"
                  />
                </div>

                {/* Camera Barcode Scanner Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-bold shrink-0 min-h-[40px] shadow-2xs"
                  title="Open Camera Barcode Scanner"
                >
                  <Camera className="h-4 w-4 text-amber-300" />
                  <span className="hidden sm:inline">Scan Barcode</span>
                </button>
              </div>

              {/* Categories */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {[
                  { id: "all", label: "All Items" },
                  { id: "staples", label: "Staples" },
                  { id: "beverages", label: "Tea & Drinks" },
                  { id: "dairy", label: "Dairy & Fats" },
                  { id: "spices", label: "Spices" },
                  { id: "household", label: "Household" },
                  { id: "snacks", label: "Snacks" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[34px] ${
                      selectedCategory === cat.id
                        ? "bg-emerald-800 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid (44px+ tap targets) */}
            <div className="p-3.5 overflow-y-auto max-h-[340px] sm:max-h-[440px] grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-50 flex-1">
              {filteredProducts.map((p) => {
                const inCartQty = cart[p.id] || 0;
                const isOutOfStock = p.quantity <= 0;

                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p.id)}
                    className={`relative flex flex-col justify-between rounded-2xl border p-3 text-start transition-all min-h-[96px] ${
                      inCartQty > 0
                        ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : "active:scale-98"}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {isUrdu ? p.nameUr : p.nameEn}
                        </p>
                        {inCartQty > 0 && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-extrabold text-white">
                            {inCartQty}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-900">
                        {formatCurrency(p.sellPrice)}
                      </span>
                      <span className={`text-[10px] font-semibold ${p.quantity <= p.minQuantity ? "text-amber-600" : "text-slate-500"}`}>
                        Stock: {p.quantity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart & Checkout Panel */}
          <div className={`${!is390pxMobileFrame ? "lg:w-[380px]" : "w-full"} border-t lg:border-t-0 bg-white p-4 flex flex-col justify-between shadow-lg`}>
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-800" />
                  <span>{totalItemsCount} {t("pos.inCart")}</span>
                </span>
                {totalItemsCount > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {totalItemsCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 my-4">
                  {t("pos.emptyCart")}
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 mb-3">
                  {Object.entries(cart).map(([productId, qty]) => {
                    const item = products.find((p) => p.id === productId);
                    if (!item) return null;

                    return (
                      <div
                        key={productId}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate max-w-[140px]">
                          {isUrdu ? item.nameUr : item.nameEn}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(item.sellPrice * qty)}
                          </span>
                          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200">
                            <button
                              onClick={() => removeFromCart(productId)}
                              className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold px-1.5">{qty}</span>
                            <button
                              onClick={() => addToCart(productId)}
                              className="h-6 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Payment Type Toggle */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <button
                  onClick={() => setPaymentType("cash")}
                  className={`rounded-xl py-2.5 text-xs font-bold transition-all min-h-[44px] ${
                    paymentType === "cash"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t("pos.cashSale")}
                </button>
                <button
                  onClick={() => setPaymentType("credit")}
                  className={`rounded-xl py-2.5 text-xs font-bold transition-all min-h-[44px] ${
                    paymentType === "credit"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t("pos.creditSale")}
                </button>
              </div>

              {/* Credit Customer Selector */}
              {paymentType === "credit" && (
                <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-3 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-amber-900">
                      {t("pos.selectCustomer")}:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="text-[11px] font-bold text-emerald-800 hover:underline"
                    >
                      + New Debtor
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 min-h-[40px]"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Debt: {formatCurrency(c.creditBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Total Due & Complete Button */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs uppercase font-bold text-slate-500">
                  {t("pos.cartTotal")}
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <button
                disabled={totalItemsCount === 0}
                onClick={handleCheckout}
                className={`w-full rounded-2xl py-3.5 text-xs font-black text-white transition-all shadow-md min-h-[48px] ${
                  totalItemsCount > 0
                    ? "bg-emerald-800 hover:bg-emerald-900 active:scale-98"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                {t("pos.recordSale")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Add Customer Modal */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-3">Add Credit Customer</h4>
            <form onSubmit={handleAddNewCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Asif Bhai (Makan #12)"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Barcode Scanner Modal */}
      <BarcodeScannerModal onScanItem={(productId) => addToCart(productId)} />
    </div>
  );
};
