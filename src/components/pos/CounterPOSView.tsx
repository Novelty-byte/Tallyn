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
  Camera,
  Package
} from "lucide-react";

export const CounterPOSView: React.FC = () => {
  const { t, i18n } = useTranslation();
  
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
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

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
    if (totalItemsCount === 0) {
      setCheckoutNotice("Add at least one item before recording a sale.");
      setTimeout(() => setCheckoutNotice(null), 4000);
      return;
    }

    const items = Object.entries(cart).map(([productId, quantity]) => {
      const p = products.find((item) => item.id === productId)!;
      return {
        productId,
        productName: p.name || p.nameEn || "Item",
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

  // Parse a spoken transcript into cart items via keyword matching
  const parseVoiceToCart = (transcript: string) => {
    const lc = transcript.toLowerCase();

    // Quantity word map (English + Roman Urdu)
    const qtyWords: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
      chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
    };

    // Detect quantity mentioned anywhere near a product keyword
    const extractQty = (before: string): number => {
      for (const [word, num] of Object.entries(qtyWords)) {
        if (before.includes(word)) return num;
      }
      const numMatch = before.match(/\b(\d+)\b/);
      return numMatch ? parseInt(numMatch[1], 10) : 1;
    };

    const newCartItems: { [id: string]: number } = {};

    for (const p of products) {
      // Build keyword list from product name parts
      const names = [p.name, p.nameEn].filter(Boolean) as string[];
      const keywords = names
        .flatMap(n => n.toLowerCase().split(/[\s\-\/,()]+/))
        .filter(k => k.length >= 3);

      const matched = keywords.some(kw => lc.includes(kw));
      if (matched) {
        // Find quantity: scan the substring before this keyword occurrence
        let qty = 1;
        for (const kw of keywords) {
          const idx = lc.indexOf(kw);
          if (idx !== -1) {
            const before = lc.slice(Math.max(0, idx - 20), idx);
            qty = extractQty(before || lc);
            break;
          }
        }
        newCartItems[p.id] = Math.max(1, qty);
      }
    }

    if (Object.keys(newCartItems).length > 0) {
      setCart(prev => ({ ...prev, ...newCartItems }));
      const names = Object.keys(newCartItems)
        .map(id => products.find(p => p.id === id)?.name || id)
        .join(", ");
      setVoiceNotice(`✅ Added: ${names}`);
      // Auto-detect credit/udhaar intent
      if (lc.includes("udhaar") || lc.includes("credit") || lc.includes("baad mein") || lc.includes("later")) {
        setPaymentType("credit");
      }
    } else {
      setVoiceNotice("❌ No products recognised. Try saying product names clearly (e.g. \"two tea one oil\").");
    }
    setTimeout(() => setVoiceNotice(null), 7000);
  };

  // Real microphone voice POS using Web Speech API
  const handleVoicePOS = () => {
    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition as (new () => SpeechRecognition) | undefined ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as (new () => SpeechRecognition) | undefined;

    if (!SpeechRecognitionCtor) {
      setVoiceNotice("⚠️ Voice input requires Chrome or Edge. Please switch browsers.");
      setTimeout(() => setVoiceNotice(null), 6000);
      return;
    }

    setIsSpeakingVoice(true);
    setVoiceNotice("🎙 Listening… speak the order now");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-PK";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setVoiceNotice(`🎙 Heard: "${transcript}"`);
      parseVoiceToCart(transcript);
      setIsSpeakingVoice(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg =
        event.error === "not-allowed"
          ? "⚠️ Microphone access denied. Allow mic permission and try again."
          : `⚠️ Voice error: ${event.error}`;
      setVoiceNotice(msg);
      setIsSpeakingVoice(false);
      setTimeout(() => setVoiceNotice(null), 6000);
    };

    recognition.onend = () => setIsSpeakingVoice(false);
    recognition.start();
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
    const name = (p.name || p.nameEn || "").toLowerCase();
    const nameEn = (p.nameEn || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      name.includes(query) ||
      nameEn.includes(query) ||
      (p.barcode ? p.barcode.includes(searchQuery) : false);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            {t("pos.title")}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {t("pos.subtitle")}
          </p>
        </div>

        {/* Viewport Frame Mode Toggle (390px Mobile vs Full Desktop) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-sm font-medium text-slate-600">Layout</span>
          <div
            role="group"
            aria-label="Layout mode"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
          >
            <button
              onClick={() => setIs390pxMobileFrame(true)}
              aria-pressed={is390pxMobileFrame}
              className={`flex items-center gap-2 rounded-md px-3 text-sm font-medium min-h-[40px] transition-colors ${
                is390pxMobileFrame
                  ? "bg-emerald-800 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">390px Counter Phone</span>
              <span className="sm:hidden">Phone</span>
            </button>
            <button
              onClick={() => setIs390pxMobileFrame(false)}
              aria-pressed={!is390pxMobileFrame}
              className={`flex items-center gap-2 rounded-md px-3 text-sm font-medium min-h-[40px] transition-colors ${
                !is390pxMobileFrame
                  ? "bg-emerald-800 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Monitor className="h-4 w-4" aria-hidden="true" />
              <span>Desktop</span>
            </button>
          </div>
        </div>
      </div>

      {/* 10-Second Undo Toast Banner */}
      {undoSeconds > 0 && lastSaleUndo && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-xl bg-slate-900 p-4 text-white flex flex-wrap items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Check className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                Sale #{lastSaleUndo.id.slice(-6)} recorded
              </p>
              <p className="text-base figure text-amber-300">
                {formatCurrency(lastSaleUndo.totalAmount)} · {lastSaleUndo.items.length} items deducted
              </p>
            </div>
          </div>
          <button
            onClick={undoSale}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>{t("pos.undoSale")} ({undoSeconds}s)</span>
          </button>
        </div>
      )}

      {/* Main POS Container */}
      <div className={is390pxMobileFrame ? "mx-auto max-w-[420px]" : "w-full"}>
        <div className={`surface-l1 overflow-hidden flex flex-col ${!is390pxMobileFrame ? "lg:flex-row" : ""}`}>

          {/* Products Panel */}
          <div className={`flex-1 flex flex-col ${!is390pxMobileFrame ? "border-b lg:border-b-0 lg:border-e border-slate-200" : ""}`}>
            {/* Say-It Voice POS Banner with Speech Synthesis */}
            <div className="bg-emerald-900 px-4 py-3 text-white flex items-center justify-between gap-3 border-b border-emerald-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-amber-300 ${isSpeakingVoice ? "ring-2 ring-amber-400" : ""}`}>
                  <Mic className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                    <span>{t("pos.voicePOS")}</span>
                    {isSpeakingVoice && <Volume2 className="h-4 w-4" aria-hidden="true" />}
                  </p>
                  <p className="text-sm text-emerald-100 truncate">
                    {t("pos.voicePOSPrompt")}
                  </p>
                </div>
              </div>
              <button
                onClick={handleVoicePOS}
                disabled={isSpeakingVoice}
                aria-label={isSpeakingVoice ? "Listening for order" : "Speak order"}
                className="rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-70 transition-colors shrink-0 min-h-[44px] flex items-center gap-2"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{isSpeakingVoice ? "Listening…" : "Speak Order"}</span>
              </button>
            </div>

            {/* Voice Notice Toast */}
            {voiceNotice && (
              <div role="status" aria-live="polite" className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
                <span>{voiceNotice}</span>
              </div>
            )}

            {/* Search & Camera Barcode Button */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("pos.searchPlaceholder")}
                    aria-label="Search products"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-10 pe-4 text-base placeholder:text-slate-400 focus:border-emerald-700 focus:outline-hidden min-h-[44px]"
                  />
                </div>

                {/* Camera Barcode Scanner Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  aria-label="Scan barcode with camera"
                  className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 text-sm font-medium shrink-0 min-h-[44px]"
                >
                  <Camera className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </div>

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-1 text-sm scrollbar-none" role="group" aria-label="Product categories">
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
                    aria-pressed={selectedCategory === cat.id}
                    className={`whitespace-nowrap rounded-lg px-3 font-medium transition-colors min-h-[40px] ${
                      selectedCategory === cat.id
                        ? "bg-emerald-800 text-white"
                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid (44px+ tap targets) */}
            <div className="p-4 overflow-y-auto max-h-[340px] sm:max-h-[480px] grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 flex-1">
              {filteredProducts.map((p) => {
                const inCartQty = cart[p.id] || 0;
                const isOutOfStock = p.quantity <= 0;
                const isLow = p.quantity <= p.minQuantity;

                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p.id)}
                    aria-label={`Add ${p.name || p.nameEn}, ${formatCurrency(p.sellPrice)}, ${p.quantity} in stock`}
                    className={`relative flex flex-col justify-between rounded-lg border p-3 text-start transition-colors min-h-[104px] ${
                      inCartQty > 0
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-400"
                    } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : "active:bg-slate-100"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
                        {p.name || p.nameEn}
                      </p>
                      {inCartQty > 0 && (
                        <span className="flex h-6 min-w-6 px-1 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-sm figure text-white">
                          {inCartQty}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="figure text-slate-900">
                        {formatCurrency(p.sellPrice)}
                      </span>
                      <span className={`text-xs font-medium tabular-nums ${isLow ? "text-amber-700" : "text-slate-500"}`}>
                        {isOutOfStock ? "Out" : `${p.quantity} ${p.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-8 text-center">
                  <Package className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                  <p className="mt-2 text-base font-medium text-slate-900">No products match “{searchQuery}”</p>
                  <p className="mt-1 text-sm text-slate-600">Try a shorter name, or clear the search to see the full shelf.</p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                    className="mt-4 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100 min-h-[44px]"
                  >
                    Clear search and filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cart & Checkout Panel */}
          <div className={`${!is390pxMobileFrame ? "lg:w-[380px]" : "w-full"} ${!is390pxMobileFrame ? "border-t lg:border-t-0 border-slate-200" : ""} bg-white p-4 flex flex-col justify-between`}>
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-3 pb-3 border-b border-slate-200">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-800" aria-hidden="true" />
                  <span>{totalItemsCount} {t("pos.inCart")}</span>
                </span>
                {totalItemsCount > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1.5 font-medium min-h-[44px] px-2"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Clear
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {totalItemsCount === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center my-4">
                  <p className="text-base font-medium text-slate-900">Cart is empty</p>
                  <p className="mt-1 text-sm text-slate-600">{t("pos.emptyCart")}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pe-1 mb-3">
                  {Object.entries(cart).map(([productId, qty]) => {
                    const item = products.find((p) => p.id === productId);
                    if (!item) return null;

                    return (
                      <div
                        key={productId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {item.name || item.nameEn}
                          </p>
                          <p className="text-sm figure text-slate-600">
                            {formatCurrency(item.sellPrice * qty)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => removeFromCart(productId)}
                            aria-label={`Remove one ${item.name || item.nameEn}`}
                            className="h-11 w-11 flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="text-base figure w-8 text-center text-slate-900">{qty}</span>
                          <button
                            onClick={() => addToCart(productId)}
                            aria-label={`Add one more ${item.name || item.nameEn}`}
                            className="h-11 w-11 flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Payment Type Toggle */}
              <div className="grid grid-cols-2 gap-2 my-3" role="group" aria-label="Payment type">
                <button
                  onClick={() => setPaymentType("cash")}
                  aria-pressed={paymentType === "cash"}
                  className={`rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    paymentType === "cash"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t("pos.cashSale")}
                </button>
                <button
                  onClick={() => setPaymentType("credit")}
                  aria-pressed={paymentType === "credit"}
                  className={`rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    paymentType === "credit"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t("pos.creditSale")}
                </button>
              </div>

              {/* Credit Customer Selector */}
              {paymentType === "credit" && (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <label htmlFor="credit-customer" className="text-sm font-medium text-amber-900">
                      {t("pos.selectCustomer")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="text-sm font-medium text-emerald-800 hover:underline"
                    >
                      Add new customer
                    </button>
                  </div>
                  <select
                    id="credit-customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-md border border-amber-300 bg-white px-3 text-base text-slate-800 min-h-[44px]"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {formatCurrency(c.creditBalance)} owed
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Total Due & Complete Button */}
            <div className="pt-3 border-t border-slate-200">
              {checkoutNotice && (
                <div role="status" aria-live="polite" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                  {checkoutNotice}
                </div>
              )}
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">
                  {t("pos.cartTotal")}
                </p>
                <p className="text-3xl figure text-slate-900" aria-live="polite">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <button
                onClick={handleCheckout}
                aria-disabled={totalItemsCount === 0}
                className={`w-full rounded-lg text-base font-semibold text-white transition-colors min-h-[52px] ${
                  totalItemsCount > 0
                    ? "bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950"
                    : "bg-slate-300 text-slate-600 cursor-not-allowed"
                }`}
              >
                {totalItemsCount > 0
                  ? `Record Sale · ${formatCurrency(totalAmount)}`
                  : "Add items to record a sale"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Add Customer Modal */}
      {isNewCustomerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-customer-title"
        >
          <div className="w-full max-w-sm surface-overlay p-6">
            <h4 id="new-customer-title" className="text-base font-semibold text-slate-900">Add Credit Customer</h4>
            <p className="mt-1 text-sm text-slate-600">A new account is opened for this shop. Debt starts at zero.</p>
            <form onSubmit={handleAddNewCustomer} className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-cust-name" className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input
                  id="new-cust-name"
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Asif Bhai (Makan #12)"
                  className="w-full rounded-lg border border-slate-300 px-3 text-base text-slate-900 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="new-cust-phone" className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Phone Number</label>
                <input
                  id="new-cust-phone"
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full rounded-lg border border-slate-300 px-3 text-base text-slate-900 min-h-[44px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-100 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900 min-h-[44px]"
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