import { Link } from 'wouter'
import { PiggyBank, Scale, Baby, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalculatorOption {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  gradient: string
}

const calculatorOptions: CalculatorOption[] = [
  {
    title: 'AVD Rechner',
    description:
      'Berechnen Sie Ihr persönliches Altersvorsorgedepot mit staatlicher Förderung und Steuervorteilen.',
    icon: <PiggyBank className="h-8 w-8" />,
    href: '/rechner/avd',
    gradient: 'from-brand-500/20 to-brand-600/5',
  },
  {
    title: 'Vergleich',
    description:
      'Vergleichen Sie das AVD mit einem normalen Depot — inklusive Steuer- und Zulageneffekte.',
    icon: <Scale className="h-8 w-8" />,
    href: '/rechner/vergleich',
    gradient: 'from-chart-blue/20 to-chart-blue/5',
  },
  {
    title: 'Frühstart-Rente',
    description:
      'Starten Sie die Altersvorsorge für Ihr Kind und nutzen Sie den Zinseszinseffekt ab Tag eins.',
    icon: <Baby className="h-8 w-8" />,
    href: '/rechner/fruehstart',
    gradient: 'from-chart-orange/20 to-chart-orange/5',
  },
]

export default function CalculatorSelector() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {calculatorOptions.map((option) => (
        <Link key={option.href} href={option.href} className="block group">
          <div
            className={cn(
              'glass rounded-2xl p-6 h-full',
              'transition-all duration-500 ease-out',
              'hover:shadow-glow-strong hover:animate-pulse-glow',
              'hover:border-brand-500/30',
              'hover:-translate-y-1',
              'cursor-pointer'
            )}
          >
            {/* Icon with gradient background */}
            <div
              className={cn(
                'inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5',
                'bg-gradient-to-br',
                option.gradient,
                'text-brand-400 group-hover:text-brand-300',
                'transition-colors duration-300',
                'border border-brand-500/10'
              )}
            >
              {option.icon}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-surface-50 mb-2 group-hover:text-brand-300 transition-colors duration-300">
              {option.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-surface-400 leading-relaxed mb-4">
              {option.description}
            </p>

            {/* Call-to-action */}
            <div className="flex items-center gap-2 text-sm font-medium text-brand-400 group-hover:text-brand-300 transition-all duration-300">
              <span>Rechner starten</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
