// ============================================================
// Altersvorsorgerechner — Calculation Engine
// ============================================================
//
// This module contains all financial calculation logic for the
// German Altersvorsorgedepot (AVD) retirement calculator.
// All calculations are client-side; no backend is required.
// ============================================================

import type {
  CalculatorInput,
  CalculationResult,
  YearlyResult,
  WithdrawalYearResult,
  ComparisonResult,
  EarlyStartInput,
  EarlyStartResult,
  EarlyStartCheckpoints,
  Gender,
} from './types';

import {
  LIFE_EXPECTANCY,
  MAX_ANNUAL_SUBSIDY,
  SUBSIDY_FIRST_TIER_RATE,
  SUBSIDY_FIRST_TIER_LIMIT,
  SUBSIDY_SECOND_TIER_RATE,
  MIN_ANNUAL_CONTRIBUTION,
  MAX_PROMOTED_CONTRIBUTION,
  CAPITAL_GAINS_TAX_RATE,
  PARTIAL_EXEMPTION_RATE,
  ADVANCE_LUMP_SUM_RATE,
} from './types';

import { roundTo } from './utils';

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Validates a CalculatorInput and throws descriptive errors
 * for any out-of-range or nonsensical parameters.
 *
 * @param input - The raw calculator input to validate
 * @throws Error if any field is invalid
 */
function validateCalculatorInput(input: CalculatorInput): void {
  if (input.currentAge < 0 || input.currentAge > 100) {
    throw new Error(`currentAge must be between 0 and 100, got ${input.currentAge}`);
  }
  if (input.retirementAge < 60 || input.retirementAge > 75) {
    throw new Error(`retirementAge must be between 60 and 75, got ${input.retirementAge}`);
  }
  if (input.monthlySavings < 0) {
    throw new Error(`monthlySavings must be non-negative, got ${input.monthlySavings}`);
  }
  if (input.annualBonus < 0) {
    throw new Error(`annualBonus must be non-negative, got ${input.annualBonus}`);
  }
  if (input.expectedReturn < 0 || input.expectedReturn > 1) {
    throw new Error(`expectedReturn must be between 0 and 1, got ${input.expectedReturn}`);
  }
  if (input.marginalTaxRate < 0 || input.marginalTaxRate > 1) {
    throw new Error(`marginalTaxRate must be between 0 and 1, got ${input.marginalTaxRate}`);
  }
  if (input.retirementTaxRate < 0 || input.retirementTaxRate > 1) {
    throw new Error(`retirementTaxRate must be between 0 and 1, got ${input.retirementTaxRate}`);
  }
  if (input.startingCapital < 0) {
    throw new Error(`startingCapital must be non-negative, got ${input.startingCapital}`);
  }
  if (input.riesterBalance < 0) {
    throw new Error(`riesterBalance must be non-negative, got ${input.riesterBalance}`);
  }
}

/**
 * Validates an EarlyStartInput and throws descriptive errors.
 *
 * @param input - The early-start input to validate
 * @throws Error if any field is invalid
 */
function validateEarlyStartInput(input: EarlyStartInput): void {
  if (input.childAge < 0 || input.childAge > 18) {
    throw new Error(`childAge must be between 0 and 18, got ${input.childAge}`);
  }
  if (input.monthlySavings < 0) {
    throw new Error(`monthlySavings must be non-negative, got ${input.monthlySavings}`);
  }
  if (input.expectedReturn < 0 || input.expectedReturn > 1) {
    throw new Error(`expectedReturn must be between 0 and 1, got ${input.expectedReturn}`);
  }
  if (input.retirementAge < 60 || input.retirementAge > 75) {
    throw new Error(`retirementAge must be between 60 and 75, got ${input.retirementAge}`);
  }
}

/**
 * Returns the life expectancy in years for a given gender.
 *
 * @param gender - 'M' (male=87), 'F' (female=90), 'D' (diverse=88)
 * @returns Life expectancy in years
 */
function getLifeExpectancy(gender: Gender): number {
  return LIFE_EXPECTANCY[gender];
}

// ============================================================
// Subsidy Calculation (AVD Zulagenberechnung)
// ============================================================

