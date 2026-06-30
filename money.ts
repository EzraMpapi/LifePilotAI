// Tanzania lending knowledge base + budgeting helpers.
// Rates are typical/published figures (Q2 2026) and are indicative, not quotes.

export type Lender = {
  name: string;
  type: "Bank" | "SACCO" | "Microfinance";
  ratePa: string; // typical annual rate
  bestFor: string;
};

export const BOT_CENTRAL_RATE = 5.75; // %
export const AVG_COMMERCIAL_LENDING = 15.1; // %

export const TZ_LENDERS: Lender[] = [
  { name: "CRDB Bank", type: "Bank", ratePa: "from 16% p.a. (personal); Jijenge home 17%", bestFor: "Salaried personal loans, mortgages up to 20yr" },
  { name: "NMB Bank", type: "Bank", ratePa: "~15–18% p.a.", bestFor: "Salary advances & personal loans, wide branch network" },
  { name: "NBC Bank", type: "Bank", ratePa: "~15–18% p.a.", bestFor: "Personal & salaried-worker loans" },
  { name: "Bank of India (TZ)", type: "Bank", ratePa: "BPLR ~14.5% p.a.", bestFor: "Lower-rate personal/business loans for eligible clients" },
  { name: "Local SACCO (VICOBA/SACCOS)", type: "SACCO", ratePa: "~12–20% p.a. (member-based)", bestFor: "Small earners; competitive vs banks, community-based, flexible" },
  { name: "Microfinance (e.g. BRAC, FINCA)", type: "Microfinance", ratePa: "24%+ APR (up to ~5%/month)", bestFor: "Very small/short-term needs, last resort — expensive" },
];

// Pick suitable lenders based on monthly income (in user's currency, assume TZS-like scale awareness via relative buckets is impractical; use generic guidance).
export function recommendLenders(monthlyIncome: number): { tier: string; picks: Lender[]; guidance: string } {
  if (monthlyIncome <= 0) {
    return {
      tier: "Unknown income",
      picks: [TZ_LENDERS[4]],
      guidance: "Add your monthly income in Settings so I can recommend the best lender for you.",
    };
  }
  // Buckets are heuristic; works for both TZS (hundreds of thousands+) and other currencies (relative).
  if (monthlyIncome < 500_000) {
    return {
      tier: "Low income",
      picks: [TZ_LENDERS[4], TZ_LENDERS[1]],
      guidance: "Prefer a SACCO/VICOBA — lower barriers and friendlier terms than banks. Avoid high-APR microfinance unless urgent. Borrow only for income-generating needs.",
    };
  }
  if (monthlyIncome < 2_000_000) {
    return {
      tier: "Middle income",
      picks: [TZ_LENDERS[3], TZ_LENDERS[1], TZ_LENDERS[4]],
      guidance: "You likely qualify for bank salary loans (NMB/NBC) — compare with Bank of India's BPLR ~14.5% and your SACCO. Negotiate fees; keep repayments under 35% of income.",
    };
  }
  return {
    tier: "Higher income",
    picks: [TZ_LENDERS[0], TZ_LENDERS[3], TZ_LENDERS[2]],
    guidance: "You can access the best bank rates and larger facilities (CRDB personal/Jijenge home, Bank of India BPLR). Consider asset/mortgage finance over consumer loans.",
  };
}

// Business ideas by income level (Tanzania context).
export function businessIdeas(monthlyIncome: number): string[] {
  if (monthlyIncome < 500_000) {
    return [
      "Mobile money agent (M-Pesa / Tigo Pesa / Airtel Money)",
      "Food vending / mama lishe stall near busy areas",
      "Reselling clothes (mitumba) or phone accessories",
      "Poultry (kuku) — small batch broilers/layers",
    ];
  }
  if (monthlyIncome < 2_000_000) {
    return [
      "Small retail duka (groceries / general shop)",
      "Boda boda or bajaji transport unit (managed rider)",
      "Beauty salon / barbershop",
      "Horticulture / vegetable farming for local markets",
    ];
  }
  return [
    "Hardware or building-materials supply",
    "Mini-supermarket or wholesale distribution",
    "Real estate rental units / guest house",
    "Transport fleet or agro-processing (maize/rice milling)",
  ];
}

// 70/20/10 budgeting plan.
export function buildPlan(
  monthlyIncome: number,
  spent: number,
  saved: number,
  invested: number,
  pct: { expense: number; savings: number; invest: number }
) {
  const expBudget = (monthlyIncome * pct.expense) / 100;
  const savBudget = (monthlyIncome * pct.savings) / 100;
  const invBudget = (monthlyIncome * pct.invest) / 100;
  return {
    monthlyIncome,
    buckets: [
      { key: "expenses", label: "Needs & Wants", pct: pct.expense, target: expBudget, actual: spent, over: spent > expBudget },
      { key: "savings", label: "Savings", pct: pct.savings, target: savBudget, actual: saved, over: false },
      { key: "invest", label: "Investment", pct: pct.invest, target: invBudget, actual: invested, over: false },
    ],
    overspending: spent > expBudget,
    expenseOverBy: Math.max(0, spent - expBudget),
  };
}
