import { cn } from '@/lib/utils'

export default function Footer() {
  return (
    <footer
      className={cn(
        'w-full border-t border-surface-800',
        'bg-surface-950/80 backdrop-blur-sm',
        'py-8 px-6 mt-16'
      )}
    >
      <div className="max-w-5xl mx-auto space-y-4 text-center">
        {/* Disclaimer */}
        <p className="text-xs text-surface-500 leading-relaxed max-w-2xl mx-auto">
          Dieser Rechner dient nur zu Informationszwecken und stellt keine
          Finanzberatung dar. Alle Berechnungen basieren auf vereinfachten
          Annahmen.
        </p>

        {/* Divider */}
        <div className="w-12 h-px bg-surface-800 mx-auto" />

        {/* Copyright */}
        <p className="text-xs text-surface-600">
          © 2026 Altersvorsorgerechner
        </p>
      </div>
    </footer>
  )
}
