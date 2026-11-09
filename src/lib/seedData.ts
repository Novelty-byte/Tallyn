import { Product, Customer, Sale, Expense, WholesalePriceBenchmark, SeasonalForecast } from "@/types";

export const SEEDED_PRODUCTS: Product[] = [
  // Beverages & Tea
  { id: "p1", nameEn: "Tapal Danedar Tea 450g", nameUr: "ٹپال دانیدار چائے 450 گرام", category: "beverages", quantity: 24, buyPrice: 570, sellPrice: 650, minQuantity: 8, unit: "pack", barcode: "896101412001" },
  { id: "p2", nameEn: "Lipton Yellow Label 400g", nameUr: "لپٹن یلو لیبل 400 گرام", category: "beverages", quantity: 18, buyPrice: 590, sellPrice: 670, minQuantity: 6, unit: "pack", barcode: "896101412002" },
  { id: "p3", nameEn: "Vital Tea Leaf 400g", nameUr: "وائٹل چائے 400 گرام", category: "beverages", quantity: 15, buyPrice: 540, sellPrice: 620, minQuantity: 5, unit: "pack", barcode: "896101412003" },
  { id: "p4", nameEn: "Rooh Afza Herbal Syrup 800ml", nameUr: "جامعہ ہمدرد روح افزا 800 ملی", category: "beverages", quantity: 6, buyPrice: 370, sellPrice: 420, minQuantity: 8, unit: "bottle", barcode: "896101412004", isDeadStock: true },
  { id: "p5", nameEn: "Jam-e-Shirin Sharbat 800ml", nameUr: "قرشی جام شیریں 800 ملی", category: "beverages", quantity: 12, buyPrice: 360, sellPrice: 410, minQuantity: 5, unit: "bottle", barcode: "896101412005" },
  { id: "p6", nameEn: "Nestle Everyday Milk Powder 400g", nameUr: "نیسلے ایوری ڈے 400 گرام", category: "beverages", quantity: 16, buyPrice: 630, sellPrice: 710, minQuantity: 6, unit: "pack", barcode: "896101412006" },

  // Staples & Flour & Sugar
  { id: "p7", nameEn: "Dalda Cooking Oil 1L Pouch", nameUr: "ڈالڈا کوکنگ آئل 1 لیٹر", category: "dairy", quantity: 4, buyPrice: 480, sellPrice: 540, minQuantity: 10, unit: "pouch", barcode: "896101412007" },
  { id: "p8", nameEn: "Kisan Canola Oil 1L", nameUr: "کسان کنولا آئل 1 لیٹر", category: "dairy", quantity: 14, buyPrice: 460, sellPrice: 520, minQuantity: 6, unit: "pouch", barcode: "896101412008" },
  { id: "p9", nameEn: "Sufi Banaspati Ghee 1kg", nameUr: "صوفی بناسپتی گھی 1 کلو", category: "dairy", quantity: 9, buyPrice: 470, sellPrice: 530, minQuantity: 8, unit: "pouch", barcode: "896101412009" },
  { id: "p10", nameEn: "White Refined Sugar (Cheeni) 1kg", nameUr: "سفید چینی 1 کلو", category: "staples", quantity: 45, buyPrice: 140, sellPrice: 155, minQuantity: 20, unit: "kg", barcode: "896101412010" },
  { id: "p11", nameEn: "Fine Wheat Flour (Aata) 10kg Bag", nameUr: "فائن آٹا 10 کلو تھیلا", category: "staples", quantity: 8, buyPrice: 1240, sellPrice: 1350, minQuantity: 12, unit: "bag", barcode: "896101412011" },
  { id: "p12", nameEn: "Chakki Whole Wheat Atta 10kg", nameUr: "چکی کا خالص گندم آٹا 10 کلو", category: "staples", quantity: 15, buyPrice: 1380, sellPrice: 1500, minQuantity: 6, unit: "bag", barcode: "896101412012" },
  { id: "p13", nameEn: "Super Kernel Basmati Rice 5kg", nameUr: "کرنل باسمتی چاول 5 کلو", category: "staples", quantity: 18, buyPrice: 1600, sellPrice: 1800, minQuantity: 6, unit: "bag", barcode: "896101412013" },
  { id: "p14", nameEn: "Sella Basmati Rice 5kg", nameUr: "سیلہ باسمتی چاول 5 کلو", category: "staples", quantity: 10, buyPrice: 1450, sellPrice: 1650, minQuantity: 5, unit: "bag", barcode: "896101412014" },
  { id: "p15", nameEn: "Daal Chana (Chickpea Split) 1kg", nameUr: "دال چنا 1 کلو", category: "staples", quantity: 28, buyPrice: 240, sellPrice: 280, minQuantity: 10, unit: "kg", barcode: "896101412015" },
  { id: "p16", nameEn: "Daal Masoor (Red Lentils) 1kg", nameUr: "دال مسور 1 کلو", category: "staples", quantity: 22, buyPrice: 260, sellPrice: 300, minQuantity: 8, unit: "kg", barcode: "896101412016" },
  { id: "p17", nameEn: "Daal Moong Washed 1kg", nameUr: "دال مونگ دھلی 1 کلو", category: "staples", quantity: 25, buyPrice: 270, sellPrice: 310, minQuantity: 8, unit: "kg", barcode: "896101412017" },
  { id: "p18", nameEn: "Daal Mash Washed 1kg", nameUr: "دال ماش دھلی 1 کلو", category: "staples", quantity: 14, buyPrice: 420, sellPrice: 480, minQuantity: 6, unit: "kg", barcode: "896101412018" },
  { id: "p19", nameEn: "White Kabuli Chana 1kg", nameUr: "سفید کابلی چنے 1 کلو", category: "staples", quantity: 30, buyPrice: 310, sellPrice: 360, minQuantity: 10, unit: "kg", barcode: "896101412019" },

  // Dairy & Packed Fats
  { id: "p20", nameEn: "MilkPak Dairy Milk 1L", nameUr: "ملک پیک دودھ 1 لیٹر", category: "dairy", quantity: 32, buyPrice: 260, sellPrice: 290, minQuantity: 12, unit: "pack", barcode: "896101412020" },
  { id: "p21", nameEn: "Olper's Full Cream Milk 1L", nameUr: "اولپرز خالص دودھ 1 لیٹر", category: "dairy", quantity: 28, buyPrice: 260, sellPrice: 290, minQuantity: 10, unit: "pack", barcode: "896101412021" },
  { id: "p22", nameEn: "Nurpur Unsalted Butter 200g", nameUr: "نورپور مکھن 200 گرام", category: "dairy", quantity: 12, buyPrice: 340, sellPrice: 390, minQuantity: 5, unit: "pack", barcode: "896101412022" },
  { id: "p23", nameEn: "Blue Band Margarine 250g", nameUr: "بلیو بینڈ مارجرین 250 گرام", category: "dairy", quantity: 15, buyPrice: 280, sellPrice: 330, minQuantity: 5, unit: "tub", barcode: "896101412023" },
  { id: "p24", nameEn: "Nestle All-Purpose Cream 200ml", nameUr: "نیسلے بالائی کریم 200 ملی", category: "dairy", quantity: 20, buyPrice: 180, sellPrice: 210, minQuantity: 6, unit: "pack", barcode: "896101412024" },

  // Spices & Salts
  { id: "p25", nameEn: "Shan Special Biryani Masala", nameUr: "شان اسپیشل بریانی مصالحہ", category: "spices", quantity: 40, buyPrice: 105, sellPrice: 130, minQuantity: 10, unit: "pack", barcode: "896101412025" },
  { id: "p26", nameEn: "Shan Chicken Karahi Masala", nameUr: "شان چکن کڑاہی مصالحہ", category: "spices", quantity: 35, buyPrice: 105, sellPrice: 130, minQuantity: 10, unit: "pack", barcode: "896101412026" },
  { id: "p27", nameEn: "Shan Korma Mix Masala", nameUr: "شان قورمہ مصالحہ", category: "spices", quantity: 25, buyPrice: 105, sellPrice: 130, minQuantity: 8, unit: "pack", barcode: "896101412027" },
  { id: "p28", nameEn: "National Red Chilli Powder 200g", nameUr: "نیشنل لال مرچ پاؤڈر 200 گرام", category: "spices", quantity: 30, buyPrice: 210, sellPrice: 250, minQuantity: 8, unit: "pack", barcode: "896101412028" },
  { id: "p29", nameEn: "National Turmeric (Haldi) 100g", nameUr: "نیشنل ہلدی پاؤڈر 100 گرام", category: "spices", quantity: 30, buyPrice: 110, sellPrice: 135, minQuantity: 8, unit: "pack", barcode: "896101412029" },
  { id: "p30", nameEn: "National Iodized Salt 800g", nameUr: "نیشنل آیوڈین ملا نمک 800 گرام", category: "spices", quantity: 50, buyPrice: 55, sellPrice: 70, minQuantity: 15, unit: "pack", barcode: "896101412030" },
  { id: "p31", nameEn: "Whole Black Pepper (Kaali Mirch) 100g", nameUr: "ثابت کالی مرچ 100 گرام", category: "spices", quantity: 18, buyPrice: 220, sellPrice: 270, minQuantity: 5, unit: "pack", barcode: "896101412031" },
  { id: "p32", nameEn: "Cumin Seeds (Zeera Safaid) 100g", nameUr: "سفید زیرہ 100 گرام", category: "spices", quantity: 22, buyPrice: 190, sellPrice: 240, minQuantity: 6, unit: "pack", barcode: "896101412032" },

  // Household & Detergents
  { id: "p33", nameEn: "Surf Excel Detergent Powder 500g", nameUr: "سرف ایکسل واشنگ پاؤڈر 500 گرام", category: "household", quantity: 20, buyPrice: 310, sellPrice: 360, minQuantity: 6, unit: "pack", barcode: "896101412033" },
  { id: "p34", nameEn: "Ariel Complete Powder 500g", nameUr: "ایریل ڈٹرجنٹ پاؤڈر 500 گرام", category: "household", quantity: 18, buyPrice: 320, sellPrice: 370, minQuantity: 6, unit: "pack", barcode: "896101412034" },
  { id: "p35", nameEn: "Vim Dishwashing Bar 150g", nameUr: "وم برتن دھونے کا صابن 150 گرام", category: "household", quantity: 45, buyPrice: 65, sellPrice: 80, minQuantity: 15, unit: "bar", barcode: "896101412035" },
  { id: "p36", nameEn: "Max Lemon Liquid 475ml", nameUr: "میکس برتن دھونے کا لیکوڈ", category: "household", quantity: 14, buyPrice: 240, sellPrice: 285, minQuantity: 5, unit: "bottle", barcode: "896101412036" },
  { id: "p37", nameEn: "Lux Beauty Bar Soap 140g", nameUr: "لکس صابن 140 گرام", category: "household", quantity: 38, buyPrice: 135, sellPrice: 160, minQuantity: 12, unit: "bar", barcode: "896101412037" },
  { id: "p38", nameEn: "Dettol Anti-Bacterial Soap 115g", nameUr: "ڈیٹول جراثیم کش صابن", category: "household", quantity: 32, buyPrice: 140, sellPrice: 165, minQuantity: 10, unit: "bar", barcode: "896101412038" },
  { id: "p39", nameEn: "Lifebuoy Total Soap 115g", nameUr: "لائف بوائے صابن", category: "household", quantity: 30, buyPrice: 110, sellPrice: 130, minQuantity: 10, unit: "bar", barcode: "896101412039" },
  { id: "p40", nameEn: "Colgate Maximum Cavity Protection 100g", nameUr: "کولگیٹ ٹوتھ پیسٹ 100 گرام", category: "household", quantity: 22, buyPrice: 180, sellPrice: 215, minQuantity: 8, unit: "tube", barcode: "896101412040" },
  { id: "p41", nameEn: "Harpic Power Plus 500ml", nameUr: "ہارپک ٹوائلٹ کلینر 500 ملی", category: "household", quantity: 15, buyPrice: 290, sellPrice: 340, minQuantity: 5, unit: "bottle", barcode: "896101412041" },

  // Biscuits & Snacks
  { id: "p42", nameEn: "Peek Freans Sooper Biscuit Family", nameUr: "سوپر بسکٹ فیملی پیک", category: "snacks", quantity: 30, buyPrice: 90, sellPrice: 110, minQuantity: 10, unit: "pack", barcode: "896101412042" },
  { id: "p43", nameEn: "Peek Freans Gluco Biscuit Half Roll", nameUr: "گلوکو بسکٹ ہاف رول", category: "snacks", quantity: 40, buyPrice: 42, sellPrice: 50, minQuantity: 15, unit: "pack", barcode: "896101412043" },
  { id: "p44", nameEn: "LU Prince Chocolate Biscuits", nameUr: "پرنس چاکلیٹ بسکٹ", category: "snacks", quantity: 35, buyPrice: 45, sellPrice: 55, minQuantity: 12, unit: "pack", barcode: "896101412044" },
  { id: "p45", nameEn: "Lays Classic Salted Potato Chips", nameUr: "لیز نمکین چپس", category: "snacks", quantity: 25, buyPrice: 52, sellPrice: 60, minQuantity: 10, unit: "pack", barcode: "896101412045" },
  { id: "p46", nameEn: "Kurkure Red Chilli Jhatpat", nameUr: "کرکرے چٹپٹا سنیک", category: "snacks", quantity: 28, buyPrice: 42, sellPrice: 50, minQuantity: 10, unit: "pack", barcode: "896101412046" },
  { id: "p47", nameEn: "Kolson Slanty Jalapeno Chips", nameUr: "کولسن سلانٹی چپس", category: "snacks", quantity: 26, buyPrice: 42, sellPrice: 50, minQuantity: 10, unit: "pack", barcode: "896101412047" },
  { id: "p48", nameEn: "Mitchell's Tomato Ketchup 300g", nameUr: "مچلز ٹماٹو کیچپ 300 گرام", category: "staples", quantity: 18, buyPrice: 185, sellPrice: 220, minQuantity: 6, unit: "pouch", barcode: "896101412048" },
  { id: "p49", nameEn: "Young's Mayonnaise 300ml", nameUr: "ینگ مایونیز 300 ملی", category: "staples", quantity: 15, buyPrice: 240, sellPrice: 285, minQuantity: 5, unit: "pouch", barcode: "896101412049" },
  { id: "p50", nameEn: "National Mixed Pickle 500g Jar", nameUr: "نیشنل مکس اچار 500 گرام", category: "spices", quantity: 14, buyPrice: 280, sellPrice: 330, minQuantity: 5, unit: "jar", barcode: "896101412050" },
  { id: "p51", nameEn: "Shezan Apple Jam 450g", nameUr: "شیزان سیب کا جام 450 گرام", category: "staples", quantity: 12, buyPrice: 320, sellPrice: 375, minQuantity: 4, unit: "jar", barcode: "896101412051" },
  { id: "p52", nameEn: "Matchbox Pak Matches (Bundle of 10)", nameUr: "ماچس ڈبیا (بنڈل 10 عدد)", category: "household", quantity: 50, buyPrice: 70, sellPrice: 90, minQuantity: 15, unit: "bundle", barcode: "896101412052" },
  { id: "p53", nameEn: "Rose Petal Tissue Box Pop-up", nameUr: "روز پیٹل ٹشو باکس", category: "household", quantity: 24, buyPrice: 170, sellPrice: 205, minQuantity: 8, unit: "box", barcode: "896101412053" },
  { id: "p54", nameEn: "Tang Instant Powder Mango 375g", nameUr: "ٹینگ مینگو پاؤڈر 375 گرام", category: "beverages", quantity: 10, buyPrice: 390, sellPrice: 460, minQuantity: 5, unit: "pouch", barcode: "896101412054" },
  { id: "p55", nameEn: "Shan Ginger Garlic Paste 310g", nameUr: "شان ادرک لہسن پیسٹ 310 گرام", category: "spices", quantity: 16, buyPrice: 220, sellPrice: 260, minQuantity: 5, unit: "jar", barcode: "896101412055" },
  { id: "p56", nameEn: "Pakola Ice Cream Soda 1.5L", nameUr: "پاکولا بوتل 1.5 لیٹر", category: "beverages", quantity: 18, buyPrice: 145, sellPrice: 170, minQuantity: 6, unit: "bottle", barcode: "896101412056" },
  { id: "p57", nameEn: "Coca Cola Regular 1.5L", nameUr: "کوکا کولا 1.5 لیٹر", category: "beverages", quantity: 22, buyPrice: 155, sellPrice: 180, minQuantity: 8, unit: "bottle", barcode: "896101412057" },
  { id: "p58", nameEn: "Sprite Lemon Soda 1.5L", nameUr: "سپرائٹ بوتل 1.5 لیٹر", category: "beverages", quantity: 20, buyPrice: 155, sellPrice: 180, minQuantity: 8, unit: "bottle", barcode: "896101412058" },
  { id: "p59", nameEn: "Sunridge Fortified Chakki Atta 10kg", nameUr: "سن رج چکی آٹا 10 کلو", category: "staples", quantity: 10, buyPrice: 1420, sellPrice: 1550, minQuantity: 5, unit: "bag", barcode: "896101412059" },
  { id: "p60", nameEn: "Habib Cooking Oil 1L Pouch", nameUr: "حبیب کوکنگ آئل 1 لیٹر", category: "dairy", quantity: 12, buyPrice: 485, sellPrice: 545, minQuantity: 6, unit: "pouch", barcode: "896101412060" },
];

