import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, HelpCircle, Minus, Plus } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { calculateAVD, calculateNormalDepot } from '@/lib/calculations'
import type { CalculatorInput, Gender } from '@/lib/types'
import {

  LIFE_EXPECTANCY,
  MAX_PROMOTED_CONTRIBUTION,
  MAX_ANNUAL_SUBSIDY,
  SUBSIDY_FIRST_TIER_RATE,
  SUBSIDY_FIRST_TIER_LIMIT,
  SUBSIDY_SECOND_TIER_RATE,
  MIN_ANNUAL_CONTRIBUTION,
} from '@/lib/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================================
// Constants
// ============================================================

const CONTRIBUTION_OPTIONS = [
  { value: 10, label: '10 €', sublabel: 'Mindestbeitrag' },
  { value: 30, label: '30 €', sublabel: 'Hohe Förderquote' },
  { value: 150, label: '150 €', sublabel: 'Fördergrenze' },
  { value: 570, label: '570 €', sublabel: 'Maximum' },
]

const INCOME_BRACKETS = [
  { rate: 0.21, label: 'Bis 17.000 €', sublabel: '~21 % Grenzsteuersatz' },
  { rate: 0.30, label: '17.000 - 37.000 €', sublabel: '~30 % Grenzsteuersatz' },
  { rate: 0.37, label: '37.000 - 57.000 €', sublabel: '~37 % Grenzsteuersatz' },
  { rate: 0.42, label: 'Über 57.000 €', sublabel: '~42 % Grenzsteuersatz' },
]

const RETURN_OPTIONS = [6, 7.5, 9]

const CHART_COLORS = {
  beitraege: '#4a5568',  // dark grey like Scalable
  zulagen: '#06c4aa',    // teal/brand
  gewinne: '#1a365d',    // dark blue
}

// ============================================================
// Helper: Calculate Förderung for preview bar chart
// ============================================================

function calculateFoerderung(monthlyContrib: number, taxRate: number) {
  const annual = monthlyContrib * 12
  if (annual < MIN_ANNUAL_CONTRIBUTION) {
    return { grundzulage: 0, netSteuerersparnis: 0, total: 0, withFoerderung: annual, percent: 0 }
  }
  const eligible = Math.min(annual, MAX_PROMOTED_CONTRIBUTION)
  const firstTier = Math.min(eligible, SUBSIDY_FIRST_TIER_LIMIT)
  let grundzulage = firstTier * SUBSIDY_FIRST_TIER_RATE
  if (eligible > SUBSIDY_FIRST_TIER_LIMIT) {
    grundzulage += (eligible - SUBSIDY_FIRST_TIER_LIMIT) * SUBSIDY_SECOND_TIER_RATE
  }
  grundzulage = Math.min(grundzulage, MAX_ANNUAL_SUBSIDY)

  const sonderausgabenabzug = eligible + grundzulage
  const steuerersparnis = sonderausgabenabzug * taxRate
  const netSteuerersparnis = Math.max(0, steuerersparnis - grundzulage)
  const total = Math.round(grundzulage + netSteuerersparnis)
  const withFoerderung = annual + total
  const percent = Math.round((total / annual) * 100)

  return { grundzulage: Math.round(grundzulage), netSteuerersparnis: Math.round(netSteuerersparnis), total, withFoerderung, percent }
}

// ============================================================
// Sparkonto Calculation (simple savings account)
// ============================================================

function calculateSparkonto(monthlySavings: number, savingsYears: number, returnRate: number) {
  let capital = 0
  const annual = monthlySavings * 12
  for (let i = 0; i < savingsYears; i++) {
    capital = (capital + annual) * (1 + returnRate)
  }
  return capital
}