/**
 * Calculates the annual Grundzulage for the Altersvorsorgedepot
 * based on the pAV-Reform progressive subsidy structure:
 *
 * - 50% Förderung on the first 360 € of annual contributions (max 180 €)
 * - 25% Förderung on the next 1,440 € of contributions (max 360 €)
 * - Maximum total Grundzulage: 540 €/year
 * - Minimum annual contribution to qualify: 120 €
 *
 * @param annualContribution - Total annual contribution (monthlySavings × 12 + annualBonus)
 * @returns Annual Grundzulage amount in EUR
 */
function calculateAnnualSubsidy(annualContribution: number): number {
  // Must contribute at least 120 €/year to receive any subsidy
  if (annualContribution < MIN_ANNUAL_CONTRIBUTION) {
    return 0;
  }

  // Cap contributions at the promoted limit for subsidy calculation
  const eligible = Math.min(annualContribution, MAX_PROMOTED_CONTRIBUTION);

  // First tier: 50% on first 360 € → max 180 €
  const firstTier = Math.min(eligible, SUBSIDY_FIRST_TIER_LIMIT);
  let subsidy = roundTo(firstTier * SUBSIDY_FIRST_TIER_RATE);

  // Second tier: 25% on remaining up to 1800 € → max 360 €
  if (eligible > SUBSIDY_FIRST_TIER_LIMIT) {
    const secondTier = eligible - SUBSIDY_FIRST_TIER_LIMIT;
    subsidy += roundTo(secondTier * SUBSIDY_SECOND_TIER_RATE);
  }

  // Cap at 540 €
  return Math.min(subsidy, MAX_ANNUAL_SUBSIDY);
}

/**
 * Calculates the net annual Steuerersparnis (tax refund) from the
 * Sonderausgabenabzug, applying the Günstigerprüfung.
 *
 * The Günstigerprüfung compares:
 * - Steuerersparnis from Sonderausgabenabzug: contributions × marginalTaxRate
 * - vs. the Grundzulage already received
 *
 * The taxpayer receives whichever is higher. The NET benefit is:
 *   max(0, Steuerersparnis - Grundzulage)
 *
 * This net amount represents the additional tax refund that can be
 * reinvested into the depot.
 *
 * @param annualContribution - Annual promoted contributions in EUR
 * @param grundzulage - Already-calculated Grundzulage for this year
 * @param marginalTaxRate - Current marginal tax rate as decimal
 * @returns Net additional Steuerersparnis in EUR
 */
function calculateNetSteuerersparnis(
  annualContribution: number,
  grundzulage: number,
  marginalTaxRate: number
): number {
  const eligible = Math.min(annualContribution, MAX_PROMOTED_CONTRIBUTION);
  // Sonderausgabenabzug: deduct full promoted contributions + received Zulage
  const sonderausgabenabzug = eligible + grundzulage;
  const steuerersparnis = roundTo(sonderausgabenabzug * marginalTaxRate);
  // Günstigerprüfung: net benefit is the excess over the Zulage
  return Math.max(0, roundTo(steuerersparnis - grundzulage));
}

// ============================================================
// 1. calculateAVD — Altersvorsorgedepot Calculation
// ============================================================

/**
 * Calculates the full Altersvorsorgedepot (AVD) projection including
 * a savings phase (Ansparphase) and a withdrawal phase (Auszahlungsphase).
 *
 * ### Savings Phase (Ansparphase)
 * For each year from currentAge to retirementAge-1:
 *   1. Annual contributions = monthlySavings × 12 + annualBonus
 *   2. Annual subsidies = Basis-Zulage + Zusatz-Zulage (capped at 540 €/yr)
 *   3. Capital growth formula:
 *        K_t = (K_{t-1} + B_t + Z_t) × (1 + r)
 *      where B_t = annual contributions, Z_t = annual subsidies, r = expectedReturn
 *   4. Year 0 seed capital = startingCapital + riesterBalance
 *
 * ### Withdrawal Phase (Auszahlungsphase)
 * From retirementAge to lifeExpectancy:
 *   1. Annual gross pension = remaining capital / remaining years
 *   2. Tax on promoted portion:
 *      - Promoted contributions up to MAX_PROMOTED_CONTRIBUTION (1800 €) + subsidies
 *        per year are taxed at retirementTaxRate in full
 *      - Non-promoted gains are taxed via Halbeinkünfteverfahren:
 *        50% × retirementTaxRate
 *   3. Capital continues to earn returns during withdrawal:
 *        K_p = K_{p-1} - grossPension + (K_{p-1} × expectedReturn)
 *
 * @param input - The complete set of calculator inputs
 * @returns Full CalculationResult including year-by-year data
 */
