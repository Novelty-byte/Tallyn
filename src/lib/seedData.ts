import { Product, Customer, Sale, Expense, WholesalePriceBenchmark, SeasonalForecast } from "@/types";

// ==========================================
// BRANCH 1: Main Branch (G-9/4 Islamabad)
// Traditional Neighbourhood Kiryana Store
// ==========================================
export const BRANCH_01_PRODUCTS: Product[] = [
  // Staples & Flour & Sugar
  { id: "b1-p1", nameEn: "Fine Wheat Flour (Aata) 10kg Bag", nameUr: "فائن آٹا 10 کلو تھیلا", category: "staples", quantity: 18, buyPrice: 1240, sellPrice: 1350, minQuantity: 12, unit: "bag", barcode: "896101412011" },
  { id: "b1-p2", nameEn: "Chakki Whole Wheat Atta 10kg", nameUr: "چکی کا خالص گندم آٹا 10 کلو", category: "staples", quantity: 14, buyPrice: 1380, sellPrice: 1500, minQuantity: 6, unit: "bag", barcode: "896101412012" },
  { id: "b1-p3", nameEn: "White Refined Sugar (Cheeni) 1kg", nameUr: "سفید چینی 1 کلو", category: "staples", quantity: 65, buyPrice: 140, sellPrice: 155, minQuantity: 20, unit: "kg", barcode: "896101412010" },
  { id: "b1-p4", nameEn: "Super Kernel Basmati Rice 5kg", nameUr: "کرنل باسمتی چاول 5 کلو", category: "staples", quantity: 16, buyPrice: 1600, sellPrice: 1800, minQuantity: 6, unit: "bag", barcode: "896101412013" },
  { id: "b1-p5", nameEn: "Daal Chana (Chickpea Split) 1kg", nameUr: "دال چنا 1 کلو", category: "staples", quantity: 28, buyPrice: 240, sellPrice: 280, minQuantity: 10, unit: "kg", barcode: "896101412015" },
  { id: "b1-p6", nameEn: "Daal Masoor (Red Lentils) 1kg", nameUr: "دال مسور 1 کلو", category: "staples", quantity: 22, buyPrice: 260, sellPrice: 300, minQuantity: 8, unit: "kg", barcode: "896101412016" },
  { id: "b1-p7", nameEn: "Daal Moong Washed 1kg", nameUr: "دال مونگ دھلی 1 کلو", category: "staples", quantity: 25, buyPrice: 270, sellPrice: 310, minQuantity: 8, unit: "kg", barcode: "896101412017" },
  
  // Tea & Beverages
  { id: "b1-p8", nameEn: "Tapal Danedar Tea 450g", nameUr: "ٹپال دانیدار چائے 450 گرام", category: "beverages", quantity: 24, buyPrice: 570, sellPrice: 650, minQuantity: 8, unit: "pack", barcode: "896101412001" },
  { id: "b1-p9", nameEn: "Lipton Yellow Label 400g", nameUr: "لپٹن یلو لیبل 400 گرام", category: "beverages", quantity: 18, buyPrice: 590, sellPrice: 670, minQuantity: 6, unit: "pack", barcode: "896101412002" },
  { id: "b1-p10", nameEn: "Rooh Afza Herbal Syrup 800ml", nameUr: "جامعہ ہمدرد روح افزا 800 ملی", category: "beverages", quantity: 6, buyPrice: 370, sellPrice: 420, minQuantity: 8, unit: "bottle", barcode: "896101412004", isDeadStock: true },
  
  // Dairy & Fats
  { id: "b1-p11", nameEn: "Dalda Cooking Oil 1L Pouch", nameUr: "ڈالڈا کوکنگ آئل 1 لیٹر", category: "dairy", quantity: 5, buyPrice: 480, sellPrice: 540, minQuantity: 10, unit: "pouch", barcode: "896101412007" },
  { id: "b1-p12", nameEn: "Sufi Banaspati Ghee 1kg", nameUr: "صوفی بناسپتی گھی 1 کلو", category: "dairy", quantity: 8, buyPrice: 470, sellPrice: 530, minQuantity: 8, unit: "pouch", barcode: "896101412009" },
  { id: "b1-p13", nameEn: "MilkPak Dairy Milk 1L", nameUr: "ملک پیک دودھ 1 لیٹر", category: "dairy", quantity: 30, buyPrice: 260, sellPrice: 290, minQuantity: 12, unit: "pack", barcode: "896101412020" },
  
  // Spices & Salts
  { id: "b1-p14", nameEn: "National Iodized Salt 800g", nameUr: "نیشنل آیوڈین ملا نمک 800 گرام", category: "spices", quantity: 50, buyPrice: 55, sellPrice: 70, minQuantity: 15, unit: "pack", barcode: "896101412030" },
  { id: "b1-p15", nameEn: "Shan Special Biryani Masala", nameUr: "شان اسپیشل بریانی مصالحہ", category: "spices", quantity: 36, buyPrice: 105, sellPrice: 130, minQuantity: 10, unit: "pack", barcode: "896101412025" },
  { id: "b1-p16", nameEn: "National Red Chilli Powder 200g", nameUr: "نیشنل لال مرچ پاؤڈر 200 گرام", category: "spices", quantity: 24, buyPrice: 210, sellPrice: 250, minQuantity: 8, unit: "pack", barcode: "896101412028" },
  
  // Household & Soaps
  { id: "b1-p17", nameEn: "Surf Excel Detergent Powder 500g", nameUr: "سرف ایکسل واشنگ پاؤڈر 500 گرام", category: "household", quantity: 18, buyPrice: 310, sellPrice: 360, minQuantity: 6, unit: "pack", barcode: "896101412033" },
  { id: "b1-p18", nameEn: "Lifebuoy Total Soap 115g", nameUr: "لائف بوائے صابن", category: "household", quantity: 30, buyPrice: 110, sellPrice: 130, minQuantity: 10, unit: "bar", barcode: "896101412039" },
  { id: "b1-p19", nameEn: "Vim Dishwashing Bar 150g", nameUr: "وم برتن دھونے کا صابن 150 گرام", category: "household", quantity: 40, buyPrice: 65, sellPrice: 80, minQuantity: 15, unit: "bar", barcode: "896101412035" },
  { id: "b1-p20", nameEn: "Matchbox Pak Matches (Bundle of 10)", nameUr: "ماچس ڈبیا (بنڈل 10 عدد)", category: "household", quantity: 45, buyPrice: 70, sellPrice: 90, minQuantity: 15, unit: "bundle", barcode: "896101412052" },
];