// ============================================================
// Custom Tooltip for the stacked chart
// ============================================================

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-4 shadow-xl border border-surface-600/30">
      <p className="text-sm font-semibold text-surface-300 mb-2">
        Alter: {label} Jahre
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm py-0.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-surface-400">{entry.name}:</span>
          <span className="font-medium text-surface-100">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function CalculatorAVD() {
  // Step state: 'input' or 'results'
  const [step, setStep] = useState<'input' | 'results'>('input')

  // Input state
  const [monthlySavings, setMonthlySavings] = useState(150)
  const [marginalTaxRate, setMarginalTaxRate] = useState(0.37)
  const [familienstand, setFamilienstand] = useState<'ledig' | 'verheiratet'>('ledig')
  const [birthYear, setBirthYear] = useState(1990)
  const [gender] = useState<Gender>('M')

  // Results step: return rate toggle
  const [selectedReturn, setSelectedReturn] = useState(7.5)

  // Derived values
  const currentYear = new Date().getFullYear()
  const currentAge = currentYear - birthYear
  const retirementAge = 67
  const savingsYears = Math.max(retirementAge - currentAge, 0)
  const lifeExpectancy = LIFE_EXPECTANCY[gender]

  // Förderung preview for Step 1
  const foerderung = useMemo(
    () => calculateFoerderung(monthlySavings, marginalTaxRate),
    [monthlySavings, marginalTaxRate]
  )
  const annualContrib = monthlySavings * 12

  // Full calculation for Step 2
  const results = useMemo(() => {
    if (currentAge >= retirementAge) return null
    const input: CalculatorInput = {
      currentAge,
      retirementAge,
      gender,
      monthlySavings,
      annualBonus: 0,
      expectedReturn: selectedReturn / 100,
      marginalTaxRate,
      retirementTaxRate: 0.20,
      startingCapital: 0,
      riesterBalance: 0,
    }
    const avd = calculateAVD(input)
    const normal = calculateNormalDepot(input)
    return { avd, normal }
  }, [currentAge, retirementAge, gender, monthlySavings, selectedReturn, marginalTaxRate])

  // Sparkonto for 3-column comparison
  const sparkontoCapital = useMemo(
    () => calculateSparkonto(monthlySavings, savingsYears, 0.02),
    [monthlySavings, savingsYears]
  )

  // Monthly pension from the Rente CTA
  const monthlyPensionGross = results?.avd.monthlyGrossRetirement ?? 0

  // ============================================================
  // STEP 1: Input + Förderung Preview
  // ============================================================

  if (step === 'input') {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-50">
            Altersvorsorgerechner
          </h1>
          <p className="mt-2 text-base text-surface-400">
            Altersvorsorgedepot: Jetzt voraussichtliche Zusatzrente berechnen.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Input Cards */}
          <div className="space-y-4 animate-slide-up">
            {/* Contribution Selection */}
            <div className="glass rounded-2xl p-6 border border-surface-700/40">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-semibold text-surface-100">
                  Wie viel möchten Sie pro Monat investieren?
                </h3>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-surface-500 hover:text-surface-300 transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Wählen Sie Ihren monatlichen Sparbetrag. Bis 150 €/Monat ist die Förderquote am höchsten.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CONTRIBUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMonthlySavings(opt.value)}
                    className={cn(
                      'rounded-xl px-4 py-3.5 text-center transition-all duration-200 border',
                      monthlySavings === opt.value
                        ? 'bg-brand-500/20 border-brand-400 text-white shadow-[0_0_12px_rgba(6,196,170,0.15)]'
                        : 'bg-surface-800/60 border-surface-700/50 text-surface-300 hover:border-surface-600'
                    )}
                  >
                    <div className="text-lg font-bold">{opt.label}</div>
                    <div className="text-xs text-surface-400 mt-0.5">{opt.sublabel}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Income Bracket Selection */}
            <div className="glass rounded-2xl p-6 border border-surface-700/40">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-semibold text-surface-100">
                  In welchem Bereich liegt Ihr Bruttojahreseinkommen?
                </h3>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-surface-500 hover:text-surface-300 transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ihr Grenzsteuersatz beeinflusst die Steuerersparnis durch den Sonderausgabenabzug.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Ledig / Verheiratet toggle */}
              <div className="flex gap-1 bg-surface-800/80 rounded-full p-1 w-fit mb-4">
                {(['ledig', 'verheiratet'] as const).map((fs) => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => setFamilienstand(fs)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 capitalize',
                      familienstand === fs
                        ? 'bg-brand-500/25 text-brand-300 shadow-sm'
                        : 'text-surface-400 hover:text-surface-200'
                    )}
                  >
                    {fs}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {INCOME_BRACKETS.map((bracket) => (
                  <button
                    key={bracket.rate}
                    type="button"
                    onClick={() => setMarginalTaxRate(bracket.rate)}
                    className={cn(
                      'rounded-xl px-4 py-3.5 text-center transition-all duration-200 border',
                      marginalTaxRate === bracket.rate
                        ? 'bg-brand-500/20 border-brand-400 text-white shadow-[0_0_12px_rgba(6,196,170,0.15)]'
                        : 'bg-surface-800/60 border-surface-700/50 text-surface-300 hover:border-surface-600'
                    )}
                  >
                    <div className="text-sm font-bold">{bracket.label}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{bracket.sublabel}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Birth Year */}
            <div className="glass rounded-2xl p-6 border border-surface-700/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-surface-100">
                  Wann sind Sie geboren?
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBirthYear((y) => Math.max(1950, y - 1))}
                    className="w-9 h-9 rounded-lg border border-surface-700/50 bg-surface-800/60 flex items-center justify-center text-surface-300 hover:bg-surface-700/60 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-16 text-center">
                    <span className="text-lg font-bold text-white">{birthYear}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBirthYear((y) => Math.min(2010, y + 1))}
                    className="w-9 h-9 rounded-lg border border-surface-700/50 bg-surface-800/60 flex items-center justify-center text-surface-300 hover:bg-surface-700/60 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Slider */}
              <input
                type="range"
                min={1950}
                max={2010}
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer accent-brand-400
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-400"
              />
            </div>
          </div>

          {/* RIGHT: Förderung Preview */}
          <div className="glass rounded-2xl p-6 md:p-8 border border-surface-700/40 animate-slide-up lg:sticky lg:top-24"
               style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            {/* Big Headline */}
            <h2 className="text-center mb-8">
              <span className="text-3xl sm:text-4xl font-bold text-brand-400">
                {formatNumber(foerderung.total)} €
              </span>
              <span className="text-xl sm:text-2xl font-bold text-surface-100 ml-2">
                staatliche Förderung für Ihr Depot
              </span>
            </h2>

            {/* Bar Chart: Ohne vs Mit Förderung */}
            <div className="flex items-end justify-center gap-12 mb-4">
              {/* Ohne Förderung Bar */}
              <div className="flex flex-col items-center">
                <div className="text-sm text-surface-400 mb-2">
                  {formatNumber(annualContrib)} € / Jahr
                </div>
                <div
                  className="w-28 sm:w-32 bg-surface-600 rounded-t-lg transition-all duration-500"
                  style={{ height: `${Math.max(60, (annualContrib / Math.max(foerderung.withFoerderung, 1)) * 200)}px` }}
                />
                <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mt-3">
                  Ohne Förderung
                </div>
              </div>

              {/* Mit Förderung Bar */}
              <div className="flex flex-col items-center">
                <div className="text-sm text-brand-400 font-bold mb-1">
                  +{formatNumber(foerderung.total)} € / +{foerderung.percent} %
                </div>
                <div className="text-sm text-surface-300 mb-2">
                  {formatNumber(foerderung.withFoerderung)} € / Jahr
                </div>
                <div
                  className="w-28 sm:w-32 bg-brand-400 rounded-t-lg transition-all duration-500"
                  style={{ height: `${Math.max(80, 200)}px` }}
                />
                <div className="text-xs font-bold text-brand-400 uppercase tracking-wider mt-3">
                  Mit Förderung
                </div>
              </div>
            </div>

            {/* CTA Button */}
            {savingsYears > 0 && (
              <button
                type="button"
                onClick={() => setStep('results')}
                className="w-full mt-6 py-4 px-6 rounded-xl bg-brand-500 hover:bg-brand-400 text-surface-950 font-semibold text-base transition-all duration-200 flex items-center justify-between group"
              >
                <span>
                  Sehen Sie sich an, wie aus {monthlySavings} € monatlich{' '}
                  <span className="font-bold">{formatNumber(monthlyPensionGross)} € Rente</span> werden.
                </span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  // ============================================================
  // STEP 2: Detailed Results
  // ============================================================

  if (!results) return null
  const { avd, normal } = results

  const chartData = avd.savingsPhase.map((year) => ({
    age: year.age,
    beitraege: year.cumulativeContributions,
    zulagen: year.cumulativeSubsidies,
    gewinne: year.cumulativeGains,
  }))

  const ownContribPercent = avd.totalContributions > 0
    ? Math.round((avd.totalContributions / avd.totalCapital) * 100)
    : 0

  const monthlyDiff = avd.monthlyNetRetirement - normal.monthlyNetRetirement
  const monthlyDiffGross = avd.monthlyGrossRetirement - normal.monthlyGrossRetirement

  // Sparkonto monthly pension (simple: capital / withdrawalYears / 12)
  const sparkontoMonthly = Math.round(sparkontoCapital / (Math.max(lifeExpectancy - retirementAge, 1)) / 12)

  const avdDiffSpar = avd.monthlyGrossRetirement - sparkontoMonthly
  const avdDiffSparNet = avd.monthlyNetRetirement - sparkontoMonthly

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <button
          type="button"
          onClick={() => setStep('input')}
          className="flex items-center gap-2 text-surface-400 hover:text-brand-400 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu den Eingaben & Zulagen
        </button>

        {/* Return Rate Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-400 hidden sm:block">Erwartete Nettorendite</span>
          <div className="flex gap-1 bg-surface-800/80 rounded-full p-1">
            {RETURN_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReturn(r)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  selectedReturn === r
                    ? 'bg-brand-500/25 text-brand-300 shadow-sm'
                    : 'text-surface-400 hover:text-surface-200'
                )}
              >
                {r} %
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column: Chart Left + Pension Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-slide-up">
        {/* LEFT: Ansparen */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
            Ansparen bis {retirementAge}
          </h2>
          <p className="text-sm text-brand-400 font-semibold mb-2">Altersvorsorgedepot</p>
          <p className="text-sm text-surface-400 mb-6">
            Aus monatlich <span className="text-white font-semibold">{monthlySavings} €</span> werden{' '}
            <span className="text-white font-semibold">{formatNumber(Math.round(avd.totalCapital))} €</span>.
            Davon sind lediglich <span className="text-white font-semibold">{ownContribPercent} %</span> Ihr Eigenbeitrag.
          </p>

          {/* Legend */}
          <div className="flex gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.beitraege }} />
              <span className="text-surface-400">Eigenbeitrag</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.zulagen }} />
              <span className="text-surface-400">Zulagen & Steuervorteile</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.gewinne }} />
              <span className="text-surface-400">Kapitalerträge</span>
            </div>
          </div>

          {/* Stacked Area Chart */}
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBeit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.beitraege} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.beitraege} stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradZul" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.zulagen} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.zulagen} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="gradGew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.gewinne} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.gewinne} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                <XAxis
                  dataKey="age"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
                  tickLine={false}
                  label={{ value: 'Alter', position: 'insideBottomRight', offset: -5, style: { fill: '#64748b', fontSize: 12 } }}
                />
                <YAxis
                  tickFormatter={(v: number) => {
                    if (v >= 1000) return `${Math.round(v / 1000)}`
                    return `${v}`
                  }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  label={{ value: 'Kapital (in Tsd. €)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#64748b', fontSize: 11 } }}
                />
                <RechartsTooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="beitraege" name="Eigenbeitrag" stackId="1"
                  stroke={CHART_COLORS.beitraege} fill="url(#gradBeit)" strokeWidth={0} />
                <Area type="monotone" dataKey="zulagen" name="Zulagen & Steuervorteile" stackId="1"
                  stroke={CHART_COLORS.zulagen} fill="url(#gradZul)" strokeWidth={0} />
                <Area type="monotone" dataKey="gewinne" name="Kapitalerträge" stackId="1"
                  stroke={CHART_COLORS.gewinne} fill="url(#gradGew)" strokeWidth={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: Auszahlen */}
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
            Auszahlen bis {lifeExpectancy}
          </h2>
          <p className="text-sm text-brand-400 font-semibold mb-2">Altersvorsorgedepot</p>
          <p className="text-sm text-surface-400 mb-8">
            Das ergibt <span className="text-white font-semibold">{formatNumber(Math.round(avd.monthlyGrossRetirement))} €</span> pro Monat brutto,
            was etwa <span className="text-white font-semibold">{formatNumber(Math.round(avd.monthlyNetRetirement))} €</span> netto entspricht.
          </p>

          {/* Big Pension Number */}
          <div className="text-center py-8">
            <p className="text-6xl sm:text-7xl font-black text-surface-50 tracking-tight">
              {formatNumber(Math.round(avd.monthlyGrossRetirement))} €
            </p>
            <p className="text-base text-surface-400 mt-2">
              monatlich, etwa {formatNumber(Math.round(avd.monthlyNetRetirement))} € netto
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3-Column Comparison: AVD vs Normal vs Sparkonto */}
      {/* ============================================================ */}
      <div className="glass rounded-2xl p-6 md:p-10 border border-surface-700/40 animate-slide-up"
           style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-surface-50">
            Monatlich <span className="text-brand-400">{formatNumber(Math.round(monthlyDiffGross))} €</span> mehr im Alter
          </h3>
          <p className="text-sm text-surface-400 mt-2 max-w-2xl mx-auto">
            Ein staatlich gefördertes Altersvorsorgedepot schlägt ein normales Depot um{' '}
            <span className="text-white font-semibold">{formatNumber(Math.round(monthlyDiffGross))} €</span> pro Monat
            (etwa {formatNumber(Math.round(monthlyDiff))} € netto).
            Gegenüber einem Sparkonto sind es sogar{' '}
            <span className="text-white font-semibold">{formatNumber(Math.round(avdDiffSpar))} €</span>
            {' '}(etwa {formatNumber(Math.round(avdDiffSparNet))} € netto).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* AVD Column */}
          <div className="text-center">
            <h4 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">
              Altersvorsorgedepot
            </h4>
            <p className="text-3xl sm:text-4xl font-black text-surface-50 mb-1">
              {formatNumber(Math.round(avd.totalCapital))} €
            </p>
            <p className="text-xs text-surface-500 mb-6">Kapital am Ende der Ansparphase</p>
            <p className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
              {formatNumber(Math.round(avd.monthlyGrossRetirement))} €
            </p>
            <p className="text-xs text-surface-500">
              monatlich, etwa {formatNumber(Math.round(avd.monthlyNetRetirement))} € netto
            </p>
          </div>

          {/* Normal Depot Column */}
          <div className="text-center">
            <h4 className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-4">
              Normales Depot
            </h4>
            <p className="text-3xl sm:text-4xl font-black text-surface-50 mb-1">
              {formatNumber(Math.round(normal.totalCapital))} €
            </p>
            <p className="text-xs text-surface-500 mb-6">Kapital am Ende der Ansparphase</p>
            <p className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
              {formatNumber(Math.round(normal.monthlyGrossRetirement))} €
            </p>
            <p className="text-xs text-surface-500">
              monatlich, etwa {formatNumber(Math.round(normal.monthlyNetRetirement))} € netto
            </p>
          </div>

          {/* Sparkonto Column */}
          <div className="text-center">
            <h4 className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-4">
              Sparkonto 2 % p.a.
            </h4>
            <p className="text-3xl sm:text-4xl font-black text-surface-50 mb-1">
              {formatNumber(Math.round(sparkontoCapital))} €
            </p>
            <p className="text-xs text-surface-500 mb-6">Kapital am Ende der Ansparphase</p>
            <p className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
              {formatNumber(sparkontoMonthly)} €
            </p>
            <p className="text-xs text-surface-500">
              monatlich, etwa {formatNumber(sparkontoMonthly)} € netto
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