export function calculateAVD(input: CalculatorInput): CalculationResult {
  validateCalculatorInput(input);

  const {
    currentAge,
    retirementAge,
    gender,
    monthlySavings,
    annualBonus,
    expectedReturn,
    retirementTaxRate,
    startingCapital,
    riesterBalance,
  } = input;

  const lifeExpectancy = getLifeExpectancy(gender);
  const savingsYears = Math.max(retirementAge - currentAge, 0);
  const withdrawalDuration = Math.max(lifeExpectancy - retirementAge, 0);

  // ----------------------------------------------------------
  // SAVINGS PHASE
  // ----------------------------------------------------------

  const savingsPhase: YearlyResult[] = [];
  const currentYear = new Date().getFullYear();

  /** Seed capital includes starting capital and any transferred Riester balance */
  let capital = roundTo(startingCapital + riesterBalance);
  let cumulativeContributions = 0;
  let cumulativeSubsidies = 0;
  let cumulativeGains = 0;

  /**
   * Track the total "promoted" (gefördert) capital for tax calculation
   * during the withdrawal phase. Promoted = min(contributions, 1800) + subsidies per year.
   */
  let totalPromotedContributions = 0;
  let totalNonPromotedContributions = 0;

  for (let i = 0; i < savingsYears; i++) {
    const yearAge = currentAge + i + 1;
    const calendarYear = currentYear + i + 1;

    // Step 1: Annual contributions
    const yearContributions = roundTo(monthlySavings * 12 + annualBonus);

    // Step 2: Annual Grundzulage (progressive: 50% on first 360€, 25% on rest up to 1800€)
    const yearGrundzulage = calculateAnnualSubsidy(yearContributions);

    // Step 2b: Net Steuerersparnis via Günstigerprüfung
    // This is the additional tax refund beyond the Grundzulage, reinvested into the depot
    const yearSteuerersparnis = calculateNetSteuerersparnis(
      yearContributions,
      yearGrundzulage,
      input.marginalTaxRate
    );

    // Combined subsidies = Grundzulage + net Steuerersparnis
    const yearSubsidies = roundTo(yearGrundzulage + yearSteuerersparnis);

    // Step 3: Track promoted vs non-promoted contributions
    // The promoted portion is capped at MAX_PROMOTED_CONTRIBUTION per year
    const promotedThisYear = Math.min(yearContributions, MAX_PROMOTED_CONTRIBUTION);
    const nonPromotedThisYear = Math.max(yearContributions - MAX_PROMOTED_CONTRIBUTION, 0);
    totalPromotedContributions += promotedThisYear + yearGrundzulage;
    totalNonPromotedContributions += nonPromotedThisYear;

    // Step 4: Capital growth
    // K_t = (K_{t-1} + B_t + Z_t) × (1 + r)
    // Z_t includes both Grundzulage and reinvested Steuerersparnis
    const capitalBeforeGrowth = capital + yearContributions + yearSubsidies;
    const newCapital = roundTo(capitalBeforeGrowth * (1 + expectedReturn));
    const yearGains = roundTo(newCapital - capitalBeforeGrowth);

    capital = newCapital;
    cumulativeContributions = roundTo(cumulativeContributions + yearContributions);
    cumulativeSubsidies = roundTo(cumulativeSubsidies + yearSubsidies);
    cumulativeGains = roundTo(cumulativeGains + yearGains);

    savingsPhase.push({
      year: calendarYear,
      age: yearAge,
      capital: roundTo(capital),
      cumulativeContributions,
      cumulativeSubsidies,
      cumulativeGains,
      yearContributions,
      yearSubsidies,
      yearGains,
      yearTaxes: 0, // No taxes during AVD savings phase
    });
  }

  const totalCapital = roundTo(capital);
  const totalContributions = cumulativeContributions;
  const totalSubsidies = cumulativeSubsidies;
  const totalGains = cumulativeGains;

  // ----------------------------------------------------------
  // WITHDRAWAL PHASE
  // ----------------------------------------------------------

  const withdrawalPhase: WithdrawalYearResult[] = [];
  let withdrawalCapital = totalCapital;

  /**
   * Determine the "promoted fraction" of the total capital.
   * This is the share of capital that originated from promoted contributions
   * and subsidies, which will be taxed at the full retirementTaxRate.
   * The remaining (non-promoted) portion is taxed via Halbeinkünfteverfahren.
   *
   * promotedFraction = totalPromotedContributions / totalContributions (incl. subsidies)
   * Non-promoted fraction includes over-limit contributions and their gains.
   */
  const totalInflows = totalContributions + totalSubsidies + startingCapital + riesterBalance;
  const promotedFraction = totalInflows > 0
    ? Math.min(totalPromotedContributions / totalInflows, 1)
    : 1; // If no inflows, treat everything as promoted

  /** First-year gross pension for the summary (annuity from year 1) */
  let firstYearGrossPension = 0;
  let firstYearNetPension = 0;

  for (let i = 0; i < withdrawalDuration; i++) {
    const yearAge = retirementAge + i;
    const calendarYear = currentYear + savingsYears + i + 1;
    const remainingYears = withdrawalDuration - i;

    // Step 1: Annual gross pension = remaining capital / remaining years
    const grossPension = roundTo(withdrawalCapital / remainingYears);

    // Step 2: Tax computation
    // Promoted portion taxed at full retirementTaxRate
    const promotedPortion = roundTo(grossPension * promotedFraction);
    const nonPromotedPortion = roundTo(grossPension - promotedPortion);

    /**
     * Tax on promoted portion: full retirementTaxRate
     * Tax on non-promoted portion: Halbeinkünfteverfahren
     *   → only 50% of gains are taxed at retirementTaxRate
     *   For simplicity, the non-promoted portion's gain share is estimated
     *   as the overall gain ratio of the total capital.
     */
    const gainRatio = totalCapital > 0 ? totalGains / totalCapital : 0;
    const nonPromotedGainPortion = roundTo(nonPromotedPortion * gainRatio);
    const taxPromoted = roundTo(promotedPortion * retirementTaxRate);
    const taxNonPromoted = roundTo(nonPromotedGainPortion * 0.5 * retirementTaxRate);
    const totalTax = roundTo(taxPromoted + taxNonPromoted);

    const netPension = roundTo(grossPension - totalTax);

    if (i === 0) {
      firstYearGrossPension = grossPension;
      firstYearNetPension = netPension;
    }

    // Step 3: Capital continues to earn returns during withdrawal
    // K_p = K_{p-1} - grossPension + (K_{p-1} × expectedReturn)
    const investmentReturn = roundTo(withdrawalCapital * expectedReturn);
    withdrawalCapital = roundTo(withdrawalCapital - grossPension + investmentReturn);
    // Ensure capital does not go negative
    withdrawalCapital = Math.max(withdrawalCapital, 0);

    withdrawalPhase.push({
      year: calendarYear,
      age: yearAge,
      grossRetirement: grossPension,
      taxes: totalTax,
      netRetirement: netPension,
      remainingCapital: roundTo(withdrawalCapital),
    });
  }

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  /**
   * Total tax savings: In the AVD, contributions up to the promoted limit
   * reduce taxable income today (Sonderausgabenabzug). The tax savings
   * are calculated as the promoted contributions × current marginal tax rate.
   */
  const totalTaxSavings = roundTo(totalPromotedContributions * input.marginalTaxRate);

  return {
    savingsPhase,
    withdrawalPhase,
    totalCapital,
    monthlyGrossRetirement: roundTo(firstYearGrossPension / 12),
    monthlyNetRetirement: roundTo(firstYearNetPension / 12),
    totalSubsidies,
    totalTaxSavings,
    totalContributions,
    totalGains,
    lifeExpectancy,
    withdrawalDuration,
  };
}