export const BRANCH_01_CUSTOMERS: Customer[] = [
  {
    id: "b1-c1",
    name: "Asif Bhai (Makan #12)",
    phone: "0300-1234567",
    address: "House 12, Street 4, G-9/4, Islamabad",
    creditBalance: 3400,
    creditLimit: 10000,
    lastPurchaseDate: "2026-10-26",
    overdueDays: 14,
    history: [
      { id: "h1", date: "2026-10-26", description: "2 Cooking Oil, 5kg Atta on Udhaar", amount: 2430, type: "credit_purchase" },
      { id: "h2", date: "2026-10-15", description: "Partial Cash Payment", amount: -1500, type: "payment" },
    ],
  },
  {
    id: "b1-c2",
    name: "Tariq Sahab (Govt School Teacher)",
    phone: "0321-7654321",
    address: "Flat 4B, Sector G-9/1, Islamabad",
    creditBalance: 1250,
    creditLimit: 8000,
    lastPurchaseDate: "2026-11-06",
    overdueDays: 3,
    history: [
      { id: "h4", date: "2026-11-06", description: "Tea, Sugar, MilkPak", amount: 1250, type: "credit_purchase" },
    ],
  },
  {
    id: "b1-c3",
    name: "Bashir Chacha (Retired Railway)",
    phone: "0333-9988776",
    address: "Street 9, G-9/4, Islamabad",
    creditBalance: 4800,
    creditLimit: 6000,
    lastPurchaseDate: "2026-10-18",
    overdueDays: 22,
    history: [
      { id: "h5", date: "2026-10-18", description: "Monthly Ration Package", amount: 4800, type: "credit_purchase" },
    ],
  },
];

