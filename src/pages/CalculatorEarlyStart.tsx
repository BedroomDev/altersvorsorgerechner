import { useState, useRef, useEffect } from 'react'
import { calculateEarlyStartPension } from '@/lib/calculations'
import CalculatorForm from '@/components/CalculatorForm'
import ResultsCard from '@/components/ResultsCard'
import Chart from '@/components/Chart'
import { cn, formatCurrency } from '@/lib/utils'
import type { EarlyStartResult, EarlyStartInput, CalculatorInput } from '@/lib/types'

interface CheckpointCard {
  label: string
  age: number
  value: number
}

export default function CalculatorEarlyStart() {
  const [result, setResult] = useState<EarlyStartResult | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const handleCalculate = (input: CalculatorInput | EarlyStartInput) => {
    const esInput = input as EarlyStartInput
    const earlyStartInput: EarlyStartInput = {
      childAge: esInput.childAge,
      monthlySavings: esInput.monthlySavings,
      expectedReturn: esInput.expectedReturn,
      retirementAge: esInput.retirementAge,
    }
    const res = calculateEarlyStartPension(earlyStartInput)
    setResult(res)
  }

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const checkpoints: CheckpointCard[] = result
    ? [
        { label: '18 Jahre', age: 18, value: result.checkpoints.age18 },
        { label: '30 Jahre', age: 30, value: result.checkpoints.age30 },
        { label: '45 Jahre', age: 45, value: result.checkpoints.age45 },
        { label: '60 Jahre', age: 60, value: result.checkpoints.age60 },
        {
          label: `${result.calculation.savingsPhase.length > 0 ? result.calculation.savingsPhase[result.calculation.savingsPhase.length - 1].age : '67'} Jahre (Rente)`,
          age: result.checkpoints.retirementAge ? 67 : 67,
          value: result.checkpoints.retirementAge,
        },
      ]
    : []

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-50">
          Frühstart-Rente für Kinder
        </h1>
        <p className="mt-3 text-lg text-surface-400 max-w-2xl">
          Nutzen Sie die Kraft des Zinseszinseffekts: Je früher Sie für Ihr Kind
          mit dem Sparen beginnen, desto größer wird das Vermögen zur Rente.
        </p>
      </div>

      {/* Calculator Form */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <CalculatorForm type="earlystart" onCalculate={handleCalculate} />
      </div>

      {/* Results */}
      {result && (
        <div
          ref={resultsRef}
          className={cn('mt-12 space-y-6 animate-fade-in')}
        >
          {/* Checkpoint Milestone Cards */}
          <div>
            <h3 className="text-lg font-semibold text-surface-200 mb-5">
              Kapitalentwicklung nach Alter
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {checkpoints.map((checkpoint, index) => (
                <div
                  key={checkpoint.label}
                  className={cn(
                    'glass rounded-2xl p-5 border border-surface-700/30 text-center',
                    'transition-all duration-300 hover:border-brand-500/30 hover:shadow-glow',
                    'animate-slide-up'
                  )}
                  style={{
                    animationDelay: `${0.1 + index * 0.08}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="text-sm font-medium text-surface-400 mb-2">
                    {checkpoint.label}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-brand-400">
                    {formatCurrency(checkpoint.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results Card */}
          <ResultsCard results={result.calculation} />

          {/* Growth Chart */}
          <Chart data={result.calculation} />
        </div>
      )}
    </section>
  )
}
