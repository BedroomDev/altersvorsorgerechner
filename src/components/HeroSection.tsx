import { Link } from 'wouter'
import { ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-grid-pattern" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="flex flex-col items-center text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/20 px-4 py-1.5 mb-8">
            <Shield className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-medium text-brand-300">
              Altersvorsorgedepot 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl">
            <span className="text-surface-50">Planen Sie Ihre</span>
            <br />
            <span className="gradient-text">Altersvorsorge</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-surface-400 max-w-2xl leading-relaxed">
            Berechnen Sie Ihr zukünftiges Altersvorsorgedepot mit staatlichen Zulagen,
            Steuervorteilen und dem Zinseszinseffekt — transparent und verständlich.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/rechner/avd">
              <Button size="lg" className="group text-base px-8">
                Jetzt berechnen
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/rechner/vergleich">
              <Button variant="outline" size="lg" className="text-base px-8">
                AVD vs. Depot vergleichen
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-8 sm:gap-16 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            {[
              { value: '570 €', label: 'max. monatliche Förderung' },
              { value: '20+ %', label: 'potenzielle Steuerersparnis' },
              { value: '100 %', label: 'transparent & kostenlos' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-bold text-brand-400">{stat.value}</span>
                <span className="mt-1 text-xs sm:text-sm text-surface-500 text-center">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
