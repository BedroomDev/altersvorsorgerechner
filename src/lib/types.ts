// ============================================================
// Altersvorsorgerechner — TypeScript Type Definitions
// ============================================================

/** Gender options for life expectancy calculation */
export type Gender = 'M' | 'F' | 'D';

/** Calculator type for routing and form configuration */
export type CalculatorType = 'avd' | 'comparison' | 'earlystart';

// ============================================================
// Input Types
// ============================================================

/** Input parameters for the AVD (Altersvorsorgedepot) calculator */
export interface CalculatorInput {
  /** Aktuelles Alter (18-80) */
  currentAge: number;
  /** Renteneintrittsalter (60-75) */
  retirementAge: number;
  /** Geschlecht for Lebenserwartung */
  gender: Gender;
  /** Monatliche Sparrate in EUR (10-570) */
  monthlySavings: number;
  /** Jährliche Zusatzanlage in EUR (0+) */
  annualBonus: number;
  /** Erwartete Rendite p.a. as decimal (e.g. 0.075 for 7.5%) */
  expectedReturn: number;
  /** Grenzsteuersatz heute as decimal (e.g. 0.30 for 30%) */
  marginalTaxRate: number;
  /** Grenzsteuersatz Rente as decimal (e.g. 0.20 for 20%) */
  retirementTaxRate: number;
  /** Startvermögen in EUR (0+) */
  startingCapital: number;
  /** Riester-Guthaben zum Übertrag in EUR (0+) */
  riesterBalance: number;
}

/** Input parameters for the Frühstart-Rente (children) calculator */
export interface EarlyStartInput {
  /** Alter des Kindes (0-18) */
  childAge: number;
  /** Monatliche Sparrate in EUR (10-570) */
  monthlySavings: number;
  /** Erwartete Rendite p.a. as decimal */
  expectedReturn: number;
  /** Renteneintrittsalter (60-75) */
  retirementAge: number;
}

// ============================================================
// Result Types
// ============================================================

/** Per-year result during the savings phase (Ansparphase) */
export interface YearlyResult {
  /** Calendar year */
  year: number;
  /** Age of the person at end of year */
  age: number;
  /** Total capital at end of year */
  capital: number;
  /** Total cumulative contributions up to this year */
  cumulativeContributions: number;
  /** Total cumulative subsidies up to this year */
  cumulativeSubsidies: number;
  /** Total cumulative gains up to this year */
  cumulativeGains: number;
  /** Contributions this year */
  yearContributions: number;
  /** Subsidies this year */
  yearSubsidies: number;
  /** Gains this year */
  yearGains: number;
  /** Taxes paid this year (0 for AVD in savings phase) */
  yearTaxes: number;
}

/** Per-year result during the withdrawal phase (Auszahlungsphase) */
export interface WithdrawalYearResult {
  /** Calendar year */
  year: number;
  /** Age of the person */
  age: number;
  /** Gross annual pension */
  grossRetirement: number;
  /** Taxes paid */
  taxes: number;
  /** Net annual pension (after taxes) */
  netRetirement: number;
  /** Remaining capital at end of year */
  remainingCapital: number;
}

/** Complete result from a calculator run */
export interface CalculationResult {
  /** Year-by-year savings phase data */
  savingsPhase: YearlyResult[];
  /** Year-by-year withdrawal phase data */
  withdrawalPhase: WithdrawalYearResult[];
  /** Total capital at the start of retirement */
  totalCapital: number;
  /** Monthly gross retirement income */
  monthlyGrossRetirement: number;
  /** Monthly net retirement income (after taxes) */
  monthlyNetRetirement: number;
  /** Total subsidies received over savings phase */
  totalSubsidies: number;
  /** Total tax savings compared to normal depot (only for AVD) */
  totalTaxSavings: number;
  /** Total contributions made */
  totalContributions: number;
  /** Total gains earned */
  totalGains: number;
  /** Life expectancy used in calculation */
  lifeExpectancy: number;
  /** Withdrawal duration in years */
  withdrawalDuration: number;
}

/** Comparison result between AVD and Normal Depot */
export interface ComparisonResult {
  /** AVD calculation result */
  avd: CalculationResult;
  /** Normal depot calculation result */
  normalDepot: CalculationResult;
  /** Comparison metrics */
  comparison: {
    /** Absolute capital difference (AVD - Normal) */
    capitalDifference: number;
    /** Relative capital difference in percent */
    capitalDifferencePercent: number;
    /** Monthly retirement income difference */
    monthlyRetirementDifference: number;
    /** Monthly retirement income difference in percent */
    monthlyRetirementDifferencePercent: number;
    /** Total tax savings difference */
    totalTaxSavingsDifference: number;
    /** Whether AVD is advantageous */
    avdAdvantage: boolean;
  };
}

