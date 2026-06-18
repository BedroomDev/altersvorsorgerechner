import { Wallet, TrendingUp, Gift, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { CalculationResult } from '@/lib/types'

interface ResultsCardProps {
  results: CalculationResult
}

interface MetricCard {
  label: string
  value: number
  subtitle: string
  icon: React.ReactNode
  colorClass: string
  delay: string
}

export default function ResultsCard({ results }: ResultsCardProps) {
  const metrics: MetricCard[] = [
    {
      label: 'Gesamtkapital',
      value: results.totalCapital,
      subtitle: 'bei Rentenbeginn',
      icon: <Wallet className="h-6 w-6" />,
      colorClass: 'text-green-400',
      delay: '0.1s',
    },
    {
      label: 'Monatliche Netto-Rente',
      value: results.monthlyNetRetirement,
      subtitle: 'nach Steuern',
      icon: <TrendingUp className="h-6 w-6" />,
      colorClass: 'text-brand-400',
      delay: '0.2s',
    },
    {
      label: 'Gesamte Zulagen',
      value: results.totalSubsidies,
      subtitle: 'staatliche Förderung',
      icon: <Gift className="h-6 w-6" />,
      colorClass: 'text-chart-green',
      delay: '0.3s',
    },
    {
      label: 'Steuereinsparung',
      value: results.totalTaxSavings,
      subtitle: 'gegenüber normalem Depot',
      icon: <Receipt className="h-6 w-6" />,
      colorClass: 'text-chart-blue',
      delay: '0.4s',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={cn(
            'glass rounded-2xl p-6 md:p-8 border border-surface-700/40',
            'animate-slide-up',
            'hover:shadow-glow transition-shadow duration-300'
          )}
          style={{
            animationDelay: metric.delay,
            animationFillMode: 'both',
          }}
        >
          {/* Icon + Label */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                'bg-surface-800/80 border border-surface-700/50',
                metric.colorClass
              )}
            >
              {metric.icon}
            </div>
            <span className="text-sm font-medium text-surface-400">
              {metric.label}
            </span>
          </div>

          {/* Value */}
          <p
            className={cn(
              'text-2xl sm:text-3xl font-bold tracking-tight',
              metric.colorClass
            )}
          >
            {formatCurrency(metric.value)}
          </p>

          {/* Subtitle */}
          <p className="text-xs text-surface-500 mt-1">{metric.subtitle}</p>
        </div>
      ))}
    </div>
  )
}
