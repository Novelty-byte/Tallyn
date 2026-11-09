# Tallyn (tallyn.xyz)

> **Zero-typing counter checkout, smart inventory, and voice clarity for neighbourhood retail.**

---

## 📌 Architectural Overview

Tallyn is an autonomous retail operating system engineered specifically for Pakistani Kiryana and neighbourhood grocery stores. It replaces slow counter pen-and-paper registers and rigid SaaS templates with an ultra-fast, 390px mobile-counter-first interface.

### ⚠️ The 5 Inviolable Rules
1. **Zero Hallucinated Numbers**: The AI model **never** computes profit, days left, stock quantities, or debt balances. All mathematics are strictly calculated deterministically in PostgreSQL stored procedures or unit-tested TypeScript functions.
2. **Atomic Data Mutations**: Stock decrements, credit balances, and purchases execute inside single database transactional RPCs (`record_sale`, `undo_sale`, `record_purchase`) with `FOR UPDATE` row locks.
3. **Multi-Tenant Shop Isolation**: Every query enforces `shop_id` scoping tied to authenticated JWT claims via Supabase Row-Level Security (RLS).
4. **Bilingual & RTL from Day 1**: All text routes through `react-i18next`. CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) mirror the entire layout naturally into Urdu RTL.
5. **Fail-Open Graceful Degradation**: If an AI provider drops or rate limits, the manual counter POS, barcoding, and tabular ledgers work without interruption.

---

## 🗂️ Clean Repository Architecture

```text
tallyn/
├── public/
│   ├── favicon.png                  # Specific "T" emblem favicon
│   ├── tallyn-full-logo.png         # Full official Tallyn logo
│   └── favicon-192.png              # Mobile PWA app icon
├── src/
│   ├── components/
│   │   ├── ai/                      # AI Assistants
│   │   │   ├── AskTallynDrawer.tsx  # Natural language store intelligence assistant
│   │   │   └── KiryanaRadioModal.tsx# Spoken daily morning executive audio briefing
│   │   ├── auth/                    # Authentication
│   │   │   └── AuthModal.tsx        # Sign-in, sign-up, magic link & 1-click fast login
│   │   ├── dashboard/               # Executive Pulse
│   │   │   └── DashboardView.tsx    # Live KPIs, 7-day sales chart & dynamic action cards
│   │   ├── history/                 # Transaction Auditing
│   │   │   └── SalesHistoryView.tsx # Historical sales ledger, itemized receipts & CSV export
│   │   ├── insights/                # Deterministic Forecasting
│   │   │   └── InsightsView.tsx     # Stock run-rate, reorders, Ramadan surge & utility anomaly
│   │   ├── inventory/               # Smart Inventory
│   │   │   └── InventoryView.tsx    # Searchable catalog, stock adjustments & combo bundler
│   │   ├── landing/                 # Product Landing Page
│   │   │   └── LandingView.tsx      # Showcase hero, big demo button, comparison matrix & signup
│   │   ├── layout/                  # Navigation & Framing
│   │   │   ├── Navbar.tsx           # Global header with logo, demo indicator & language toggle
│   │   │   └── Footer.tsx           # Comprehensive brand footer
│   │   ├── pos/                     # Counter POS
│   │   │   ├── CounterPOSView.tsx   # 390px counter phone POS, voice checkout & 10s undo
│   │   │   └── BarcodeScannerModal.tsx # Simulated laser scan line & commodity barcodes
│   │   ├── purchases/               # Supplier Restocks
│   │   │   └── PurchasesView.tsx    # Multimodal bill scanner & Mahngai watchdog
│   │   ├── settings/                # Multi-Shop Configuration
│   │   │   └── SettingsView.tsx     # Branch management, currency & inventory profile
│   │   └── udhaar/                  # Credit Ledger
│   │       └── UdhaarView.tsx       # Customer debt balances & 1-click WhatsApp reminders
│   ├── context/
│   │   └── AppContext.tsx           # Centralized reactive state & seeded demo shop
│   ├── lib/
│   │   ├── audio.ts                 # Web Speech API speech synthesis & register chimes
│   │   ├── deterministicMath.ts     # Pure TypeScript deterministic financial calculations
│   │   ├── supabase.ts              # Supabase cloud client
│   │   └── utils.ts                 # Formatting & class merge helpers
│   ├── types/
│   │   └── index.ts                 # Strict TypeScript domain models
│   ├── App.tsx                      # Main application view router
│   ├── i18n.ts                      # Bilingual Urdu/English translation engine
│   ├── index.css                    # Tailwind CSS v4 & Hallmark design tokens
│   └── main.tsx                     # Application entry point
├── supabase/
│   └── migrations/                  # PostgreSQL DDL & Stored Procedures
│       ├── 001_baseline_schema.sql  # 12 core multi-tenant tables
│       ├── 002_procedures.sql       # Atomic RPCs with FOR UPDATE locks
│       └── 003_rls.sql              # Row-Level Security policies per shop_id
├── index.html                       # HTML shell with Google Fonts & favicon
├── package.json
└── vite.config.ts
```

