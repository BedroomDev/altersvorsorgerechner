import { useState, useMemo, useEffect } from 'react'
import { ArrowRight, HelpCircle, Minus, Plus, TrendingUp, TrendingDown, Info, ArrowLeft } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatNumber } from '@/lib/utils'
import { calculateDebekaCAI, type DebekaCAIResult } from '@/lib/debekaCAI'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Chart Data Hook (Fund Performance) ────────────────────────────────────

interface FundDataPoint {
  date: string
  price: number
}

function useFundData() {
  const [data, setData] = useState<FundDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        // Debeka's first-party API for the Global Shares fund.
        // In dev: proxied via Vite (see vite.config.ts)
        // In prod: proxied via Nginx reverse proxy
        const res = await fetch('/fonds-service/kurse/GLOBAL_SHARES')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const raw: Array<{ d: string; k: number }> = await res.json()

        if (cancelled) return

        // Downsample to weekly data for chart performance (every 5th trading day)
        const sampled = raw.filter((_, i) => i % 5 === 0 || i === raw.length - 1)
        setData(sampled.map((p) => ({ date: p.d, price: p.k })))
      } catch {
        // Fallback: use static representative data if API is unavailable (e.g. CORS)
        if (!cancelled) {
          setData(generateFallbackData())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  return { data, loading }
}

/** Fallback data if the live API is unavailable (e.g. blocked by CORS in dev) */
function generateFallbackData(): FundDataPoint[] {
  // Based on actual Debeka Global Shares performance: +163.62% since inception (Apr 2016)
  // annualized ~10.01% p.a. — sourced from /fonds-service/entwicklung/GLOBAL_SHARES
  const milestones: FundDataPoint[] = [
    { date: '2016-04', price: 100.00 },
    { date: '2016-07', price: 95.00 },
    { date: '2016-12', price: 108.06 },
    { date: '2017-06', price: 115.67 },
    { date: '2017-12', price: 121.50 },
    { date: '2018-06', price: 125.30 },
    { date: '2018-12', price: 111.20 },
    { date: '2019-06', price: 122.40 },
    { date: '2019-12', price: 134.80 },
    { date: '2020-03', price: 105.50 },
    { date: '2020-06', price: 122.00 },
    { date: '2020-12', price: 138.00 },
    { date: '2021-06', price: 158.00 },
    { date: '2021-12', price: 172.50 },
    { date: '2022-06', price: 145.00 },
    { date: '2022-12', price: 150.30 },
    { date: '2023-06', price: 163.00 },
    { date: '2023-12', price: 179.50 },
    { date: '2024-06', price: 205.00 },
    { date: '2024-12', price: 224.10 },
    { date: '2025-06', price: 238.00 },
    { date: '2025-12', price: 251.20 },
    { date: '2026-06', price: 263.62 },
  ]
  return milestones
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-surface-700/50 shadow-xl">
      <p className="text-xs text-surface-400 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-surface-300">{entry.name}:</span>
          <span className="font-medium text-surface-100">
            {typeof entry.value === 'number' ? formatNumber(Math.round(entry.value)) + ' €' : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function FundChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-surface-700/50 shadow-xl">
      <p className="text-xs text-surface-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-brand-400">{payload[0]?.value?.toFixed(2)} Punkte</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CalculatorDebekaCAI() {
  const [step, setStep] = useState<1 | 2>(1)

  // Input state
  const [mode, setMode] = useState<'monthly' | 'single'>('monthly')
  const [birthYear, setBirthYear] = useState(1990)
  const [monthlyContribution, setMonthlyContribution] = useState(150)
  const [singleContribution, setSingleContribution] = useState(10000)
  const [returnRate, setReturnRate] = useState(7)
  const [payoutAge, setPayoutAge] = useState(67)

  // Fund chart data
  const { data: fundData, loading: fundLoading } = useFundData()

  // Calculate result
  const result = useMemo<DebekaCAIResult>(() => {
    return calculateDebekaCAI({
      mode,
      birthYear,
      monthlyContribution,
      singleContribution,
      returnRate,
      payoutAge,
    })
  }, [mode, birthYear, monthlyContribution, singleContribution, returnRate, payoutAge])

  // Chart data for results
  const chartData = useMemo(() => {
    return result.yearData.map((d) => ({
      age: d.age,
      Eigenbeitrag: d.totalContributions,
      Kosten: d.totalCostsCumulative,
      Rendite: d.totalReturns,
      Fondswert: d.fundValue,
      'Ohne Kosten': d.fundValueWithoutCosts,
    }))
  }, [result])

  const currentAge = new Date().getFullYear() - birthYear
  const yearsToRun = payoutAge - currentAge

  // ─── STEP 1: Input Form ──────────────────────────────────────────────────

  if (step === 1) {
    return (
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-3xl sm:text-4xl font-bold text-surface-50 mb-2">
              Debeka CAI Rechner
            </h1>
            <p className="text-surface-400 text-lg">
              Fondsgebundene Rentenversicherung – Debeka Global Shares. Berechnen Sie Ihre Rendite nach Kosten.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* LEFT: Input Cards (3/5) */}
            <div className="lg:col-span-3 space-y-5 animate-slide-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
              {/* Mode Selection */}
              <div className="glass rounded-2xl p-6 border border-surface-700/40">
                <h3 className="text-base font-semibold text-surface-100 mb-4">
                  Beitragsart wählen
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['monthly', 'single'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-center transition-all duration-200',
                        mode === m
                          ? 'border-brand-400 bg-brand-500/10 text-brand-300'
                          : 'border-surface-700/50 bg-surface-800/30 text-surface-300 hover:border-surface-600'
                      )}
                    >
                      <div className="text-lg font-bold">{m === 'monthly' ? 'Monatlich' : 'Einmalbeitrag'}</div>
                      <div className="text-xs text-surface-400 mt-0.5">
                        {m === 'monthly' ? 'Regelmäßige Sparrate' : 'Einmalige Anlage'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contribution Amount */}
              <div className="glass rounded-2xl p-6 border border-surface-700/40">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-base font-semibold text-surface-100">
                    {mode === 'monthly' ? 'Monatliche Sparrate' : 'Einmalbetrag'}
                  </h3>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-surface-500 hover:text-surface-300 transition-colors">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{mode === 'monthly'
                          ? 'Der monatliche Beitrag, der in den Debeka Global Shares Fonds investiert wird.'
                          : 'Der einmalige Anlagebetrag, der in den Debeka Global Shares Fonds investiert wird.'
                        }</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {mode === 'monthly' ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => setMonthlyContribution(Math.max(25, monthlyContribution - 25))}
                        className="p-2 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="text-3xl font-bold text-surface-50">{formatNumber(monthlyContribution)} €</div>
                      <button
                        type="button"
                        onClick={() => setMonthlyContribution(Math.min(2000, monthlyContribution + 25))}
                        className="p-2 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={2000}
                      step={25}
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer accent-brand-400
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-400"
                    />
                    <div className="flex justify-between text-xs text-surface-500 mt-1">
                      <span>25 €</span>
                      <span>2.000 €</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => setSingleContribution(Math.max(1000, singleContribution - 1000))}
                        className="p-2 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="text-3xl font-bold text-surface-50">{formatNumber(singleContribution)} €</div>
                      <button
                        type="button"
                        onClick={() => setSingleContribution(Math.min(500000, singleContribution + 1000))}
                        className="p-2 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={500000}
                      step={1000}
                      value={singleContribution}
                      onChange={(e) => setSingleContribution(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer accent-brand-400
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-400"
                    />
                    <div className="flex justify-between text-xs text-surface-500 mt-1">
                      <span>1.000 €</span>
                      <span>500.000 €</span>
                    </div>
                  </>
                )}
              </div>

              {/* Erwartete Rendite */}
              <div className="glass rounded-2xl p-6 border border-surface-700/40">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-base font-semibold text-surface-100">
                    Erwartete Rendite p.a.
                  </h3>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-surface-500 hover:text-surface-300 transition-colors">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Brutto-Rendite des Fonds vor Abzug der internen Fondskosten (TER ~0,3%).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 bg-surface-800/80 rounded-full p-1">
                    {[4, 5, 6, 7, 8, 9, 10].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReturnRate(r)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                          returnRate === r
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

              {/* Birth Year + Payout Age */}
              <div className="glass rounded-2xl p-6 border border-surface-700/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Birth Year */}
                  <div>
                    <h3 className="text-base font-semibold text-surface-100 mb-3">Geburtsjahr</h3>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => setBirthYear(Math.max(1950, birthYear - 1))}
                        className="p-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-2xl font-bold text-surface-50">{birthYear}</span>
                      <button
                        type="button"
                        onClick={() => setBirthYear(Math.min(2010, birthYear + 1))}
                        className="p-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="range"
                      min={1950}
                      max={2010}
                      value={birthYear}
                      onChange={(e) => setBirthYear(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer accent-brand-400
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-400"
                    />
                    <div className="text-xs text-surface-500 mt-1 text-center">
                      Aktuelles Alter: {currentAge} Jahre
                    </div>
                  </div>

                  {/* Payout Age */}
                  <div>
                    <h3 className="text-base font-semibold text-surface-100 mb-3">Auszahlungsalter</h3>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => setPayoutAge(Math.max(62, payoutAge - 1))}
                        className="p-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-2xl font-bold text-surface-50">{payoutAge}</span>
                      <button
                        type="button"
                        onClick={() => setPayoutAge(Math.min(85, payoutAge + 1))}
                        className="p-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:bg-surface-700/60 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="range"
                      min={62}
                      max={85}
                      value={payoutAge}
                      onChange={(e) => setPayoutAge(Number(e.target.value))}
                      className="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer accent-brand-400
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-400"
                    />
                    <div className="text-xs text-surface-500 mt-1 text-center">
                      Laufzeit: {yearsToRun > 0 ? yearsToRun : 0} Jahre
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Fund Performance Chart + Preview (2/5) */}
            <div className="lg:col-span-2 space-y-5 animate-slide-up lg:sticky lg:top-24 lg:self-start"
                 style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
              {/* Fund Performance Chart */}
              <div className="glass rounded-2xl p-5 border border-surface-700/40">
                <h3 className="text-sm font-semibold text-surface-100 mb-1">
                  Debeka Global Shares
                </h3>
                <p className="text-xs text-surface-400 mb-4">Wertentwicklung seit Auflegung (indexiert)</p>

                {fundLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-400 border-t-transparent" />
                  </div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fundData}>
                        <defs>
                          <linearGradient id="fundGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          interval={11}
                          tickFormatter={(v: string) => v.split('-')[0]}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          width={35}
                        />
                        <RechartsTooltip content={<FundChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#2dd4bf"
                          strokeWidth={2}
                          fill="url(#fundGrad)"
                          name="Kurs"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {fundData.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-700/30">
                    <div className="text-xs text-surface-400">
                      Aktuell: <span className="text-surface-200 font-medium">{fundData[fundData.length - 1]?.price.toFixed(1)} Pkt.</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {(() => {
                        const first = fundData[0]?.price ?? 100
                        const last = fundData[fundData.length - 1]?.price ?? 100
                        const pct = ((last - first) / first * 100).toFixed(1)
                        const isUp = last >= first
                        return (
                          <>
                            {isUp ? <TrendingUp className="h-3 w-3 text-brand-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                            <span className={isUp ? 'text-brand-400 font-medium' : 'text-red-400 font-medium'}>
                              {isUp ? '+' : ''}{pct}% gesamt
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Preview */}
              <div className="glass rounded-2xl p-5 border border-surface-700/40">
                <h3 className="text-sm font-semibold text-surface-100 mb-3">Schnellvorschau</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Eingezahlte Beiträge</span>
                    <span className="text-sm font-medium text-surface-200">{formatNumber(result.totalContributions)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Gesamtkosten</span>
                    <span className="text-sm font-medium text-amber-400">{formatNumber(result.totalCosts)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Kapitalerträge</span>
                    <span className="text-sm font-medium text-brand-400">{formatNumber(result.totalReturns)} €</span>
                  </div>
                  <div className="h-px bg-surface-700/30" />
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400 font-semibold">Fondswert</span>
                    <span className="text-sm font-bold text-surface-50">{formatNumber(result.finalFundValue)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-surface-400">Netto nach Steuern</span>
                    <span className="text-sm font-bold text-brand-400">{formatNumber(result.netPayout)} €</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => { setStep(2); window.scrollTo(0, 0) }}
                disabled={yearsToRun <= 0}
                className={cn(
                  'w-full rounded-2xl py-4 px-6 font-bold text-base flex items-center justify-between transition-all duration-300',
                  yearsToRun > 0
                    ? 'bg-brand-500 text-surface-950 hover:bg-brand-400 hover:shadow-glow cursor-pointer'
                    : 'bg-surface-700 text-surface-500 cursor-not-allowed'
                )}
              >
                <span>Detaillierte Ergebnisse anzeigen</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ─── STEP 2: Results View ──────────────────────────────────────────────────

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <button
            type="button"
            onClick={() => { setStep(1); window.scrollTo(0, 0) }}
            className="flex items-center gap-2 text-surface-400 hover:text-surface-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Zurück zu den Eingaben</span>
          </button>

          {/* Return rate toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-400">Rendite</span>
            <div className="flex gap-1 bg-surface-800/80 rounded-full p-1">
              {[5, 7, 9].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReturnRate(r)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
                    returnRate === r
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

        {/* Two-Column Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Accumulation Chart */}
          <div className="animate-slide-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
              Vermögensaufbau bis {payoutAge}
            </h2>
            <p className="text-brand-400 font-semibold mb-2">
              Debeka Chance Invest (CAI)
            </p>
            <p className="text-sm text-surface-400 mb-6">
              Aus {mode === 'monthly' ? `monatlich ${formatNumber(monthlyContribution)} €` : `einem Einmalbeitrag von ${formatNumber(singleContribution)} €`} werden{' '}
              <strong className="text-surface-200">{formatNumber(result.finalFundValue)} €</strong>.{' '}
              Davon sind <strong className="text-surface-200">{formatNumber(result.totalCosts)} €</strong> Kosten.
            </p>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-surface-500/80" />
                <span className="text-surface-400">Eigenbeitrag</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-500/80" />
                <span className="text-surface-400">Kosten</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-brand-400/80" />
                <span className="text-surface-400">Kapitalerträge</span>
              </div>
            </div>

            {/* Stacked Area Chart */}
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradEigen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="gradKosten" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="gradRendite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Alter', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: '#64748b' } }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}`}
                    label={{ value: 'Tsd. €', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#64748b' } }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Eigenbeitrag" stackId="1" stroke="#64748b" fill="url(#gradEigen)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Kosten" stackId="1" stroke="#f59e0b" fill="url(#gradKosten)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Rendite" stackId="1" stroke="#2dd4bf" fill="url(#gradRendite)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: Payout Details */}
          <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 mb-1">
              Auszahlung mit {payoutAge}
            </h2>
            <p className="text-brand-400 font-semibold mb-2">
              {result.isHalbeinkuenfte ? 'Halbeinkünfteverfahren anwendbar ✓' : 'Volle Besteuerung'}
            </p>
            <p className="text-sm text-surface-400 mb-8">
              {result.isHalbeinkuenfte
                ? 'Erträge sind zu 50% steuerfrei (Vertrag ≥12 Jahre, Auszahlung ab 62). Eingezahlte Beiträge sind komplett steuerfrei.'
                : 'Halbeinkünfteverfahren nicht anwendbar. Vertrag muss mindestens 12 Jahre laufen und Auszahlung erst ab Alter 62.'}
            </p>

            {/* Big Payout Number */}
            <div className="text-center mb-8">
              <div className="text-6xl sm:text-7xl font-bold text-surface-50 mb-2">
                {formatNumber(result.netPayout)} €
              </div>
              <div className="text-surface-400">
                Netto-Auszahlung nach Steuern
              </div>
              {result.tax > 0 && (
                <div className="text-xs text-surface-500 mt-1">
                  Steuer: {formatNumber(result.tax)} € ({result.isHalbeinkuenfte ? '50% der Erträge steuerfrei' : 'volle Besteuerung'})
                </div>
              )}
            </div>

            {/* Detail Table */}
            <div className="glass rounded-2xl p-6 border border-surface-700/40">
              <h3 className="text-sm font-semibold text-surface-100 mb-4">Detailaufstellung</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Eingezahlte Beiträge</span>
                  <span className="text-sm font-medium text-surface-200">{formatNumber(result.totalContributions)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Kapitalerträge (Rendite)</span>
                  <span className="text-sm font-medium text-brand-400">+{formatNumber(result.totalReturns)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Gesamtkosten (Versicherung)</span>
                  <span className="text-sm font-medium text-amber-400">-{formatNumber(result.totalCosts)} €</span>
                </div>
                <div className="h-px bg-surface-700/30" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-surface-200">Fondswert (brutto)</span>
                  <span className="text-sm font-bold text-surface-50">{formatNumber(result.finalFundValue)} €</span>
                </div>
                <div className="h-px bg-surface-700/30" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Davon Erträge (Gewinn)</span>
                  <span className="text-sm text-surface-300">{formatNumber(result.gains)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Steuerpflichtige Erträge (50%)</span>
                  <span className="text-sm text-surface-300">{formatNumber(result.taxableGains)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Steuern (~26,375%)</span>
                  <span className="text-sm font-medium text-red-400">-{formatNumber(result.tax)} €</span>
                </div>
                <div className="h-px bg-surface-700/30" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-brand-400">Netto-Auszahlung</span>
                  <span className="text-lg font-bold text-brand-400">{formatNumber(result.netPayout)} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Comparison Section */}
        <div className="mt-12 glass rounded-2xl p-6 sm:p-8 border border-surface-700/40 animate-slide-up"
             style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-center text-surface-50 mb-2">
            Kosteneinfluss auf Ihr Vermögen
          </h2>
          <p className="text-center text-surface-400 text-sm mb-8">
            Vergleich: Mit Versicherungskosten vs. ohne Kosten (reiner Fondssparplan)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {/* With Costs */}
            <div>
              <div className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-2">
                Debeka CAI (nach Kosten)
              </div>
              <div className="text-3xl font-bold text-surface-50 mb-1">
                {formatNumber(result.finalFundValue)} €
              </div>
              <div className="text-xs text-surface-400">
                Fondswert
              </div>
              <div className="text-xl font-bold text-brand-400 mt-3">
                {formatNumber(result.netPayout)} €
              </div>
              <div className="text-xs text-surface-400">
                netto nach Steuern
              </div>
            </div>

            {/* Cost Impact */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                Kosteneffekt
              </div>
              <div className="text-3xl font-bold text-amber-400 mb-1">
                -{formatNumber(result.costImpact)} €
              </div>
              <div className="text-xs text-surface-400">
                weniger durch Kosten
              </div>
              <div className="text-sm text-amber-400/80 mt-1">
                ({((result.costImpact / Math.max(result.fundValueWithoutCosts, 1)) * 100).toFixed(1)}% des Endwerts)
              </div>
            </div>

            {/* Without Costs */}
            <div>
              <div className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                Ohne Kosten (ETF-Sparplan)
              </div>
              <div className="text-3xl font-bold text-surface-300 mb-1">
                {formatNumber(result.fundValueWithoutCosts)} €
              </div>
              <div className="text-xs text-surface-400">
                Fondswert bei 0% Kosten
              </div>
            </div>
          </div>
        </div>

        {/* Kostenübersicht Table */}
        <div className="mt-8 glass rounded-2xl p-6 sm:p-8 border border-surface-700/40 animate-slide-up"
             style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <h3 className="text-lg font-bold text-surface-100 mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-400" />
            Kostenübersicht Debeka CAI
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-surface-700/20">
                <span className="text-sm text-surface-400">Abschlusskosten</span>
                <span className="text-sm font-medium text-surface-200">2,5% der Beitragssumme</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-700/20">
                <span className="text-sm text-surface-400">Verteilung</span>
                <span className="text-sm font-medium text-surface-200">Über 5 Jahre (Zillmerung)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-700/20">
                <span className="text-sm text-surface-400">Alpha-Kosten (je Beitrag)</span>
                <span className="text-sm font-medium text-surface-200">3,5% pro Einzahlung</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-surface-700/20">
                <span className="text-sm text-surface-400">Stückkosten (fix)</span>
                <span className="text-sm font-medium text-surface-200">36 €/Jahr</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-700/20">
                <span className="text-sm text-surface-400">Gamma-Kosten (Guthaben)</span>
                <span className="text-sm font-medium text-surface-200">0,3% p.a.</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-700/20">
                <span className="text-sm text-surface-400">Fonds-TER (intern)</span>
                <span className="text-sm font-medium text-surface-200">~0,3% p.a.</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
            <p className="text-xs text-surface-400">
              <strong className="text-surface-300">Steuerhinweis:</strong>{' '}
              Bei einer Laufzeit von mindestens 12 Jahren und Auszahlung ab Alter 62 greift das Halbeinkünfteverfahren:
              Nur 50% der Erträge werden besteuert. Die eingezahlten Beiträge sind bei Auszahlung komplett steuerfrei.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