export const BRANCH_01_SALES: Sale[] = [
  {
    id: "b1-s1",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T08:30:00Z",
    paymentType: "cash",
    totalAmount: 1890,
    items: [
      { productId: "b1-p8", productName: "Tapal Danedar Tea 450g", quantity: 2, unitPrice: 650, unitCost: 570 },
      { productId: "b1-p11", productName: "Dalda Cooking Oil 1L", quantity: 1, unitPrice: 540, unitCost: 480 },
    ],
    status: "completed",
  },
  {
    id: "b1-s2",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T09:15:00Z",
    paymentType: "credit",
    customerId: "b1-c1",
    customerName: "Asif Bhai (Makan #12)",
    totalAmount: 2430,
    items: [
      { productId: "b1-p1", productName: "Fine Wheat Flour (Aata) 10kg", quantity: 1, unitPrice: 1350, unitCost: 1240 },
      { productId: "b1-p11", productName: "Dalda Cooking Oil 1L", quantity: 2, unitPrice: 540, unitCost: 480 },
    ],
    status: "completed",
  },
  {
    id: "b1-s3",
    shopId: "shop-al-madina-01",
    createdAt: "2026-11-09T10:45:00Z",
    paymentType: "cash",
    totalAmount: 3105,
    items: [
      { productId: "b1-p4", productName: "Super Kernel Basmati Rice 5kg", quantity: 1, unitPrice: 1800, unitCost: 1600 },
      { productId: "b1-p3", productName: "White Refined Sugar 1kg", quantity: 5, unitPrice: 155, unitCost: 140 },
      { productId: "b1-p15", productName: "Shan Biryani Masala", quantity: 4, unitPrice: 130, unitCost: 105 },
    ],
    status: "completed",
  },
];

export const BRANCH_01_EXPENSES: Expense[] = [
  { id: "b1-e1", title: "G-9 Shop Rent (November)", amount: 35000, category: "Rent", date: "2026-11-01" },
  { id: "b1-e2", title: "IESCO Commercial Electricity Bill", amount: 14200, category: "Electricity", date: "2026-11-05" },
  { id: "b1-e3", title: "Shop Assistant (Chotu) Weekly Stipend", amount: 4000, category: "Staff", date: "2026-11-08" },
  { id: "b1-e4", title: "Wholesale Mandi Suzuki Freight", amount: 2500, category: "Transportation", date: "2026-11-07" },
];


