/**
 * Debeka CAI (Chance Invest) Calculator Engine
 * 
 * Product type: Fondsgebundene Rentenversicherung (unit-linked pension insurance)
 * Fund: Debeka Global Shares (internal fund per VAG)
 * 
 * Cost structure (based on published PIB/Effektivkosten data):
 * - Abschlusskosten: 2.5% of Beitragssumme, distributed over first 5 years (Zillmerung)
 * - Verwaltungskosten (fix): ~36€/year (Stückkosten)
 * - Verwaltungskosten (variable on contributions): ~3.5% of each contribution
 * - Verwaltungskosten (variable on fund balance): 0.3% p.a. on fund value
 * - Fund TER (built into NAV): ~0.3% p.a. (already deducted in net return)
 * 
 * Tax treatment (Halbeinkünfteverfahren / §20 Abs. 1 Nr. 6 EStG):
 * - If held ≥12 years AND payout after age 62:
 *   - 50% of gains are tax-free
 *   - Only 50% of gains taxed at personal income tax rate
 * - Contributions (principal) are always tax-free on payout
 */

// ─── Cost Constants ────────────────────────────────────────────────────────
/** Abschlusskosten: 2.5% of total contribution sum, spread over 5 years */
export const ABSCHLUSSKOSTEN_RATE = 0.025;
export const ABSCHLUSSKOSTEN_YEARS = 5;

/** Fixed annual admin cost (Stückkosten) */
export const FIXED_ADMIN_COST_ANNUAL = 36;

/** Variable admin cost on each contribution (Alpha-Kosten) */
export const CONTRIBUTION_COST_RATE = 0.035; // 3.5% of each contribution

/** Variable admin cost on fund balance (Gamma-Kosten), 0.3% p.a. */
export const BALANCE_COST_RATE = 0.003;

/** Internal fund TER, already deducted from gross return */
export const FUND_TER = 0.003; // 0.3% p.a.

/** Minimum age for tax-advantaged payout */
export const MIN_TAX_ADVANTAGE_AGE = 62;

/** Minimum holding period for Halbeinkünfteverfahren */
export const MIN_HOLDING_YEARS = 12;

/** Teilfreistellung for equity-based insurance policies */
export const TEILFREISTELLUNG_RATE = 0.15; // 15% of gains completely tax-free

/** Tax rate on capital gains (personal income tax approximation) */
export const PERSONAL_TAX_RATE = 0.30; // average personal income tax rate (approx.)

/** Retirement age */
export const RETIREMENT_AGE = 67;

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DebekaCAIInput {
  mode: 'monthly' | 'single'; // Monatlich or Einmalbeitrag
  birthYear: number;
  monthlyContribution: number; // only for mode === 'monthly'
  singleContribution: number;  // only for mode === 'single'
  returnRate: number; // expected annual net return in %, e.g. 7
  payoutAge: number; // when to cash out (default: 67)
}

export interface DebekaCAIYearData {
  year: number;
  age: number;
  contributionThisYear: number;
  totalContributions: number;
  abschlusskostenThisYear: number;
  adminCostThisYear: number;
  totalCostsThisYear: number;
  totalCostsCumulative: number;
  returnThisYear: number;
  totalReturns: number;
  fundValue: number;
  fundValueWithoutCosts: number; // for comparison
}

export interface DebekaCAIResult {
  yearData: DebekaCAIYearData[];
  totalContributions: number;
  totalCosts: number;
  totalReturns: number;
  finalFundValue: number;
  fundValueWithoutCosts: number;
  costImpact: number; // how much costs reduced the value
  // Tax calculation
  gains: number;
  taxableGains: number;
  tax: number;
  netPayout: number;
  isHalbeinkuenfte: boolean; // qualifies for 50% tax-free
  holdingYears: number;
  entryAge: number;
  payoutAge: number;
}

// ─── Calculation ───────────────────────────────────────────────────────────