// ============================================================
// 2. calculateNormalDepot — Normal (Ungefördert) Depot
// ============================================================

/**
 * Calculates a standard (non-subsidized) investment depot projection,
 * subject to German capital gains taxation rules.
 *
 * ### Savings Phase
 * For each year:
 *   1. Annual contributions = monthlySavings × 12 + annualBonus
 *   2. No subsidies (totalSubsidies = 0)
 *   3. Vorabpauschale:
 *      - Taxable base = 0.5% (ADVANCE_LUMP_SUM_RATE) × year-start capital
 *      - Tax = base × CAPITAL_GAINS_TAX_RATE × (1 - PARTIAL_EXEMPTION_RATE)
 *      - Effectively: 0.5% × capital × 26.375% × 70%
 *   4. Capital growth:
 *        K_t = (K_{t-1} + B_t) × (1 + r) - vorabpauschale_tax
 *
 * ### Withdrawal Phase
 * - Withdrawal over lifeExpectancy - retirementAge years
 * - FIFO (First-In-First-Out) principle:
 *   Each withdrawal is split into principal return and gain
 *   based on the overall gain ratio at the time
 * - Only gains are taxed, at CAPITAL_GAINS_TAX_RATE with
 *   PARTIAL_EXEMPTION_RATE (30% Teilfreistellung for equity ETFs)
 *
 * @param input - The complete set of calculator inputs
 * @returns Full CalculationResult with totalSubsidies=0 and totalTaxSavings=0
 */