// ==========================================
// BRANCH 2: Express Branch (F-10 Markaz, Islamabad)
// High-Turnover Modern Convenience & Chilled Dairy
// ==========================================
export const BRANCH_02_PRODUCTS: Product[] = [
  // Chilled Dairy & Beverages
  { id: "b2-p1", nameEn: "Olper's Full Cream Milk 1L", nameUr: "اولپرز خالص دودھ 1 لیٹر", category: "dairy", quantity: 48, buyPrice: 260, sellPrice: 290, minQuantity: 15, unit: "pack", barcode: "896101412021" },
  { id: "b2-p2", nameEn: "MilkPak Dairy Milk 1L", nameUr: "ملک پیک دودھ 1 لیٹر", category: "dairy", quantity: 52, buyPrice: 260, sellPrice: 290, minQuantity: 15, unit: "pack", barcode: "896101412020" },
  { id: "b2-p3", nameEn: "Coca Cola Regular 1.5L", nameUr: "کوکا کولا 1.5 لیٹر", category: "beverages", quantity: 36, buyPrice: 155, sellPrice: 180, minQuantity: 10, unit: "bottle", barcode: "896101412057" },
  { id: "b2-p4", nameEn: "Sprite Lemon Soda 1.5L", nameUr: "سپرائٹ بوتل 1.5 لیٹر", category: "beverages", quantity: 30, buyPrice: 155, sellPrice: 180, minQuantity: 10, unit: "bottle", barcode: "896101412058" },
  { id: "b2-p5", nameEn: "Pakola Ice Cream Soda 1.5L", nameUr: "پاکولا بوتل 1.5 لیٹر", category: "beverages", quantity: 22, buyPrice: 145, sellPrice: 170, minQuantity: 8, unit: "bottle", barcode: "896101412056" },
  { id: "b2-p6", nameEn: "Red Bull Energy Drink 250ml", nameUr: "ریڈ بل انرجی ڈرنک", category: "beverages", quantity: 24, buyPrice: 380, sellPrice: 450, minQuantity: 8, unit: "can", barcode: "900249010007" },
  { id: "b2-p7", nameEn: "Nurpur Unsalted Butter 200g", nameUr: "نورپور مکھن 200 گرام", category: "dairy", quantity: 18, buyPrice: 340, sellPrice: 390, minQuantity: 6, unit: "pack", barcode: "896101412022" },
  { id: "b2-p8", nameEn: "Nestle All-Purpose Cream 200ml", nameUr: "نیسلے بالائی کریم 200 ملی", category: "dairy", quantity: 26, buyPrice: 180, sellPrice: 210, minQuantity: 8, unit: "pack", barcode: "896101412024" },
  
  // Premium Snacks & Confectionery
  { id: "b2-p9", nameEn: "Lays Classic Salted Potato Chips", nameUr: "لیز نمکین چپس", category: "snacks", quantity: 45, buyPrice: 52, sellPrice: 60, minQuantity: 15, unit: "pack", barcode: "896101412045" },
  { id: "b2-p10", nameEn: "Kurkure Red Chilli Jhatpat", nameUr: "کرکرے چٹپٹا سنیک", category: "snacks", quantity: 38, buyPrice: 42, sellPrice: 50, minQuantity: 12, unit: "pack", barcode: "896101412046" },
  { id: "b2-p11", nameEn: "Kolson Slanty Jalapeno Chips", nameUr: "کولسن سلانٹی چپس", category: "snacks", quantity: 34, buyPrice: 42, sellPrice: 50, minQuantity: 12, unit: "pack", barcode: "896101412047" },
  { id: "b2-p12", nameEn: "Peek Freans Sooper Biscuit Family", nameUr: "سوپر بسکٹ فیملی پیک", category: "snacks", quantity: 40, buyPrice: 90, sellPrice: 110, minQuantity: 12, unit: "pack", barcode: "896101412042" },
  { id: "b2-p13", nameEn: "LU Prince Chocolate Biscuits", nameUr: "پرنس چاکلیٹ بسکٹ", category: "snacks", quantity: 50, buyPrice: 45, sellPrice: 55, minQuantity: 15, unit: "pack", barcode: "896101412044" },
  { id: "b2-p14", nameEn: "Cadbury Dairy Milk Chocolate 65g", nameUr: "کیڈبری ڈیری ملک چاکلیٹ", category: "snacks", quantity: 30, buyPrice: 180, sellPrice: 220, minQuantity: 8, unit: "bar", barcode: "762221012345" },
  
  // Condiments & Fast Essentials
  { id: "b2-p15", nameEn: "Young's Mayonnaise 300ml", nameUr: "ینگ مایونیز 300 ملی", category: "staples", quantity: 20, buyPrice: 240, sellPrice: 285, minQuantity: 6, unit: "pouch", barcode: "896101412049" },
  { id: "b2-p16", nameEn: "Mitchell's Tomato Ketchup 300g", nameUr: "مچلز ٹماٹو کیچپ 300 گرام", category: "staples", quantity: 22, buyPrice: 185, sellPrice: 220, minQuantity: 6, unit: "pouch", barcode: "896101412048" },
  { id: "b2-p17", nameEn: "Rose Petal Tissue Box Pop-up", nameUr: "روز پیٹل ٹشو باکس", category: "household", quantity: 32, buyPrice: 170, sellPrice: 205, minQuantity: 8, unit: "box", barcode: "896101412053" },
];