export const SEEDED_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Asif Bhai (Makan #12)",
    phone: "03001234567",
    address: "House 12, Street 4, G-9/4, Islamabad",
    creditBalance: 3400,
    creditLimit: 10000,
    lastPurchaseDate: "2026-10-26",
    overdueDays: 14,
    history: [
      { id: "h1", date: "2026-10-26", description: "2 Cooking Oil, 5kg Atta on Udhaar", amount: 2430, type: "credit_purchase" },
      { id: "h2", date: "2026-10-15", description: "Partial Cash Payment", amount: -1500, type: "payment" },
      { id: "h3", date: "2026-10-10", description: "Monthly Groceries & Tea", amount: 2470, type: "credit_purchase" },
    ],
  },
  {
    id: "c2",
    name: "Tariq Sahab (Govt School Teacher)",
    phone: "03217654321",
    address: "Flat 4B, Sector G-9/1, Islamabad",
    creditBalance: 1250,
    creditLimit: 8000,
    lastPurchaseDate: "2026-11-06",
    overdueDays: 3,
    history: [
      { id: "h4", date: "2026-11-06", description: "Sugar 2kg, MilkPak 2L", amount: 890, type: "credit_purchase" },
    ],
  },
  {
    id: "c3",
    name: "Haji Abdul Rehman",
    phone: "03339876543",
    address: "Near Jamia Masjid Bilal, G-9/4",
    creditBalance: 0,
    creditLimit: 15000,
    lastPurchaseDate: "2026-11-08",
    overdueDays: 0,
    history: [
      { id: "h5", date: "2026-11-08", description: "Full Payment Settled", amount: -4200, type: "payment" },
    ],
  },
  {
    id: "c4",
    name: "Usman Tailor Master",
    phone: "03455551234",
    address: "Al-Karam Plaza, Shop #2",
    creditBalance: 4800,
    creditLimit: 6000,
    lastPurchaseDate: "2026-10-18",
    overdueDays: 22,
    history: [
      { id: "h6", date: "2026-10-18", description: "Bulk Soap & Detergents for Shop", amount: 4800, type: "credit_purchase" },
    ],
  },
  {
    id: "c5",
    name: "Qari Naeem Sahab",
    phone: "03123456789",
    address: "Madrasa Anwar-ul-Quran, G-9/4",
    creditBalance: 850,
    creditLimit: 5000,
    lastPurchaseDate: "2026-11-07",
    overdueDays: 2,
    history: [
      { id: "h7", date: "2026-11-07", description: "Tapal Tea 450g", amount: 650, type: "credit_purchase" },
    ],
  },
  {
    id: "c6",
    name: "Dr. Farhan Clinic",
    phone: "03019998877",
    address: "Main Bazar Medical Center",
    creditBalance: 2150,
    creditLimit: 12000,
    lastPurchaseDate: "2026-11-04",
    overdueDays: 5,
    history: [
      { id: "h8", date: "2026-11-04", description: "Dettol soap box & tissue boxes", amount: 2150, type: "credit_purchase" },
    ],
  },
  {
    id: "c7",
    name: "Rasheed Barber Shop",
    phone: "03024443322",
    address: "Shop 7, Main Bazar",
    creditBalance: 1400,
    creditLimit: 4000,
    lastPurchaseDate: "2026-11-01",
    overdueDays: 8,
    history: [
      { id: "h9", date: "2026-11-01", description: "Lifebuoy soap carton & matches", amount: 1400, type: "credit_purchase" },
    ],
  },
  {
    id: "c8",
    name: "Malik Property Advisor",
    phone: "03058887766",
    address: "Office #12, G-9 Commercial Area",
    creditBalance: 0,
    creditLimit: 20000,
    lastPurchaseDate: "2026-11-05",
    overdueDays: 0,
    history: [
      { id: "h10", date: "2026-11-05", description: "Tea bags & milk settlement", amount: -2800, type: "payment" },
    ],
  },
];