export function calculateNormalDepot(input: CalculatorInput): CalculationResult {
  validateCalculatorInput(input);

  const {
    currentAge,
    retirementAge,
    gender,
    monthlySavings,
    annualBonus,
    expectedReturn,
    startingCapital,
    riesterBalance,
  } = input;

  const lifeExpectancy = getLifeExpectancy(gender);
  const savingsYears = Math.max(retirementAge - currentAge, 0);
  const withdrawalDuration = Math.max(lifeExpectancy - retirementAge, 0);

  // ----------------------------------------------------------
  // SAVINGS PHASE
  // ----------------------------------------------------------

  const savingsPhase: YearlyResult[] = [];
  const currentYear = new Date().getFullYear();

  /**
   * For a normal depot, starting capital includes both startingCapital
   * and riesterBalance (user may still have funds to invest).
   */
  let capital = roundTo(startingCapital + riesterBalance);
  let cumulativeContributions = 0;
  let cumulativeGains = 0;

  /**
   * Track total contributions for FIFO cost-basis calculation.
   * The cost basis is the total amount of money put in (contributions + starting capital).
   */
  let totalCostBasis = startingCapital + riesterBalance;

  /** Cumulative Vorabpauschale tax paid (reduces the cost basis at withdrawal) */
  let cumulativeVorabpauschale = 0;

  for (let i = 0; i < savingsYears; i++) {
    const yearAge = currentAge + i + 1;
    const calendarYear = currentYear + i + 1;

    // Capital at start of year (before contributions)
    const yearStartCapital = capital;

    // Step 1: Annual contributions (no subsidies in normal depot)
    const yearContributions = roundTo(monthlySavings * 12 + annualBonus);

    // Step 2: Vorabpauschale — annual advance flat-rate tax
    // Taxable base = ADVANCE_LUMP_SUM_RATE (0.5%) × year-start capital
    // Tax = base × CAPITAL_GAINS_TAX_RATE × (1 - PARTIAL_EXEMPTION_RATE)
    const vorabpauschaleBasis = roundTo(yearStartCapital * ADVANCE_LUMP_SUM_RATE);
    const taxableVorabpauschale = roundTo(vorabpauschaleBasis * (1 - PARTIAL_EXEMPTION_RATE));
    const vorabpauschaleT = roundTo(taxableVorabpauschale * CAPITAL_GAINS_TAX_RATE);

    cumulativeVorabpauschale = roundTo(cumulativeVorabpauschale + vorabpauschaleT);

    // Step 3: Capital growth after contributions and before tax deduction
    // K_t = (K_{t-1} + B_t) × (1 + r) - vorabpauschale_tax
    const capitalBeforeGrowth = capital + yearContributions;
    const capitalAfterGrowth = roundTo(capitalBeforeGrowth * (1 + expectedReturn));
    const yearGains = roundTo(capitalAfterGrowth - capitalBeforeGrowth - vorabpauschaleT);
    capital = roundTo(capitalAfterGrowth - vorabpauschaleT);

    totalCostBasis += yearContributions;
    cumulativeContributions = roundTo(cumulativeContributions + yearContributions);
    cumulativeGains = roundTo(cumulativeGains + yearGains);

    savingsPhase.push({
      year: calendarYear,
      age: yearAge,
      capital: roundTo(capital),
      cumulativeContributions,
      cumulativeSubsidies: 0,
      cumulativeGains,
      yearContributions,
      yearSubsidies: 0,
      yearGains,
      yearTaxes: vorabpauschaleT,
    });
  }

  const totalCapital = roundTo(capital);
  const totalContributions = cumulativeContributions;
  const totalGains = cumulativeGains;

  // ----------------------------------------------------------
  // WITHDRAWAL PHASE
  // ----------------------------------------------------------

  const withdrawalPhase: WithdrawalYearResult[] = [];
  let withdrawalCapital = totalCapital;

  /**
   * For FIFO taxation, we need to know the cost basis (total money invested)
   * relative to total capital to determine the gain fraction of each withdrawal.
   *
   * Vorabpauschale already paid effectively increases the cost basis
   * (since gains corresponding to that tax have already been taxed).
   */
  const adjustedCostBasis = roundTo(totalCostBasis + cumulativeVorabpauschale);

  let firstYearGrossPension = 0;
  let firstYearNetPension = 0;

  for (let i = 0; i < withdrawalDuration; i++) {
    const yearAge = retirementAge + i;
    const calendarYear = currentYear + savingsYears + i + 1;
    const remainingYears = withdrawalDuration - i;

    // Step 1: Annual gross pension (pre-tax withdrawal)
    const grossPension = roundTo(withdrawalCapital / remainingYears);

    // Step 2: FIFO-based taxation
    // Gain ratio = (capital - costBasis) / capital
    // Only the gain portion is taxed
    const currentGainRatio = withdrawalCapital > adjustedCostBasis
      ? (withdrawalCapital - adjustedCostBasis) / withdrawalCapital
      : 0;
    const gainInWithdrawal = roundTo(grossPension * currentGainRatio);

    /**
     * Tax on gains: CAPITAL_GAINS_TAX_RATE (26.375%) with
     * Teilfreistellung: only (1 - PARTIAL_EXEMPTION_RATE) = 70% of gains are taxable
     */
    const taxableGain = roundTo(gainInWithdrawal * (1 - PARTIAL_EXEMPTION_RATE));
    const tax = roundTo(taxableGain * CAPITAL_GAINS_TAX_RATE);
    const netPension = roundTo(grossPension - tax);

    if (i === 0) {
      firstYearGrossPension = grossPension;
      firstYearNetPension = netPension;
    }

    // Step 3: Capital continues to earn returns during withdrawal
    const investmentReturn = roundTo(withdrawalCapital * expectedReturn);
    withdrawalCapital = roundTo(withdrawalCapital - grossPension + investmentReturn);
    withdrawalCapital = Math.max(withdrawalCapital, 0);

    withdrawalPhase.push({
      year: calendarYear,
      age: yearAge,
      grossRetirement: grossPension,
      taxes: tax,
      netRetirement: netPension,
      remainingCapital: roundTo(withdrawalCapital),
    });
  }

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  return {
    savingsPhase,
    withdrawalPhase,
    totalCapital,
    monthlyGrossRetirement: roundTo(firstYearGrossPension / 12),
    monthlyNetRetirement: roundTo(firstYearNetPension / 12),
    totalSubsidies: 0,      // Normal depot receives no subsidies
    totalTaxSavings: 0,     // Normal depot has no tax deduction benefit
    totalContributions,
    totalGains,
    lifeExpectancy,
    withdrawalDuration,
  };
}