export const BRANCH_02_CUSTOMERS: Customer[] = [
  {
    id: "b2-c1",
    name: "Dr. Ayesha (F-10 Dental Clinic)",
    phone: "0300-5544332",
    address: "Plaza 3, F-10 Markaz, Islamabad",
    creditBalance: 2850,
    creditLimit: 15000,
    lastPurchaseDate: "2026-11-08",
    overdueDays: 1,
    history: [
      { id: "b2-h1", date: "2026-11-08", description: "Clinic Tea, MilkPak & Tissue Boxes", amount: 2850, type: "credit_purchase" },
    ],
  },
  {
    id: "b2-c2",
    name: "Bilal Khan (Software House)",
    phone: "0345-1122334",
    address: "Office 204, Evacuee Trust Complex, F-10",
    creditBalance: 5600,
    creditLimit: 20000,
    lastPurchaseDate: "2026-11-05",
    overdueDays: 4,
    history: [
      { id: "b2-h2", date: "2026-11-05", description: "Weekly Office Coffee, Red Bull & Lays", amount: 5600, type: "credit_purchase" },
    ],
  },
];

export const BRANCH_02_SALES: Sale[] = [
  {
    id: "b2-s1",
    shopId: "shop-al-madina-02",
    createdAt: "2026-11-09T09:20:00Z",
    paymentType: "cash",
    totalAmount: 1420,
    items: [
      { productId: "b2-p1", productName: "Olper's Full Cream Milk 1L", quantity: 3, unitPrice: 290, unitCost: 260 },
      { productId: "b2-p9", productName: "Lays Classic Potato Chips", quantity: 5, unitPrice: 60, unitCost: 52 },
      { productId: "b2-p14", productName: "Cadbury Dairy Milk", quantity: 1, unitPrice: 220, unitCost: 180 },
    ],
    status: "completed",
  },
  {
    id: "b2-s2",
    shopId: "shop-al-madina-02",
    createdAt: "2026-11-09T11:10:00Z",
    paymentType: "cash",
    totalAmount: 2250,
    items: [
      { productId: "b2-p6", productName: "Red Bull Energy Drink", quantity: 4, unitPrice: 450, unitCost: 380 },
      { productId: "b2-p3", productName: "Coca Cola Regular 1.5L", quantity: 2, unitPrice: 180, unitCost: 155 },
      { productId: "b2-p17", productName: "Rose Petal Tissue Box", quantity: 1, unitPrice: 205, unitCost: 170 },
    ],
    status: "completed",
  },
];

export const BRANCH_02_EXPENSES: Expense[] = [
  { id: "b2-e1", title: "F-10 Markaz Commercial Rent", amount: 65000, category: "Rent", date: "2026-11-01" },
  { id: "b2-e2", title: "Heavy Commercial Chiller Power", amount: 28500, category: "Electricity", date: "2026-11-04" },
  { id: "b2-e3", title: "POS Thermal Paper Rolls & Bags", amount: 2400, category: "Packaging", date: "2026-11-06" },
];