export const SEEDED_EXPENSES: Expense[] = [
  { id: "exp-1", title: "Monthly Shop Rent (November)", amount: 35000, category: "Rent", date: "2026-11-01" },
  { id: "exp-2", title: "IESCO Electricity Bill Spike", amount: 24800, category: "Electricity", date: "2026-11-05" }, // Anomaly: utility spike
  { id: "exp-3", title: "Counter Staff Daily Wages", amount: 3000, category: "Staff", date: "2026-11-08" },
  { id: "exp-4", title: "Suzuki Pick-Up Wholesale Transport", amount: 2500, category: "Transportation", date: "2026-11-07" },
  { id: "exp-5", title: "Plastic Shopping Bags & Packaging", amount: 1800, category: "Packaging", date: "2026-11-06" },
];

export const SEEDED_BENCHMARKS: WholesalePriceBenchmark[] = [
  { itemName: "White Sugar 50kg bag", category: "staples", benchmarkPrice: 6800, currentShopCost: 7000, markupPercent: 2.9, isInflationFlagged: false },
  { itemName: "Dalda Cooking Oil (Carton 16L)", category: "dairy", benchmarkPrice: 7200, currentShopCost: 7680, markupPercent: 6.6, isInflationFlagged: false },
  { itemName: "Tapal Danedar (Master Carton)", category: "beverages", benchmarkPrice: 12500, currentShopCost: 13680, markupPercent: 9.4, isInflationFlagged: false },
  { itemName: "Fine Wheat Flour 20kg Bag", category: "staples", benchmarkPrice: 2400, currentShopCost: 2850, markupPercent: 18.7, isInflationFlagged: true },
  { itemName: "Super Kernel Basmati (50kg Bag)", category: "staples", benchmarkPrice: 14800, currentShopCost: 16000, markupPercent: 8.1, isInflationFlagged: false },
  { itemName: "Daal Chana Wholesale (40kg bag)", category: "staples", benchmarkPrice: 8800, currentShopCost: 9600, markupPercent: 9.1, isInflationFlagged: false },
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