// ============================================================
// 3. compareAVDvsNormal — Side-by-Side Comparison
// ============================================================

/**
 * Runs both calculateAVD and calculateNormalDepot on the same input,
 * then computes meaningful comparison metrics.
 *
 * Comparison metrics:
 * - capitalDifference: absolute EUR difference in end capital (AVD - Normal)
 * - capitalDifferencePercent: percentage difference relative to Normal
 * - monthlyRetirementDifference: monthly net income difference
 * - monthlyRetirementDifferencePercent: percentage difference relative to Normal
 * - totalTaxSavingsDifference: difference in total tax savings
 * - avdAdvantage: boolean flag — true if AVD yields higher net retirement
 *
 * @param input - The shared calculator input for both calculations
 * @returns ComparisonResult containing both results and computed differences
 */
export function compareAVDvsNormal(input: CalculatorInput): ComparisonResult {
  // Run both calculations with identical inputs
  const avd = calculateAVD(input);
  const normalDepot = calculateNormalDepot(input);

  // Capital difference: AVD total capital minus Normal total capital
  const capitalDifference = roundTo(avd.totalCapital - normalDepot.totalCapital);

  // Percentage difference relative to the normal depot
  const capitalDifferencePercent = normalDepot.totalCapital > 0
    ? roundTo((capitalDifference / normalDepot.totalCapital) * 100)
    : 0;

  // Monthly net retirement income difference
  const monthlyRetirementDifference = roundTo(
    avd.monthlyNetRetirement - normalDepot.monthlyNetRetirement
  );

  const monthlyRetirementDifferencePercent = normalDepot.monthlyNetRetirement > 0
    ? roundTo((monthlyRetirementDifference / normalDepot.monthlyNetRetirement) * 100)
    : 0;

  // Tax savings difference (AVD provides tax deductions, Normal does not)
  const totalTaxSavingsDifference = roundTo(
    avd.totalTaxSavings - normalDepot.totalTaxSavings
  );

  // AVD is considered advantageous if it yields a higher monthly net retirement
  const avdAdvantage = avd.monthlyNetRetirement > normalDepot.monthlyNetRetirement;

  return {
    avd,
    normalDepot,
    comparison: {
      capitalDifference,
      capitalDifferencePercent,
      monthlyRetirementDifference,
      monthlyRetirementDifferencePercent,
      totalTaxSavingsDifference,
      avdAdvantage,
    },
  };
}

