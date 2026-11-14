// Tallyn documentation content. Every page lives at /docs/<slug>; every section is an
// anchor (/docs/<slug>#<section-id>). Inline text supports **bold**, `code` and
// [links](/docs/other-page) — rendered as React elements, never as raw HTML.

export type DocBlock =
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "steps"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "note" | "tip" | "warn"; title?: string; text: string }
  | { t: "code"; lang?: string; code: string }
  | { t: "flow"; steps: { title: string; text: string }[] }
  | { t: "cards"; items: { title: string; text: string; href: string }[] };

export interface DocSection { id: string; title: string; blocks: DocBlock[] }
export interface DocPage { slug: string; group: string; title: string; summary: string; sections: DocSection[] }

export const DOC_GROUPS = ["Getting started", "Using Tallyn", "Tallyn AI", "How it works", "Self-hosting", "Help"] as const;

export const DOC_PAGES: DocPage[] = [
  /* ============================== GETTING STARTED ============================== */
  {
    slug: "overview",
    group: "Getting started",
    title: "Overview",
    summary: "Tallyn is a mobile-first shop app for neighbourhood kiryana stores: fast checkout, udhaar tracking, stock and plain-language advice.",
    sections: [
      {
        id: "what-is-tallyn",
        title: "What is Tallyn?",
        blocks: [
          { t: "p", text: "Tallyn turns a shop's daily entries into clear answers: **what to restock, who to remind, and why profit moved**. It is built for a shopkeeper standing behind a counter with one hand free, on a phone first and a laptop second." },
          { t: "p", text: "Any shopkeeper can sign up, create one or more shops, and manage each shop's stock, sales, purchases, expenses and customer credit (udhaar) separately." },
        ],
      },
      {
        id: "what-you-can-do",
        title: "What you can do",
        blocks: [
          {
            t: "cards", items: [
              { title: "Checkout", text: "Tap, scan or speak a sale. Cash or udhaar, with a 10-second undo.", href: "/docs/checkout" },
              { title: "Udhaar ledger", text: "Who owes what, when it is due, and one-tap WhatsApp reminders.", href: "/docs/udhaar" },
              { title: "Purchases & bill scanner", text: "Photograph a supplier bill; Tallyn reads it and raises stock after you check it.", href: "/docs/purchases" },
              { title: "Smart Insights", text: "Alerts, trends, a restock planner and a Ramadan countdown.", href: "/docs/insights" },
              { title: "Tallyn AI", text: "Ask about your shop in English, Roman Urdu or Urdu.", href: "/docs/tallyn-ai" },
              { title: "Inventory", text: "Products, prices, minimum levels, barcodes and stock adjustments.", href: "/docs/inventory" },
            ],
          },
        ],
      },
      {
        id: "principles",
        title: "Five principles",
        blocks: [
          {
            t: "table", head: ["Principle", "What it means for you"], rows: [
              ["Zero hallucinated numbers", "Every amount, balance, profit and \"days left\" is calculated by tested code. The AI only reads bills and explains numbers — it never invents them. See [Accuracy](/docs/accuracy)."],
              ["Atomic changes", "A sale, purchase or payment is saved completely or not at all, inside one database transaction."],
              ["Your shop only", "Every record belongs to a shop, and the database refuses access to shops you don't own. See [Security](/docs/security)."],
              ["Counter first", "Large tap targets (44 px+), high contrast, aligned money columns, and a checkout that needs as few taps as possible."],
              ["Keeps working", "If the AI service is slow or down, checkout, udhaar and stock keep working normally."],
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "quickstart",
    group: "Getting started",
    title: "Quickstart",
    summary: "Try the demo shop in under a minute, or create your own shop.",
    sections: [
      {
        id: "try-the-demo",
        title: "Try the demo shop",
        blocks: [
          { t: "steps", items: [
            "Open the homepage and tap **Launch Live Demo** (or **Demo Store** in the navbar).",
            "You land on the **Dashboard** of *Al-Madina Kiryana*, with 60 days of realistic sales history ending today.",
            "Open **Checkout**, tap a few products and record a sale. Watch the 10-second **Undo** banner.",
            "Open **Insights** to see alerts, trends and the restock planner.",
          ] },
          { t: "note", text: "The demo runs entirely in your browser. Nothing you do there touches a real shop. Leave it any time with **Exit Demo Mode** in the green banner." },
          { t: "tip", text: "The demo shop opens at 8:00. Before that, today's figures are correctly zero." },
        ],
      },
      {
        id: "create-your-shop",
        title: "Create your own shop",
        blocks: [
          { t: "steps", items: [
            "Tap **Register Your Store** and sign up with email and password (or a magic link).",
            "Name your shop, keep PKR as the currency, and choose the **starter catalogue** (common kiryana items) or an empty shop.",
            "Set your **supplier lead time** (days between ordering and delivery). The restock planner uses it.",
            "You're in. Add or edit products in **Inventory**, then start selling in **Checkout**.",
          ] },
        ],
      },
      {
        id: "first-sale",
        title: "Your first sale",
        blocks: [
          { t: "steps", items: [
            "In **Checkout**, tap products (or scan their barcodes) to fill the cart.",
            "Choose **Cash** or **Udhaar**. For udhaar, pick the customer and a pay-back date.",
            "Tap **Record Sale**. Stock goes down immediately; tap **Undo** within 10 seconds if you made a mistake.",
          ] },
        ],
      },
    ],
  },

  /* ================================ USING TALLYN ================================ */
  {
    slug: "checkout",
    group: "Using Tallyn",
    title: "Checkout",
    summary: "Record a sale in a few taps — by tapping, scanning or speaking.",
    sections: [
      {
        id: "adding-items",
        title: "Adding items to the cart",
        blocks: [
          { t: "ul", items: [
            "**Tap** a product tile. Each tap adds one; use the − / + steppers in the cart to adjust.",
            "**Search** by name or barcode, or filter with the category chips.",
            "**Type a full barcode** in the search box and press Enter to add that item directly.",
          ] },
          { t: "note", text: "You can never sell more than is on the shelf: Tallyn stops at the stock level and tells you." },
        ],
      },
      {
        id: "barcode-scanning",
        title: "Scanning barcodes",
        blocks: [
          { t: "p", text: "Tap **Scan** and allow the camera. Each barcode read adds **one** item and shows what happened: added, out of stock, or not in your stock. Keep scanning item after item, then tap **Done — back to cart**." },
          { t: "ul", items: [
            "Holding an item in front of the camera adds it once. To add a second unit, move it away and back.",
            "Phones with a flashlight show a torch button for dim shops.",
            "Android Chrome/Edge use the phone's built-in barcode reader; iPhone and desktop browsers download a small reader (about 460 KB) the first time.",
            "**USB or Bluetooth barcode scanners** work on the Checkout screen without opening anything — just scan.",
          ] },
          { t: "tip", text: "No camera? Type the barcode numbers in the scanner sheet. The demo shop also offers sample barcodes." },
        ],
      },
      {
        id: "voice-orders",
        title: "Voice orders",
        blocks: [
          { t: "p", text: "Tap **Speak order** and say the order, for example *\"do chai, ek oil, udhaar Asif\"*. Choose Urdu or English first. Tallyn shows what it understood in a confirmation sheet; nothing is added until you tap **Add to cart**." },
          { t: "p", text: "Voice needs Chrome or Edge. In other browsers, tap **Type it** and type the same sentence — it is read the same way." },
        ],
      },
      {
        id: "cash-or-udhaar",
        title: "Cash or udhaar",
        blocks: [
          { t: "p", text: "For an **udhaar** (credit) sale you must choose the customer explicitly and set a **pay-back date** — 1 week, 2 weeks, 1 month, or any date you pick. Tap **Add new customer** to open an account on the spot; it is selected automatically." },
          { t: "p", text: "After an udhaar sale the customer selection clears, so the next credit sale can't go to the wrong person by accident." },
        ],
      },
      {
        id: "record-and-undo",
        title: "Recording and undoing a sale",
        blocks: [
          { t: "p", text: "**Record Sale** saves the sale and lowers stock in one database transaction. An **Undo** banner counts down for 10 seconds; undoing restores the stock (the server allows an undo within 10 minutes)." },
          { t: "warn", title: "If the sale is refused", text: "If the server refuses a sale (for example, not enough stock), you see the reason and your cart is kept so you can fix it. Only a lost internet connection saves a sale on the device, and Tallyn tells you when that happens." },
        ],
      },
    ],
  },
  {
    slug: "udhaar",
    group: "Using Tallyn",
    title: "Udhaar ledger",
    summary: "Track customer credit: balances, due dates, payments and reminders.",
    sections: [
      {
        id: "balances",
        title: "How balances work",
        blocks: [
          { t: "p", text: "A customer's balance is **all their udhaar sales minus all their payments**. It is calculated, never typed in, so it can't drift." },
          { t: "p", text: "Payments clear the **oldest** udhaar first. If Asif owes for a sale from the 1st and another from the 10th, his next payment pays off the 1st before the 10th." },
        ],
      },
      {
        id: "due-dates",
        title: "Due dates and overdue",
        blocks: [
          { t: "p", text: "Every udhaar sale has its own pay-back date. A customer's **next due date** is the earliest date among sales they haven't fully paid yet." },
          { t: "table", head: ["Status", "Meaning"], rows: [
            ["Due in N days", "Not due yet."],
            ["Due today", "The pay-back date is today. Not overdue yet."],
            ["N days overdue", "Today is past the pay-back date."],
          ] },
        ],
      },
      {
        id: "recording-payments",
        title: "Recording a payment",
        blocks: [
          { t: "steps", items: [
            "In **Udhaar**, tap **Record Payment** on the customer's row.",
            "Enter the amount, or tap **Paid in full**.",
            "Tap **Confirm Payment**.",
          ] },
          { t: "note", text: "You can't record more than the customer owes — both the app and the database check." },
        ],
      },
      {
        id: "whatsapp-reminders",
        title: "WhatsApp reminders",
        blocks: [
          { t: "p", text: "Tap **WhatsApp** on a customer's row to open a ready-to-send, polite reminder in Urdu-friendly English, with your shop name, the exact amount and the due date:" },
          { t: "code", code: "Assalam-o-Alaikum Asif Bhai! 🙏\nMadina Store ki taraf se a gentle reminder: aap ke account par PKR 3,400 udhaar baqi hai. Yeh payment 7 Nov 2026 tak due thi.\nJab bhi aap ko convenient ho, please clear kar dijiye ga.\nBohat shukriya! 😊" },
          { t: "p", text: "Pakistani mobile numbers in any common format (`0300-1234567`, `+92 300 1234567`) work. If a number doesn't look like a mobile number, Tallyn tells you instead of opening a broken link." },
        ],
      },
    ],
  },
  {
    slug: "inventory",
    group: "Using Tallyn",
    title: "Inventory",
    summary: "Products, prices, minimum levels, barcodes and stock adjustments.",
    sections: [
      {
        id: "products",
        title: "Products",
        blocks: [
          { t: "p", text: "Each product has a name, category, stock quantity, buying price, selling price, a **minimum level**, and optionally an expiry date and a barcode. Search and category filters help on long lists." },
        ],
      },
      {
        id: "adjusting-stock",
        title: "Adjusting stock",
        blocks: [
          { t: "p", text: "Use the stock adjustment button to add or remove units **with a reason**: recount, spillage/damage, or personal use. Every adjustment is logged." },
          { t: "tip", text: "Deliveries from suppliers should go through [Purchases](/docs/purchases), not adjustments — purchases also update the buying price." },
        ],
      },
      {
        id: "low-stock",
        title: "Low stock and minimum levels",
        blocks: [
          { t: "p", text: "An item at or below its minimum level is marked low and appears in the Dashboard's low-stock card and the [restock planner](/docs/insights#restock-planner)." },
        ],
      },
      {
        id: "combo-offers",
        title: "Combo offers for slow stock",
        blocks: [
          { t: "p", text: "Inventory can pair a slow-moving item with a popular one and prepare a WhatsApp offer text to share with customers." },
        ],
      },
    ],
  },
  {
    slug: "purchases",
    group: "Using Tallyn",
    title: "Purchases & bill scanner",
    summary: "Raise stock from a supplier bill — scanned with AI, or entered by hand.",
    sections: [
      {
        id: "scan-a-bill",
        title: "Scanning a supplier bill",
        blocks: [
          { t: "flow", steps: [
            { title: "1. Photo", text: "Take or choose a photo of the bill or parchi." },
            { title: "2. AI reads it", text: "Items, quantities, rates and amounts are copied exactly as written." },
            { title: "3. Code matches", text: "Each line is matched to your stock; unit costs and checks are calculated." },
            { title: "4. You review", text: "Edit anything, then tap Save. Only then does stock go up." },
          ] },
          { t: "steps", items: [
            "In **Purchases**, tap **Scan supplier bill**, then **Take photo** or **Choose from gallery**.",
            "Wait while Tallyn reads the bill (usually 5–15 seconds; free AI tiers can take up to a minute).",
            "Check each line in the review sheet, then tap **Save purchase & raise stock**.",
          ] },
          { t: "tip", title: "Getting a good read", text: "Lay the bill flat, in good light, with the whole bill in the frame. Printed and neat handwritten bills both work; Urdu is fine." },
        ],
      },
      {
        id: "review-sheet",
        title: "The review sheet",
        blocks: [
          { t: "table", head: ["You see", "Meaning"], rows: [
            ["Amber line", "The product match is uncertain, or the bill's amount doesn't equal quantity × rate. Check it."],
            ["\"Not in my stock (skip this line)\"", "No matching product. Pick one from the list, or leave it skipped."],
            ["Cost up X% since your last buy", "The supplier's cost rose more than 5%. Tallyn suggests a selling price that keeps your margin."],
            ["Bill total differs", "The lines you're saving don't add up to the bill's printed total — a line may have been misread."],
          ] },
          { t: "note", text: "Nothing is saved until you tap Save. The AI never writes to your books." },
        ],
      },
      {
        id: "enter-by-hand",
        title: "Entering a purchase by hand",
        blocks: [
          { t: "p", text: "Tap **Enter purchase by hand** to use the same review sheet without a photo: add lines, choose products, enter quantities and costs, and save. If a scan fails, **Enter this bill by hand** keeps the photo visible for reference." },
        ],
      },
      {
        id: "mandi-benchmarks",
        title: "Mandi benchmark panel",
        blocks: [
          { t: "warn", text: "The mandi benchmark cards on the Purchases page use fixed sample rates for common staples. They are a reference, not live market prices." },
        ],
      },
    ],
  },
  {
    slug: "dashboard",
    group: "Using Tallyn",
    title: "Dashboard",
    summary: "Today at a glance: sales, cash vs udhaar, profit and what needs action.",
    sections: [
      {
        id: "todays-pulse",
        title: "Today's pulse",
        blocks: [
          { t: "p", text: "The top cards show **today's** sales only (your shop's local day): revenue, cash received, udhaar given, estimated gross profit and margin." },
        ],
      },
      {
        id: "action-cards",
        title: "Action cards",
        blocks: [
          { t: "p", text: "The **low stock** card names the item running out soonest; the **overdue udhaar** card names the customer who is most overdue, with a shortcut to send a reminder." },
        ],
      },
      {
        id: "seven-day-chart",
        title: "7-day sales chart",
        blocks: [
          { t: "p", text: "Cash and udhaar sales per day for the last 7 days, with a one-line summary comparing the last 7 full days with the 7 before. Hover or drag across the chart to read each day (or use the arrow keys); switch to **Table** to see every number." },
        ],
      },
    ],
  },
  {
    slug: "insights",
    group: "Using Tallyn",
    title: "Smart Insights",
    summary: "What to restock, who to remind, and why your profit moved.",
    sections: [
      {
        id: "alerts",
        title: "Alerts: needs your attention",
        blocks: [
          { t: "table", head: ["Alert", "When it appears"], rows: [
            ["Sales drop / jump", "Yesterday's sales were below 60% (or above 140%) of the same weekday's average over the 4 weeks before."],
            ["Expense spike", "A category's latest bill is more than 1.5× the average of its previous bills."],
            ["Not selling", "An item in stock had zero sales in 30 days. Shows the money tied up at cost."],
            ["Expiring soon", "An item expires within 7 days."],
            ["Restock soon", "Items out of stock, below minimum, or running out within your lead time + 3 days."],
            ["Overdue udhaar", "Customers past their pay-back date, largest balance first."],
          ] },
        ],
      },
      {
        id: "period-and-tiles",
        title: "Period filter and profit tiles",
        blocks: [
          { t: "p", text: "Choose **Last 7, 30 or 60 days**. Every tile, chart and table below uses that period. Periods are **complete days ending yesterday**, so comparisons are fair; today's live numbers are on the [Dashboard](/docs/dashboard)." },
          { t: "p", text: "Tiles show sales, gross profit (with margin), expenses and net profit, each compared with the previous period of the same length." },
        ],
      },
      {
        id: "trend-chart",
        title: "Sales and profit chart",
        blocks: [
          { t: "p", text: "Daily sales and gross profit with a one-line headline. Hover, drag or use arrow keys to read each day; **Table** shows every value." },
        ],
      },
      {
        id: "restock-planner",
        title: "Restock planner",
        blocks: [
          { t: "code", lang: "formula", code: "sells per day = units sold in the last 14 days ÷ 14\ndays left     = stock ÷ sells per day\norder         = (sells per day × (lead time + 3)) − stock, rounded up, never below 0" },
          { t: "p", text: "The lead time is your shop's supplier lead time from Settings. Items that haven't sold recently show **no recent sales** instead of a made-up number. Sort any column; switch between **Needs action** and **All**." },
        ],
      },
      {
        id: "sellers-and-expenses",
        title: "Best & slowest sellers, expenses",
        blocks: [
          { t: "p", text: "**Best sellers** ranks products by units, sales or profit (sortable). **Slowest** lists what sold least, including items that didn't sell at all. **Where the money went** breaks expenses down by category, largest first." },
        ],
      },
      {
        id: "ramadan-planner",
        title: "Ramadan planner",
        blocks: [
          { t: "p", text: "A countdown to the expected start of Ramadan (±1 day for moon sighting) and the current stock outlook for your Ramadan staples — sugar, oil, besan, Rooh Afza, dates, rice and similar. It does not predict a demand multiplier." },
        ],
      },
    ],
  },
  {
    slug: "more-tools",
    group: "Using Tallyn",
    title: "History, radio & shops",
    summary: "Sales history, Kiryana Radio, multiple shops and settings.",
    sections: [
      {
        id: "sales-history",
        title: "Sales history",
        blocks: [{ t: "p", text: "Every sale with its items, payment type and customer. Search to find a sale quickly." }],
      },
      {
        id: "kiryana-radio",
        title: "Kiryana Radio",
        blocks: [{ t: "p", text: "Tap the radio button in the navbar to hear a spoken briefing of today's figures and urgent items, using your browser's built-in voice." }],
      },
      {
        id: "multiple-shops",
        title: "Multiple shops and branches",
        blocks: [
          { t: "p", text: "Use the shop switcher at the top left to move between branches or add a new one. Each shop has completely separate products, customers, sales and purchases." },
        ],
      },
      {
        id: "settings",
        title: "Settings",
        blocks: [
          { t: "p", text: "Shop details, low-stock threshold and supplier lead time." },
          { t: "note", text: "The interface is currently English only. Tallyn AI and voice orders understand Urdu and Roman Urdu." },
        ],
      },
    ],
  },

  /* ================================= TALLYN AI ================================= */
  {
    slug: "tallyn-ai",
    group: "Tallyn AI",
    title: "Tallyn AI",
    summary: "Ask about your shop in plain words. Answers use only numbers Tallyn calculated.",
    sections: [
      {
        id: "what-to-ask",
        title: "What you can ask",
        blocks: [
          { t: "ul", items: [
            "\"Which items didn't sell this month and how much money is stuck in them?\"",
            "\"Kis customer ka udhaar sab se zyada hai aur kitne din late hai?\"",
            "\"Which items are running low?\"",
            "\"How do I record a payment?\"",
          ] },
          { t: "p", text: "Open it from the **Tallyn AI** button in the navbar when you're inside a shop or the demo." },
        ],
      },
      {
        id: "languages",
        title: "Languages",
        blocks: [{ t: "p", text: "Write in English, Roman Urdu or Urdu script; Tallyn replies in the same language. The language is detected by code, not guessed by the AI." }],
      },
      {
        id: "how-it-stays-accurate",
        title: "How it stays accurate",
        blocks: [
          { t: "flow", steps: [
            { title: "Your shop data", text: "Sales, stock, customers and expenses on your device." },
            { title: "Snapshot (code)", text: "Today, last 7 days, udhaar, low stock, top sellers, unsold items — calculated and tested." },
            { title: "Server check", text: "The snapshot is validated and cleaned on the server." },
            { title: "AI explains", text: "The model may only quote those numbers and must not calculate new ones." },
          ] },
          { t: "p", text: "If you ask for a number that isn't in the snapshot — for example a profit forecast — Tallyn AI says so and points you to the right screen instead of inventing one." },
        ],
      },
      {
        id: "limits-and-offline",
        title: "Limits and offline answers",
        blocks: [
          { t: "table", head: ["Who", "Questions per 24 hours"], rows: [["Signed-in shop owner", "150"], ["Demo visitor", "30 (and 1,500 across all demo visitors)"]] },
          { t: "p", text: "If the AI is unavailable or a limit is reached, Tallyn still answers common questions straight from your shop data and says why." },
        ],
      },
    ],
  },

  /* =============================== HOW IT WORKS =============================== */
  {
    slug: "architecture",
    group: "How it works",
    title: "Architecture",
    summary: "The parts of Tallyn and how a sale flows through them.",
    sections: [
      {
        id: "stack",
        title: "Technology stack",
        blocks: [
          { t: "table", head: ["Layer", "Choice"], rows: [
            ["App", "React 19, Vite, TypeScript (strict), React Router"],
            ["Styling", "Tailwind CSS v4 with hand-built components; custom SVG charts"],
            ["Data & auth", "Supabase: Postgres with row-level security, Auth, stored procedures"],
            ["AI", "Two Supabase Edge Functions (Deno): `ai-gateway` (Tallyn AI) and `bill-scan` (Gemini Vision)"],
            ["Barcodes", "Browser `BarcodeDetector`, ZXing fallback"],
            ["Tests", "Vitest (app logic), Deno tests (AI gateway)"],
          ] },
        ],
      },
      {
        id: "system-diagram",
        title: "System overview",
        blocks: [
          { t: "flow", steps: [
            { title: "Browser app", text: "Screens, deterministic maths, camera, voice." },
            { title: "Supabase Postgres", text: "Tables + RLS + atomic stored procedures." },
            { title: "Edge Functions", text: "ai-gateway and bill-scan; AI key kept here." },
            { title: "AI model", text: "Gemini (direct, or via an OpenAI-compatible provider)." },
          ] },
          { t: "p", text: "The browser talks to the database for shop data and to the Edge Functions for AI. The AI key exists only as a server secret." },
        ],
      },
      {
        id: "sale-flow",
        title: "What happens when you record a sale",
        blocks: [
          { t: "steps", items: [
            "Checkout checks stock and, for udhaar, that a customer and due date are set.",
            "The app calls the `record_sale` stored procedure with the shop, items, customer and due date.",
            "The server confirms you own the shop and the customer belongs to it, locks each product row, checks stock, saves the sale and its items with today's buying cost, and lowers stock — all in one transaction.",
            "The app re-reads your shop's data, so every screen shows the server's numbers.",
          ] },
        ],
      },
      {
        id: "folder-structure",
        title: "Code layout",
        blocks: [
          { t: "code", code: "src/\n  app/          App shell and routes\n  features/     One folder per screen (checkout, udhaar, insights, docs, …)\n  components/   Shared UI: layout, charts, effects\n  domain/       Pure business logic + tests (credit, insights, bill matching, …)\n  services/     Database, AI, camera\n  data/         Demo shop data\n  lib/          Small helpers\nsupabase/\n  migrations/   SQL schema, procedures, security\n  functions/    ai-gateway, bill-scan" },
        ],
      },
    ],
  },
  {
    slug: "accuracy",
    group: "How it works",
    title: "Accuracy",
    summary: "Why Tallyn's numbers can be trusted: every figure comes from tested code.",
    sections: [
      {
        id: "the-rule",
        title: "The rule",
        blocks: [
          { t: "p", text: "**The AI never calculates a number.** Profit, balances, stock, days left and totals are all computed in TypeScript or in the database. The AI reads bills (copying numbers as written) and explains numbers it is given." },
        ],
      },
      {
        id: "formulas",
        title: "Formula reference",
        blocks: [
          { t: "table", head: ["Figure", "How it's calculated"], rows: [
            ["Gross profit", "sales − Σ(buying cost at the time of sale × quantity)"],
            ["Net profit", "gross profit − expenses in the period"],
            ["Udhaar balance", "udhaar sales − payments (payments clear the oldest sale first)"],
            ["Overdue days", "today − the earliest unpaid due date (0 if not yet due)"],
            ["Sells per day", "units sold in the last 14 days ÷ 14"],
            ["Days left", "stock ÷ sells per day"],
            ["Reorder quantity", "⌈sells per day × (lead time + 3) − stock⌉, minimum 0"],
            ["Period change", "(this period − previous period) ÷ previous period, complete days only"],
          ] },
        ],
      },
      {
        id: "testing",
        title: "How it's tested",
        blocks: [
          { t: "p", text: "Over 110 unit tests cover the formulas, date maths across months and leap years, oldest-first payments, barcode handling, bill-line matching (including a real AI answer), the WhatsApp text, and the alert rules firing on the demo shop's history." },
        ],
      },
    ],
  },
  {
    slug: "security",
    group: "How it works",
    title: "Security & privacy",
    summary: "How shops are kept separate, and what is stored.",
    sections: [
      {
        id: "shop-isolation",
        title: "Shop isolation",
        blocks: [
          { t: "p", text: "Every table is protected by Postgres **row-level security**: you can only read and change rows of shops you own. Every stored procedure also checks shop ownership itself and that any customer belongs to the same shop." },
        ],
      },
      {
        id: "atomic-transactions",
        title: "Atomic transactions",
        blocks: [
          { t: "p", text: "Sales, undo, purchases, payments and stock adjustments run as single database transactions. Sales lock product rows; payments lock the customer row and refuse to exceed what is owed." },
        ],
      },
      {
        id: "ai-keys",
        title: "AI keys and limits",
        blocks: [
          { t: "ul", items: [
            "The AI key is a server secret. It is never in the website's code.",
            "Requests are validated (size, shape, numbers) before reaching the model; bill-scan answers are validated before reaching you.",
            "Daily limits per signed-in user, per demo visitor and in total protect against abuse.",
          ] },
        ],
      },
      {
        id: "what-is-stored",
        title: "What is stored",
        blocks: [
          { t: "ul", items: [
            "Your shop records in your Supabase project.",
            "For AI limits: who asked (user id, or a scrambled hash of a demo visitor's IP — never the IP itself), when, and the outcome.",
            "Questions to Tallyn AI and bill photos are **not** stored.",
          ] },
        ],
      },
    ],
  },
  {
    slug: "performance",
    group: "How it works",
    title: "Performance",
    summary: "What Tallyn does to stay fast on phones and slow connections.",
    sections: [
      {
        id: "loading",
        title: "Loading",
        blocks: [
          { t: "ul", items: [
            "Each screen loads on demand, so opening Checkout doesn't download Insights.",
            "The barcode reader for iPhone/desktop (about 460 KB) loads only when the camera opens and the browser has no built-in reader.",
            "Charts are lightweight SVG with no charting library.",
          ] },
        ],
      },
      {
        id: "bill-photos",
        title: "Bill photos",
        blocks: [{ t: "p", text: "Photos are shrunk in the browser to at most 1,600 px and re-saved as JPEG (typically 200–500 KB) before upload, so scanning works on mobile data." }],
      },
      {
        id: "counter-speed",
        title: "Counter speed",
        blocks: [
          { t: "ul", items: [
            "Rapid back-to-back scans are counted correctly, even faster than the screen redraws.",
            "The camera checks for barcodes about 8 times a second and ignores a barcode that is still in view.",
            "AI calls time out (up to 2 minutes on slow providers) and never block checkout.",
          ] },
        ],
      },
    ],
  },

  /* ================================ SELF-HOSTING ================================ */
  {
    slug: "self-hosting",
    group: "Self-hosting",
    title: "Setup & deployment",
    summary: "Run your own copy of Tallyn: database, AI functions and the web app.",
    sections: [
      {
        id: "requirements",
        title: "Requirements",
        blocks: [{ t: "ul", items: ["Node.js 20+", "A Supabase project", "An AI key: Google AI Studio (`AIza…`) or an OpenAI-compatible provider", "Optional: Deno, to type-check and test the Edge Functions"] }],
      },
      {
        id: "environment",
        title: "Environment variables",
        blocks: [
          { t: "code", lang: "bash", code: "# .env (browser — public by design)\nVITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<publishable-anon-key>" },
          { t: "warn", text: "Never put an AI key in a `VITE_` variable: Vite copies those into the public website code. AI keys go only in Supabase secrets." },
        ],
      },
      {
        id: "database",
        title: "Database",
        blocks: [{ t: "p", text: "In the Supabase SQL editor, run the files in `supabase/migrations/` in order, `001` to `007`." }],
      },
      {
        id: "edge-functions",
        title: "Edge Functions and secrets",
        blocks: [
          { t: "steps", items: [
            "Deploy `supabase/functions/bill-scan` (`index.ts`, `extract.ts`) and `supabase/functions/ai-gateway` (`index.ts`, `schema.ts`, `chat.ts`).",
            "Turn **Verify JWT off** for both — they check callers themselves so demo visitors can use them within limits.",
            "Set the secrets below.",
          ] },
          { t: "table", head: ["Secret", "Required", "Notes"], rows: [
            ["`GEMINI_API_KEY`", "Yes", "Google AI Studio key → Gemini directly; any other key → OpenAI-compatible endpoint"],
            ["`GEMINI_MODEL`", "No", "Default `gemini-3.7-flash`; e.g. `gemini-3.5-flash-lite` on electronhub's free tier"],
            ["`AI_BASE_URL`", "No", "OpenAI-compatible base URL (default electronhub)"],
            ["`AI_TIMEOUT_MS`", "No", "Default 100000"],
          ] },
        ],
      },
      {
        id: "run-and-deploy",
        title: "Run, test and deploy",
        blocks: [
          { t: "code", lang: "bash", code: "npm install\nnpm run dev          # http://localhost:3000\nnpm test             # unit tests\nnpm run build        # type-check + production build\ndeno test --allow-env supabase/functions/ai-gateway/chat_test.ts" },
          { t: "p", text: "Deploy the `dist/` folder to any static host. `vercel.json` already rewrites all routes to the app, so links like `/docs/udhaar` work." },
        ],
      },
    ],
  },

  /* ==================================== HELP ==================================== */
  {
    slug: "troubleshooting",
    group: "Help",
    title: "Troubleshooting & FAQ",
    summary: "Common problems and what to do.",
    sections: [
      {
        id: "camera",
        title: "The camera won't start",
        blocks: [{ t: "ul", items: [
          "**Permission blocked:** allow the camera for this site in your browser settings and try again.",
          "**Camera busy:** close other apps or tabs using the camera.",
          "**Not https:** the camera only works on a secure page (the live site is https).",
          "You can always type the barcode instead.",
        ] }],
      },
      {
        id: "not-in-stock",
        title: "A scan says \"isn't in your stock\"",
        blocks: [{ t: "p", text: "The barcode was read correctly but no product has that barcode. Add the barcode to the product in **Inventory** and scan again." }],
      },
      {
        id: "saved-on-device",
        title: "\"Saved on this device only\"",
        blocks: [{ t: "p", text: "The server couldn't be reached, so the change was kept in this browser. Keep working, but don't clear the browser's data until you're back online." }],
      },
      {
        id: "sale-refused",
        title: "\"Sale not recorded\"",
        blocks: [{ t: "p", text: "The server refused the sale and showed the reason (for example, not enough stock, or the customer belongs to another shop). Your cart is kept — fix the issue and record again." }],
      },
      {
        id: "ai-unavailable",
        title: "Tallyn AI or the bill scanner is unavailable",
        blocks: [{ t: "p", text: "Free AI tiers can be slow or busy. Tallyn AI falls back to answers from your shop data; the bill scanner offers **Enter this bill by hand**. Daily limits reset after 24 hours." }],
      },
      {
        id: "today-zero",
        title: "Why are today's numbers zero in the demo?",
        blocks: [{ t: "p", text: "The demo shop opens at 8:00 local time. Before then there are no sales yet today — that's correct." }],
      },
    ],
  },
];

export const DEFAULT_DOC = "overview";
export const findDoc = (slug: string | undefined) => DOC_PAGES.find((p) => p.slug === slug);
