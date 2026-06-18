import { useState, useRef, useEffect } from 'react'
import { compareAVDvsNormal } from '@/lib/calculations'
import CalculatorForm from '@/components/CalculatorForm'
import ResultsCard from '@/components/ResultsCard'
import ComparisonChart from '@/components/ComparisonChart'
import ComparisonTable from '@/components/ComparisonTable'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ComparisonResult, CalculatorInput, EarlyStartInput } from '@/lib/types'

export default function CalculatorComparison() {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const handleCalculate = (input: CalculatorInput | EarlyStartInput) => {
    const result = compareAVDvsNormal(input as CalculatorInput)
    setComparison(result)
  }

  useEffect(() => {
    if (comparison && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [comparison])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-50">
          AVD vs. Normales Depot
        </h1>
        <p className="mt-3 text-lg text-surface-400 max-w-2xl">
          Vergleichen Sie das Altersvorsorgedepot mit einem herkömmlichen Depot.
          Entdecken Sie, welche Variante für Sie am vorteilhaftesten ist.
        </p>
      </div>

      {/* Calculator Form */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <CalculatorForm type="comparison" onCalculate={handleCalculate} />
      </div>

      {/* Results */}
      {comparison && (
        <div
          ref={resultsRef}
          className={cn('mt-12 space-y-6 animate-fade-in')}
        >
          {/* Advantage Banner */}
          <div
            className={cn(
              'rounded-2xl p-6 border',
              comparison.comparison.avdAdvantage
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            )}
          >
            <div className="flex items-center gap-3">
              {comparison.comparison.avdAdvantage ? (
                <TrendingUp className="h-6 w-6 text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown className="h-6 w-6 text-amber-400 shrink-0" />
              )}
              <div>
                <h3
                  className={cn(
                    'text-lg font-semibold',
                    comparison.comparison.avdAdvantage
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  )}
                >
                  {comparison.comparison.avdAdvantage
                    ? `AVD Vorteil: +${formatCurrency(Math.abs(comparison.comparison.capitalDifference))}`
                    : `Normales Depot Vorteil: +${formatCurrency(Math.abs(comparison.comparison.capitalDifference))}`}
                </h3>
                <p
                  className={cn(
                    'text-sm mt-1',
                    comparison.comparison.avdAdvantage
                      ? 'text-emerald-400/80'
                      : 'text-amber-400/80'
                  )}
                >
                  {comparison.comparison.avdAdvantage
                    ? 'Das Altersvorsorgedepot bietet für Ihre Situation einen höheren Kapitalaufbau.'
                    : 'Ein normales Depot kann in Ihrer Situation vorteilhafter sein.'}
                </p>
              </div>
            </div>
          </div>

          {/* Side-by-side Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-200 mb-4">
                Altersvorsorgedepot (AVD)
              </h3>
              <ResultsCard results={comparison.avd} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-surface-200 mb-4">
                Normales Depot
              </h3>
              <ResultsCard results={comparison.normalDepot} />
            </div>
          </div>

          {/* Comparison Chart */}
          <ComparisonChart avdData={comparison.avd} normalData={comparison.normalDepot} />

          {/* Comparison Table */}
          <ComparisonTable comparison={comparison} />
        </div>
      )}
    </section>
  )
}