---

## 🚀 Running Locally

### Prerequisites
* Node.js v18+ installed

### Steps

```powershell
# 1. Navigate to the repository folder
cd C:\agy\icehacks\tallyn

# 2. Start the Vite development server
npm run dev
```

Open your browser at **http://localhost:3000** (or port indicated in the terminal).

### What to Test:
1. **Centralized 1-Click Seeded Demo Launch**:
   * On the landing page, click the prominent emerald **"Launch Live Demo Store (Al-Madina Kiryana)"** button.
   * Instantly loads 60 authentic Pakistani FMCG products in PKR, 8 debtor profiles with overdue histories, sales, expenses, wholesale benchmark rates, and brings up the live store dashboard with a top banner indicating demo mode.
   * Click **"Exit Demo Mode"** in the top banner anytime to return to the clean public landing page.
2. **Customer Registration & Auth**:
   * On the landing page or via "Sign In" in the navbar, new store owners can sign up via Email/Password, Google Sign-In, or Social accounts.
3. **Audio Voice POS ("Say-It")**:
   * On the POS page or landing page interactive phone demo, click **"Speak & Simulate Urdu POS"**.
   * Listen to the browser actually **speak aloud** *"دو چائے اور ایک گھی ادھار آصف بھائی"* in natural Urdu speech synthesis, and see the cart automatically populate with Tapal Tea, Dalda Oil, and assign credit to Asif Bhai.
4. **Barcode Laser Scanner**:
   * In Counter POS, click **"Scan Barcode"** to trigger the animated viewfinder with dual-tone audio beeps and 1-tap commodity test barcodes (Tapal Tea, Dalda Oil, Rooh Afza).
5. **Atomic Sale & 10-Second Undo**:
   * Tap any product tile to add to cart, click **"Record Sale"**, and hear the cash register chime.
   * Watch the **10-Second Undo Sale Banner** count down and click it to restore stock instantly.
6. **Smart Insights & Forecasting**:
   * Explore the **Smart Insights** tab to see deterministic stock run-rate formulas ($\text{days\_left} = \frac{\text{quantity}}{\text{avg\_daily\_units\_sold\_14d}}$), the +280% Ramadan surge forecaster, and the commercial electricity spike anomaly alert.
7. **Purchases, Paper Bill OCR & Mahngai Watchdog**:
   * Explore **Purchases & Scanner** to test the multimodal paper bill vision OCR simulation and wholesale inflation comparison against benchmark prices.
8. **Kiryana Radio**:
   * Click **"Kiryana Radio"** in the top navigation bar and tap **"Play Audio Briefing"** to hear a spoken Urdu executive summary of today's sales and urgent reorders.
9. **Bilingual RTL & English**:
   * Toggle between **English** and **اردو** to watch the entire UI flip into native RTL (`dir="rtl"`) with authentic typography and mirrored layouts.
