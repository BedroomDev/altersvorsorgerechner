import { useState, useRef, useEffect } from 'react'
import { calculateAVD } from '@/lib/calculations'
import CalculatorForm from '@/components/CalculatorForm'
import ResultsCard from '@/components/ResultsCard'
import Chart from '@/components/Chart'
import { cn } from '@/lib/utils'
import type { CalculationResult, CalculatorInput, EarlyStartInput } from '@/lib/types'

export default function CalculatorAVD() {
  const [results, setResults] = useState<CalculationResult | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const handleCalculate = (input: CalculatorInput | EarlyStartInput) => {
    const result = calculateAVD(input as CalculatorInput)
    setResults(result)
  }

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [results])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-50">
          Altersvorsorgedepot Rechner
        </h1>
        <p className="mt-3 text-lg text-surface-400 max-w-2xl">
          Berechnen Sie Ihr Altersvorsorgedepot mit staatlichen Zulagen und
          Steuervorteilen. Sehen Sie, wie Ihr Vermögen über die Jahre wächst.
        </p>
      </div>

      {/* Calculator Form */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <CalculatorForm type="avd" onCalculate={handleCalculate} />
      </div>

      {/* Results */}
      {results && (
        <div
          ref={resultsRef}
          className={cn('mt-12 space-y-6 animate-fade-in')}
        >
          <ResultsCard results={results} />
          <Chart data={results} />
        </div>
      )}
    </section>
  )
}