export function calculateDebekaCAI(input: DebekaCAIInput): DebekaCAIResult {
  const currentYear = new Date().getFullYear();
  const entryAge = currentYear - input.birthYear;
  const yearsToRun = input.payoutAge - entryAge;
  
  if (yearsToRun <= 0) {
    // Return empty result for invalid inputs
    return {
      yearData: [],
      totalContributions: 0,
      totalCosts: 0,
      totalReturns: 0,
      finalFundValue: 0,
      fundValueWithoutCosts: 0,
      costImpact: 0,
      gains: 0,
      taxableGains: 0,
      tax: 0,
      netPayout: 0,
      isHalbeinkuenfte: false,
      holdingYears: yearsToRun,
      entryAge,
      payoutAge: input.payoutAge,
    };
  }

  const annualReturn = input.returnRate / 100;
  const netReturn = annualReturn - FUND_TER; // net of fund TER

  // Calculate total Beitragssumme for Abschlusskosten
  let totalBeitragssumme: number;
  if (input.mode === 'monthly') {
    totalBeitragssumme = input.monthlyContribution * 12 * yearsToRun;
  } else {
    totalBeitragssumme = input.singleContribution;
  }
  
  // Total Abschlusskosten spread over first 5 years
  const totalAbschlusskosten = totalBeitragssumme * ABSCHLUSSKOSTEN_RATE;
  const abschlusskostenPerYear = totalAbschlusskosten / Math.min(ABSCHLUSSKOSTEN_YEARS, yearsToRun);

  const yearData: DebekaCAIYearData[] = [];
  let fundValue = 0;
  let fundValueNoCosts = 0;
  let totalContributions = 0;
  let totalCostsCumulative = 0;
  let totalReturns = 0;

  for (let i = 0; i < yearsToRun; i++) {
    const age = entryAge + i + 1;
    const calendarYear = currentYear + i + 1;

    // 1. Contribution for this year
    let contributionThisYear: number;
    if (input.mode === 'monthly') {
      contributionThisYear = input.monthlyContribution * 12;
    } else {
      contributionThisYear = i === 0 ? input.singleContribution : 0;
    }

    // 2. Costs for this year
    // Abschlusskosten (first 5 years only)
    const abschlussThisYear = i < Math.min(ABSCHLUSSKOSTEN_YEARS, yearsToRun) ? abschlusskostenPerYear : 0;
    
    // Alpha-Kosten on contribution
    const alphaCost = contributionThisYear * CONTRIBUTION_COST_RATE;
    
    // Fixed admin cost
    const fixedAdmin = FIXED_ADMIN_COST_ANNUAL;
    
    // Net contribution after cost deductions (Abschluss + Alpha)
    const netContribution = contributionThisYear - abschlussThisYear - alphaCost;

    // Add net contribution to fund
    fundValue += Math.max(0, netContribution);
    
    // For no-cost comparison
    fundValueNoCosts += contributionThisYear;
    
    // Gamma-Kosten on balance (deducted before returns)
    const gammaCost = fundValue * BALANCE_COST_RATE;
    fundValue -= gammaCost;
    fundValue -= fixedAdmin;
    fundValue = Math.max(0, fundValue);

    // Total costs this year
    const totalCostsThisYear = abschlussThisYear + alphaCost + fixedAdmin + gammaCost;
    totalCostsCumulative += totalCostsThisYear;
    totalContributions += contributionThisYear;

    // 3. Investment returns (on remaining balance after costs)
    const returnThisYear = fundValue * netReturn;
    fundValue += returnThisYear;
    totalReturns += returnThisYear;

    // No-cost comparison
    const returnNoCosts = fundValueNoCosts * annualReturn;
    fundValueNoCosts += returnNoCosts;

    yearData.push({
      year: calendarYear,
      age,
      contributionThisYear,
      totalContributions,
      abschlusskostenThisYear: abschlussThisYear,
      adminCostThisYear: totalCostsThisYear - abschlussThisYear,
      totalCostsThisYear,
      totalCostsCumulative,
      returnThisYear,
      totalReturns,
      fundValue: Math.round(fundValue),
      fundValueWithoutCosts: Math.round(fundValueNoCosts),
    });
  }

  // Tax calculation
  const gains = Math.max(0, fundValue - totalContributions);
  const holdingYears = yearsToRun;
  const payoutAge = entryAge + yearsToRun;
  const isHalbeinkuenfte = holdingYears >= MIN_HOLDING_YEARS && payoutAge >= MIN_TAX_ADVANTAGE_AGE;
  
  let taxableGains: number;
  let effectiveTaxRate: number;
  if (isHalbeinkuenfte) {
    // Step 1: Teilfreistellung - 15% of gains are completely tax-free (equity fund)
    const afterTeilfreistellung = gains * (1 - TEILFREISTELLUNG_RATE); // 85% remain
    // Step 2: Halbeinkünfteverfahren - only 50% of remaining is taxed
    taxableGains = afterTeilfreistellung * 0.5; // = 42.5% of total gains
    effectiveTaxRate = PERSONAL_TAX_RATE;
  } else {
    // Full Abgeltungssteuer applies
    taxableGains = gains;
    effectiveTaxRate = 0.26375; // Abgeltungssteuer + Soli
  }

  const tax = taxableGains * effectiveTaxRate;
  const netPayout = fundValue - tax;

  return {
    yearData,
    totalContributions: Math.round(totalContributions),
    totalCosts: Math.round(totalCostsCumulative),
    totalReturns: Math.round(totalReturns),
    finalFundValue: Math.round(fundValue),
    fundValueWithoutCosts: Math.round(fundValueNoCosts),
    costImpact: Math.round(fundValueNoCosts - fundValue),
    gains: Math.round(gains),
    taxableGains: Math.round(taxableGains),
    tax: Math.round(tax),
    netPayout: Math.round(netPayout),
    isHalbeinkuenfte,
    holdingYears,
    entryAge,
    payoutAge,
  };
}
