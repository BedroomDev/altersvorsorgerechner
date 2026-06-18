import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Menu, X, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navLinks = [
  { href: '/', label: 'Startseite' },
  { href: '/rechner/avd', label: 'AVD Rechner' },
  { href: '/rechner/vergleich', label: 'Vergleich' },
  { href: '/rechner/fruehstart', label: 'Frühstart-Rente' },
  { href: '/rechner/debeka-cai', label: 'Debeka CAI' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [location] = useLocation()

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-surface-700/30">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 border border-brand-500/20 transition-all duration-300 group-hover:shadow-glow group-hover:bg-brand-500/25">
            <TrendingUp className="h-5 w-5 text-brand-400" />
          </div>
          <span className="hidden sm:inline-block text-lg font-bold gradient-text">
            Altersvorsorgerechner
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                location === link.href
                  ? 'text-brand-300 bg-brand-500/10 border border-brand-500/20'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menü öffnen"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden glass-light animate-slide-down border-t border-surface-700/20">
          <div className="flex flex-col px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  location === link.href
                    ? 'text-brand-300 bg-brand-500/10'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