// ============================================================
// 4. calculateEarlyStartPension — Frühstart-Rente (Children)
// ============================================================

/**
 * Calculates the Frühstart-Rente projection for a child.
 *
 * This function:
 * 1. Converts the simplified EarlyStartInput into a full CalculatorInput
 *    by setting sensible defaults (e.g., no starting capital, no Riester,
 *    moderate tax rates, no annual bonus).
 * 2. Runs the full AVD calculation.
 * 3. Extracts capital values at key age checkpoints:
 *    - age 18 (adulthood)
 *    - age 30 (early career)
 *    - age 45 (mid career)
 *    - age 60 (pre-retirement)
 *    - retirementAge (start of withdrawal)
 *
 * @param input - The early-start input with child-specific parameters
 * @returns EarlyStartResult containing the full calculation and checkpoints
 */
export function calculateEarlyStartPension(input: EarlyStartInput): EarlyStartResult {
  validateEarlyStartInput(input);

  // Convert EarlyStartInput → CalculatorInput with sensible defaults
  const calculatorInput: CalculatorInput = {
    currentAge: input.childAge,
    retirementAge: input.retirementAge,
    gender: 'D',                    // Diverse as neutral default for children
    monthlySavings: input.monthlySavings,
    annualBonus: 0,                 // No annual bonus for early-start
    expectedReturn: input.expectedReturn,
    marginalTaxRate: 0.30,          // Default moderate tax rate
    retirementTaxRate: 0.20,        // Default retirement tax rate
    startingCapital: 0,             // Child starts with zero capital
    riesterBalance: 0,              // No Riester balance for child
  };

  // Run the full AVD calculation
  const calculation = calculateAVD(calculatorInput);

  // Extract checkpoints at specific ages
  const checkpoints = extractCheckpoints(
    calculation,
    input.childAge,
    input.retirementAge
  );

  return {
    calculation,
    checkpoints,
  };
}

/**
 * Extracts capital values at key age checkpoints from a completed
 * AVD calculation result.
 *
 * For each checkpoint age (18, 30, 45, 60, retirementAge):
 * - If the age falls within the savings phase, find the corresponding
 *   year entry and return its capital value.
 * - If the age is before the savings phase starts (childAge > checkpoint),
 *   return 0.
 * - If the age equals retirementAge, return the totalCapital.
 *
 * @param result - The completed CalculationResult
 * @param childAge - The starting age of the child
 * @param retirementAge - The target retirement age
 * @returns EarlyStartCheckpoints with capital at each milestone
 */
function extractCheckpoints(
  result: CalculationResult,
  childAge: number,
  retirementAge: number
): EarlyStartCheckpoints {
  /**
   * Helper: find the capital at a given age in the savings phase.
   * Returns 0 if the age is before savings started, or the last
   * known capital if the age is beyond the savings phase data.
   */
  function capitalAtAge(targetAge: number): number {
    if (targetAge <= childAge) return 0;
    if (targetAge >= retirementAge) return result.totalCapital;

    // Find the savings phase entry for this age
    const entry = result.savingsPhase.find((yr) => yr.age === targetAge);
    return entry ? roundTo(entry.capital) : 0;
  }

  return {
    age18: capitalAtAge(18),
    age30: capitalAtAge(30),
    age45: capitalAtAge(45),
    age60: capitalAtAge(60),
    retirementAge: capitalAtAge(retirementAge),
  };
}