/** Checkpoint data for the Frühstart-Rente calculator */
export interface EarlyStartCheckpoints {
  age18: number;
  age30: number;
  age45: number;
  age60: number;
  retirementAge: number;
}

/** Complete result for the Frühstart-Rente calculator */
export interface EarlyStartResult {
  /** Full calculation result */
  calculation: CalculationResult;
  /** Capital values at key checkpoints */
  checkpoints: EarlyStartCheckpoints;
}

// ============================================================
// Preset Scenarios
// ============================================================

/** A preset scenario for quick calculator setup */
export interface PresetScenario {
  name: string;
  description: string;
  input: Partial<CalculatorInput>;
}

/** Predefined scenarios: Konservativ, Moderat, Aggressiv */
export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    name: 'Konservativ',
    description: 'Niedrigere Rendite, geringeres Risiko',
    input: {
      monthlySavings: 100,
      annualBonus: 0,
      expectedReturn: 0.05,
      marginalTaxRate: 0.30,
      retirementTaxRate: 0.20,
    },
  },
  {
    name: 'Moderat',
    description: 'Ausgewogenes Risiko-Rendite-Verhältnis',
    input: {
      monthlySavings: 200,
      annualBonus: 0,
      expectedReturn: 0.075,
      marginalTaxRate: 0.30,
      retirementTaxRate: 0.20,
    },
  },
  {
    name: 'Aggressiv',
    description: 'Höhere Rendite, höheres Risiko',
    input: {
      monthlySavings: 500,
      annualBonus: 0,
      expectedReturn: 0.10,
      marginalTaxRate: 0.35,
      retirementTaxRate: 0.25,
    },
  },
];

// ============================================================
// Constants
// ============================================================

/** Life expectancy lookup by gender (Statistisches Bundesamt) */
export const LIFE_EXPECTANCY: Record<Gender, number> = {
  M: 87,
  F: 90,
  D: 88,
};

/** Maximum annual subsidy / Grundzulage (Maximale Förderung) */
export const MAX_ANNUAL_SUBSIDY = 540;

/** First tier: 50% subsidy rate on the first FIRST_TIER_LIMIT € of annual contributions */
export const SUBSIDY_FIRST_TIER_RATE = 0.50;

/** First tier contribution limit (50% Förderung) */
export const SUBSIDY_FIRST_TIER_LIMIT = 360;

/** Second tier: 25% subsidy rate on contributions from FIRST_TIER_LIMIT to MAX_PROMOTED_CONTRIBUTION */
export const SUBSIDY_SECOND_TIER_RATE = 0.25;

/** Minimum annual contribution to receive any subsidy */
export const MIN_ANNUAL_CONTRIBUTION = 120;

/** Maximum monthly savings (Fördergrenze) */
export const MAX_MONTHLY_SAVINGS = 570;

/** Maximum promoted annual contribution */
export const MAX_PROMOTED_CONTRIBUTION = 1800;

/** Abgeltungsteuer rate (inkl. Solidaritätszuschlag) */
export const CAPITAL_GAINS_TAX_RATE = 0.26375;

/** Teilfreistellung for equity ETFs */
export const PARTIAL_EXEMPTION_RATE = 0.30;

/** Vorabpauschale rate */
export const ADVANCE_LUMP_SUM_RATE = 0.005;

// ============================================================
// Default Input Values
// ============================================================

/** Default values for AVD calculator */
export const DEFAULT_AVD_INPUT: CalculatorInput = {
  currentAge: 35,
  retirementAge: 67,
  gender: 'M',
  monthlySavings: 150,
  annualBonus: 0,
  expectedReturn: 0.075,
  marginalTaxRate: 0.30,
  retirementTaxRate: 0.20,
  startingCapital: 0,
  riesterBalance: 0,
};

/** Default values for Early Start calculator */
export const DEFAULT_EARLY_START_INPUT: EarlyStartInput = {
  childAge: 0,
  monthlySavings: 100,
  expectedReturn: 0.075,
  retirementAge: 67,
};

// ============================================================
// Chart Data Types
// ============================================================

/** Data point for the stacked area chart */
export interface ChartDataPoint {
  /** Label for X axis (year or age) */
  label: string;
  /** Calendar year */
  year: number;
  /** Age */
  age: number;
  /** Cumulative contributions */
  beitraege: number;
  /** Cumulative subsidies */
  zulagen: number;
  /** Cumulative gains */
  gewinne: number;
  /** Total capital */
  gesamt: number;
  /** Phase indicator */
  phase: 'savings' | 'withdrawal';
}

/** Data point for the comparison chart */
export interface ComparisonChartDataPoint {
  label: string;
  year: number;
  age: number;
  avdCapital: number;
  normalCapital: number;
}
