/**
 * Tallyn Autonomous Retail Advisor - Google Gemini API Integration
 * Provides intelligent, unscripted Kiryana retail analysis and recommendations.
 */

const GEMINI_API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  import.meta.env.GEMINI_API_KEY || 
  "AQ.Ab8RN6L2wkFEmwn8hWXG4IfE9S8kKUKPPpWQ9zJH57rdXCisaA";

const PRIMARY_MODEL = "gemini-3.7-flash";
const FALLBACK_MODEL = "gemini-3.8-flash";

export interface StoreContextData {
  shopName: string;
  shopCity: string;
  shopAddress: string;
  totalProducts: number;
  lowStockItems: { name: string; stock: number; unit: string; wholesalePrice: number }[];
  topDebtors: { name: string; balance: number; phone: string }[];
  totalUdhaar: number;
  todaySalesCount: number;
  todayRevenue: number;
  recentSalesTotal: number;
}

export async function askGeminiStoreAdvisor(
  userQuery: string,
  storeContext: StoreContextData,
  conversationHistory: { role: "user" | "model"; text: string }[] = []
): Promise<string> {
  const systemPrompt = `You are "Tallyn AI", an expert retail business advisor and financial consultant built specifically for Pakistani Kiryana (grocery/neighbourhood) merchants and small store owners.
You are running live inside the merchant's operating system.

Current Active Store Information:
- Store Name: ${storeContext.shopName}
- City / Market: ${storeContext.shopCity} (${storeContext.shopAddress})
- Total Product SKUs: ${storeContext.totalProducts}
- Today's Revenue: Rs ${storeContext.todayRevenue.toLocaleString()} (${storeContext.todaySalesCount} orders)
- Total Outstanding Udhaar (Credit to customers): Rs ${storeContext.totalUdhaar.toLocaleString()}
- Low Stock Critical Items: ${
    storeContext.lowStockItems.length > 0 
      ? storeContext.lowStockItems.map(i => `${i.name} (only ${i.stock} ${i.unit} left, wholesale ~Rs ${i.wholesalePrice})`).join(", ")
      : "None, healthy levels"
  }
- Top Customers with Udhaar: ${
    storeContext.topDebtors.length > 0
      ? storeContext.topDebtors.map(d => `${d.name}: Rs ${d.balance.toLocaleString()}`).join(", ")
      : "None"
  }

Advisor Behavior Guidelines:
1. Speak warmly and practically like a seasoned Pakistani retail mentor (Munshi / Business Consultant).
2. You can understand and respond in English, Urdu, or Roman Urdu depending on what the user types.
3. Be proactive: if the user asks generic questions, reference their ACTUAL numbers (their low stock items, their udhaar outstanding, their specific city market).
4. For inventory replenishment, suggest wholesale purchasing strategies (e.g. buying from local wholesale mandis like Akbari Mandi Lahore, Grain Market Islamabad, Ganj Mandi Rawalpindi, or Jodia Bazar Karachi).
5. For Udhaar recovery, suggest polite cultural methods (friendly WhatsApp reminders, credit caps, instalment options).
6. Keep replies concise, actionable, bulleted, and tailored to Pakistani retail reality (Rs / PKR, mounds, cartons, crates).`;

  const contents = [
    {
      role: "user",
      parts: [{ text: systemPrompt }]
    },
    {
      role: "model",
      parts: [{ text: `Assalam-o-Alaikum! Main Tallyn AI hoon, aapka digital retail advisor. Main ${storeContext.shopName} (${storeContext.shopCity}) ke tamam metrics, inventory, aur udhaar khata live monitor kar raha hoon. Aap kis cheez ke baray mein mashwara lena chahte hain?` }]
    },
    ...conversationHistory.slice(-4).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    })),
    {
      role: "user",
      parts: [{ text: userQuery }]
    }
  ];

  try {
    const response = await callGeminiModel(PRIMARY_MODEL, contents);
    return response;
  } catch (err) {
    console.warn(`Primary Gemini model (${PRIMARY_MODEL}) failed, trying fallback (${FALLBACK_MODEL})...`, err);
    try {
      const fallbackResponse = await callGeminiModel(FALLBACK_MODEL, contents);
      return fallbackResponse;
    } catch (fallbackErr) {
      console.error("Gemini API call failed:", fallbackErr);
      return getSmartLocalAdvice(userQuery, storeContext);
    }
  }
}

async function callGeminiModel(model: string, contents: any[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API Error ${res.status}: ${errorText}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}

/**
 * Intelligent local fallback with real store data if network is offline
 */
function getSmartLocalAdvice(query: string, ctx: StoreContextData): string {
  const q = query.toLowerCase();
  if (q.includes("stock") || q.includes("inventory") || q.includes("maal")) {
    if (ctx.lowStockItems.length > 0) {
      const items = ctx.lowStockItems.map(i => `• **${i.name}**: Remaining ${i.stock} ${i.unit}`).join("\n");
      return `### Stock Alert for ${ctx.shopName} (${ctx.shopCity})\nAapke store mein yeh items dangerous level par hain:\n${items}\n\n**Mashwara:** ${ctx.shopCity} ki wholesale mandi se foran order dein taakay customer wapis na jaye.`;
    }
    return `### Stock Status: Good!\n${ctx.shopName} ke tamam ${ctx.totalProducts} items healthy levels par hain.`;
  }

  if (q.includes("udhaar") || q.includes("khat") || q.includes("debt") || q.includes("credit")) {
    const debtors = ctx.topDebtors.map(d => `• **${d.name}**: Rs ${d.balance.toLocaleString()} (${d.phone})`).join("\n");
    return `### Udhaar Summary for ${ctx.shopName}\nTotal Udhaar: **Rs ${ctx.totalUdhaar.toLocaleString()}**\n\nTop Debtors:\n${debtors}\n\n**Tallyn Tip:** In customers ko automated WhatsApp reminder bhejein taakay cash flow behtar ho sakay.`;
  }

  return `### Live Store Summary: ${ctx.shopName} (${ctx.shopCity})\n• Aaj ki Sale: **Rs ${ctx.todayRevenue.toLocaleString()}** (${ctx.todaySalesCount} transactions)\n• Total Udhaar Khata: **Rs ${ctx.totalUdhaar.toLocaleString()}**\n• Total Products: **${ctx.totalProducts} items**\n\nAap inventory, udhaar recovery, ya wholesale pricing ke baray mein mazeed sawaal pooch sakte hain!`;
}