// ==========================================
// BRANCH 3: Mart Branch (Saddar Rawalpindi)
// Bulk Wholesale Sacks, Cartons & B2B Trade
// ==========================================
export const BRANCH_03_PRODUCTS: Product[] = [
  // Bulk Commodity Sacks & Tins
  { id: "b3-p1", nameEn: "Refined White Sugar 50kg Jute Sack", nameUr: "چینی 50 کلو بوری", category: "staples", quantity: 28, buyPrice: 6800, sellPrice: 7250, minQuantity: 10, unit: "sack", barcode: "896101412091" },
  { id: "b3-p2", nameEn: "Fine Wheat Flour Atta 20kg Bag", nameUr: "گندم فائن آٹا 20 کلو تھیلا", category: "staples", quantity: 40, buyPrice: 2420, sellPrice: 2650, minQuantity: 15, unit: "bag", barcode: "896101412092" },
  { id: "b3-p3", nameEn: "Dalda Banaspati 16L Master Tin", nameUr: "ڈالڈا بناسپتی 16 لیٹر کنستر", category: "dairy", quantity: 18, buyPrice: 7600, sellPrice: 8200, minQuantity: 6, unit: "tin", barcode: "896101412093" },
  { id: "b3-p4", nameEn: "Super Basmati Rice 25kg Bulk Bag", nameUr: "کرنل باسمتی چاول 25 کلو بوری", category: "staples", quantity: 35, buyPrice: 7800, sellPrice: 8500, minQuantity: 8, unit: "bag", barcode: "896101412094" },
  { id: "b3-p5", nameEn: "Daal Chana 50kg Wholesale Sack", nameUr: "دال چنا 50 کلو بوری", category: "staples", quantity: 15, buyPrice: 11500, sellPrice: 12500, minQuantity: 4, unit: "sack", barcode: "896101412095" },
  
  // Master Tea & Milk Cartons
  { id: "b3-p6", nameEn: "Tapal Danedar Master Carton (24x450g)", nameUr: "ٹپال دانیدار ماسٹر کارٹن", category: "beverages", quantity: 12, buyPrice: 13200, sellPrice: 14400, minQuantity: 4, unit: "carton", barcode: "896101412096" },
  { id: "b3-p7", nameEn: "MilkPak Dairy Carton (12x1L)", nameUr: "ملک پیک کارٹن (12 ڈبے)", category: "dairy", quantity: 30, buyPrice: 3000, sellPrice: 3350, minQuantity: 10, unit: "carton", barcode: "896101412097" },
  { id: "b3-p8", nameEn: "Fresh Eggs Golden Crate (30 Dozen)", nameUr: "انڈے فارمی پیٹی (30 درجن)", category: "dairy", quantity: 16, buyPrice: 8400, sellPrice: 9300, minQuantity: 5, unit: "crate", barcode: "896101412098" },
  { id: "b3-p9", nameEn: "National Salt Master Carton (20x800g)", nameUr: "نیشنل نمک کارٹن (20 پیکٹ)", category: "spices", quantity: 25, buyPrice: 1050, sellPrice: 1250, minQuantity: 8, unit: "carton", barcode: "896101412099" },
  { id: "b3-p10", nameEn: "Surf Excel Master Carton (12x1kg)", nameUr: "سرف ایکسل کارٹن (12 پیکٹ)", category: "household", quantity: 14, buyPrice: 7100, sellPrice: 7800, minQuantity: 4, unit: "carton", barcode: "896101412100" },
];

export const BRANCH_03_CUSTOMERS: Customer[] = [
  {
    id: "b3-c1",
    name: "Saddar Royal Chai Khana & Hotel",
    phone: "0312-9876543",
    address: "Bank Road, Saddar, Rawalpindi",
    creditBalance: 42000,
    creditLimit: 100000,
    lastPurchaseDate: "2026-11-07",
    overdueDays: 9,
    history: [
      { id: "b3-h1", date: "2026-11-07", description: "2 Cartons Tapal Tea, 5 Sacks Sugar", amount: 65050, type: "credit_purchase" },
      { id: "b3-h2", date: "2026-11-02", description: "Cheque Clearance Payment", amount: -50000, type: "payment" },
    ],
  },
  {
    id: "b3-c2",
    name: "Bismillah Canteen & Catering",
    phone: "0334-5566778",
    address: "Haider Road Wholesale Market, Rawalpindi",
    creditBalance: 28500,
    creditLimit: 75000,
    lastPurchaseDate: "2026-11-08",
    overdueDays: 4,
    history: [
      { id: "b3-h3", date: "2026-11-08", description: "3 Sacks Basmati Rice, 2 Tins Dalda", amount: 41900, type: "credit_purchase" },
    ],
  },
];

