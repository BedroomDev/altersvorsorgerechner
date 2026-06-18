import { HeroSection } from '@/components/HeroSection'
import CalculatorSelector from '@/components/CalculatorSelector'
import { Landmark, Receipt, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Landmark,
    title: 'Staatliche Förderung',
    description:
      'Profitieren Sie von bis zu 540 € jährlicher Grundzulage und weiteren Zulagen für Familien. Der Staat unterstützt Ihre private Altersvorsorge mit attraktiven Zuschüssen — ein entscheidender Renditevorteil gegenüber klassischen Depots.',
  },
  {
    icon: Receipt,
    title: 'Steuervorteile',
    description:
      'Beiträge zum Altersvorsorgedepot sind steuerlich absetzbar. In der Ansparphase fallen keine Kapitalertragsteuern an — erst bei der Auszahlung wird besteuert, typischerweise zu einem niedrigeren Steuersatz im Ruhestand.',
  },
  {
    icon: Settings2,
    title: 'Flexibilität',
    description:
      'Wählen Sie Ihre Anlagestrategie frei: ETFs, Fonds oder gemischte Portfolios. Passen Sie Sparraten jederzeit an und profitieren Sie von transparenten Kostenstrukturen ohne versteckte Gebühren.',
  },
]

export default function Home() {
  return (
    <div>
      <HeroSection />

      {/* Calculator Selector */}
      <section className="py-16 sm:py-20">
        <div
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 animate-slide-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          <CalculatorSelector />
        </div>
      </section>

      {/* Benefits / Features */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2
              className={cn(
                'text-3xl sm:text-4xl font-bold text-surface-50 animate-slide-up'
              )}
            >
              Warum das Altersvorsorgedepot?
            </h2>
            <p
              className="mt-4 text-lg text-surface-400 max-w-2xl mx-auto animate-slide-up"
              style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
            >
              Drei Gründe, warum das neue AVD für Ihre Altersvorsorge ideal ist.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className={cn(
                    'glass rounded-2xl p-8 border border-surface-700/30',
                    'transition-all duration-300 hover:border-brand-500/30 hover:shadow-glow',
                    'animate-slide-up'
                  )}
                  style={{
                    animationDelay: `${0.15 + index * 0.1}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 mb-5">
                    <Icon className="h-6 w-6 text-brand-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-surface-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-surface-400 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
