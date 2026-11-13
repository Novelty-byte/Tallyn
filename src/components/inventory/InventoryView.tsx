import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/context/AppContext";
import { Product, ProductCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Sparkles, 
  Package, 
  Percent,
  Check
} from "lucide-react";

export const InventoryView: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const { products, addProduct, updateStock } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Recount");

  // Add Product Form State
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [category, setCategory] = useState<ProductCategory>("staples");
  const [quantity, setQuantity] = useState<number>(10);
  const [buyPrice, setBuyPrice] = useState<number>(100);
  const [sellPrice, setSellPrice] = useState<number>(120);
  const [minQuantity, setMinQuantity] = useState<number>(5);
  const [unit, setUnit] = useState("pack");
  const [barcode, setBarcode] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    addProduct({
      nameEn,
      nameUr: nameUr || nameEn,
      category,
      quantity,
      buyPrice,
      sellPrice,
      minQuantity,
      unit,
      barcode: barcode || undefined,
    });

    setIsAddModalOpen(false);
    setNameEn("");
    setNameUr("");
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct || adjustDelta === 0) return;
    updateStock(adjustModalProduct.id, adjustDelta);
    setAdjustModalProduct(null);
    setAdjustDelta(0);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const name = p.name || p.nameEn;
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("inventory.title")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("inventory.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-amber-100 hover:bg-emerald-900 shadow-sm transition-all self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span>{t("inventory.addProduct")}</span>
        </button>
      </div>

      {/* Dead-Stock Combo Bundler Notice (Feature 7) */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-950">
              Clearance & Dead-Stock Combo Bundler Active
            </p>
            <p className="text-xs text-amber-900">
              Suggested Bundle: Pair Rooh Afza Syrup (15 bottles left) with White Sugar for a 5% discount promotional flyer.
            </p>
          </div>
        </div>
        <button
          onClick={() => alert("WhatsApp broadcast draft generated: 'Special Deal: 1 Rooh Afza + 2kg White Sugar only Rs. 700!'")}
          className="rounded-xl border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shrink-0"
        >
          Draft Promo
        </button>
      </div>

      {/* Search & Categories Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or barcode..."
            className="w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden min-h-[40px]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {[
            { id: "all", label: "All" },
            { id: "staples", label: "Staples" },
            { id: "beverages", label: "Tea & Drinks" },
            { id: "dairy", label: "Dairy" },
            { id: "spices", label: "Spices" },
            { id: "household", label: "Household" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors min-h-[34px] ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">{t("inventory.productName")}</th>
                <th className="py-3 px-4 text-start">{t("inventory.category")}</th>
                <th className="py-3 px-4 text-end">{t("inventory.stockQty")}</th>
                <th className="py-3 px-4 text-end">{t("inventory.buyPrice")}</th>
                <th className="py-3 px-4 text-end">{t("inventory.sellPrice")}</th>
                <th className="py-3 px-4 text-end">{t("inventory.margin")}</th>
                <th className="py-3 px-4 text-center">{t("inventory.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const margin = p.sellPrice - p.buyPrice;
                const marginPercent = Math.round((margin / p.sellPrice) * 100);
                const isLow = p.quantity <= p.minQuantity;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>
                        <p>{p.name || p.nameEn}</p>
                        <p className="text-xs text-slate-400 font-normal">
                          {p.barcode ? `Barcode: ${p.barcode}` : p.unit}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <span className={`inline-flex items-center gap-1 font-extrabold ${isLow ? "text-amber-600" : "text-slate-900"}`}>
                        {p.quantity} {p.unit}
                        {isLow && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-end text-slate-500">
                      {formatCurrency(p.buyPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-end font-bold text-slate-900">
                      {formatCurrency(p.sellPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <span className="font-extrabold text-emerald-800">
                        {marginPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setAdjustModalProduct(p);
                          setAdjustDelta(0);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t("inventory.addProduct")}</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Basmati Rice 5kg"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <option value="staples">Staples</option>
                    <option value="beverages">Beverages</option>
                    <option value="dairy">Dairy</option>
                    <option value="spices">Spices</option>
                    <option value="household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pack, kg, bottle"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Buy Price (Rs.)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sell Price (Rs.)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 mb-1">Adjust Inventory Count</h4>
            <p className="text-xs text-slate-500 mb-3">{adjustModalProduct.nameEn}</p>
            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Change (+ or -)</label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  placeholder="e.g. -2 for damage, +5 for recount"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                >
                  <option value="Recount">Recount / Physical Inventory</option>
                  <option value="Spillage/Damage">Spillage / Bag Torn</option>
                  <option value="Personal Use">Personal / Store Consumption</option>
                  <option value="Expired">Expired / Spoiled</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};