export const BRANCH_03_SALES: Sale[] = [
  {
    id: "b3-s1",
    shopId: "shop-al-madina-03",
    createdAt: "2026-11-09T07:45:00Z",
    paymentType: "credit",
    customerId: "b3-c1",
    customerName: "Saddar Royal Chai Khana",
    totalAmount: 38900,
    items: [
      { productId: "b3-p6", productName: "Tapal Danedar Master Carton", quantity: 2, unitPrice: 14400, unitCost: 13200 },
      { productId: "b3-p7", productName: "MilkPak Dairy Carton", quantity: 3, unitPrice: 3350, unitCost: 3000 },
    ],
    status: "completed",
  },
  {
    id: "b3-s2",
    shopId: "shop-al-madina-03",
    createdAt: "2026-11-09T10:15:00Z",
    paymentType: "cash",
    totalAmount: 43250,
    items: [
      { productId: "b3-p1", productName: "Refined White Sugar 50kg Sack", quantity: 4, unitPrice: 7250, unitCost: 6800 },
      { productId: "b3-p3", productName: "Dalda Banaspati 16L Tin", quantity: 1, unitPrice: 8200, unitCost: 7600 },
      { productId: "b3-p8", productName: "Fresh Eggs Golden Crate", quantity: 1, unitPrice: 9300, unitCost: 8400 },
    ],
    status: "completed",
  },
];

export const BRANCH_03_EXPENSES: Expense[] = [
  { id: "b3-e1", title: "Haider Road Warehouse Godown Rent", amount: 45000, category: "Rent", date: "2026-11-01" },
  { id: "b3-e2", title: "Ganj Mandi Loader / Mazdoor Wages", amount: 12000, category: "Staff", date: "2026-11-07" },
  { id: "b3-e3", title: "Mazda Truck Goods Freight from Mandi", amount: 6500, category: "Transportation", date: "2026-11-06" },
];


// ==========================================
// Helper function to get branch seed data
// ==========================================
export function getBranchSeedData(shopId: string) {
  if (shopId === "shop-al-madina-02") {
    return {
      products: BRANCH_02_PRODUCTS,
      customers: BRANCH_02_CUSTOMERS,
      sales: BRANCH_02_SALES,
      expenses: BRANCH_02_EXPENSES,
    };
  }
  if (shopId === "shop-al-madina-03") {
    return {
      products: BRANCH_03_PRODUCTS,
      customers: BRANCH_03_CUSTOMERS,
      sales: BRANCH_03_SALES,
      expenses: BRANCH_03_EXPENSES,
    };
  }
  // Default to Branch 01 (Main G-9/4)
  return {
    products: BRANCH_01_PRODUCTS,
    customers: BRANCH_01_CUSTOMERS,
    sales: BRANCH_01_SALES,
    expenses: BRANCH_01_EXPENSES,
  };
}

// Global default fallbacks
export const SEEDED_PRODUCTS = BRANCH_01_PRODUCTS;
export const SEEDED_CUSTOMERS = BRANCH_01_CUSTOMERS;
export const SEEDED_EXPENSES = BRANCH_01_EXPENSES;

export const SEEDED_BENCHMARKS: WholesalePriceBenchmark[] = [
  {
    id: "sugar-1kg",
    itemName: "White Refined Sugar (Cheeni)",
    category: "staples",
    unit: "1kg",
    benchmarkPrice: 140,
    currentShopCost: 142,
    markupPercent: 1.4,
    isInflationFlagged: false,
    trend: "stable",
    recommendation: "Fair wholesale price: +1.4% markup covers standard freight.",
    marketHub: "Grain Market & I-9 Wholesale Exchange, Islamabad",
  },
  {
    id: "ghee-1kg",
    itemName: "Dalda Banaspati Ghee / Cooking Oil",
    category: "dairy",
    unit: "1kg",
    benchmarkPrice: 510,
    currentShopCost: 535,
    markupPercent: 4.9,
    isInflationFlagged: false,
    trend: "up",
    recommendation: "Fair wholesale price: +4.9% markup covers standard freight.",
    marketHub: "Rawalpindi Ganj Mandi",
  },
  {
    id: "atta-10kg",
    itemName: "Fine Wheat Flour / Atta 10kg",
    category: "staples",
    unit: "10kg",
    benchmarkPrice: 1220,
    currentShopCost: 1425,
    markupPercent: 16.8,
    isInflationFlagged: true,
    trend: "up",
    recommendation: "⚠️ High inflation alert: Supplier is charging +16.8% above mandi rate. Renegotiate or source from alternate distributor.",
    marketHub: "Punjab Food Dept Wholesale Rate",
  },
  {
    id: "rice-5kg",
    itemName: "Super Kernel Basmati Rice",
    category: "staples",
    unit: "5kg",
    benchmarkPrice: 1600,
    currentShopCost: 1600,
    markupPercent: 0,
    isInflationFlagged: false,
    trend: "stable",
    recommendation: "Fair wholesale price: +0% markup covers standard freight.",
    marketHub: "Hafizabad / Rawalpindi Mandi",
  },
  {
    id: "tea-450g",
    itemName: "Tapal Danedar Tea",
    category: "beverages",
    unit: "450g",
    benchmarkPrice: 580,
    currentShopCost: 570,
    markupPercent: -1.7,
    isInflationFlagged: false,
    trend: "down",
    recommendation: "✅ Favorable purchase price: 1.7% below mandi benchmark rate.",
    marketHub: "Karachi Tea Traders Exchange / Islamabad Hub",
  },
  {
    id: "milk-1l",
    itemName: "Olper's / MilkPak Dairy Milk 1L",
    category: "dairy",
    unit: "1L",
    benchmarkPrice: 260,
    currentShopCost: 260,
    markupPercent: 0,
    isInflationFlagged: false,
    trend: "stable",
    recommendation: "Official company distributor invoice benchmark.",
    marketHub: "Islamabad Dairy Distribution Hub",
  },
  {
    id: "pulses-chana",
    itemName: "Daal Chana (Chickpea Split)",
    category: "staples",
    unit: "1kg",
    benchmarkPrice: 240,
    currentShopCost: 240,
    markupPercent: 0,
    isInflationFlagged: false,
    trend: "stable",
    recommendation: "Mandi benchmark aligned.",
    marketHub: "Faisalabad Ghalla Mandi",
  },
];

export const SEEDED_SEASONAL_FORECASTS: SeasonalForecast[] = [
  {
    event: "Upcoming Ramadan & Fasting Season",
    period: "Starts in ~4 weeks",
    impactItems: ["Rooh Afza Syrup", "White Sugar (Cheeni)", "Basmati Rice", "Gram Flour (Besan)", "Cooking Oil"],
    recommendedSurgeMultiplier: 2.8,
    advice: "Historical Kiryana velocity for red syrups, sugar, and chickpea flour jumps 280% in Ramadan. Wholesale prices rise by 12-15% 10 days before moon sighting. Recommend locking supplier bulk purchase order now.",
  },
  {
    event: "Winter Chai & Tea Surge",
    period: "Active Season (November - February)",
    impactItems: ["Tapal Danedar Tea", "MilkPak Dairy", "Everyday Milk Powder"],
    recommendedSurgeMultiplier: 1.6,
    advice: "Daily hot beverage consumption in neighbourhood counters rises 60%. Maintain buffer stock of at least 4 master cartons of tea.",
  },
];