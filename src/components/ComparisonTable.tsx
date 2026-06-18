import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { ComparisonResult } from '@/lib/types'

interface ComparisonTableProps {
  comparison: ComparisonResult
}

interface TableRow {
  label: string
  avdValue: number
  normalValue: number
  advantage: number
  format: (v: number) => string
}

export default function ComparisonTable({ comparison }: ComparisonTableProps) {
  const { avd, normalDepot } = comparison

  const rows: TableRow[] = [
    {
      label: 'Gesamtkapital',
      avdValue: avd.totalCapital,
      normalValue: normalDepot.totalCapital,
      advantage: avd.totalCapital - normalDepot.totalCapital,
      format: formatCurrency,
    },
    {
      label: 'Monatl. Brutto-Rente',
      avdValue: avd.monthlyGrossRetirement,
      normalValue: normalDepot.monthlyGrossRetirement,
      advantage:
        avd.monthlyGrossRetirement - normalDepot.monthlyGrossRetirement,
      format: formatCurrency,
    },
    {
      label: 'Monatl. Netto-Rente',
      avdValue: avd.monthlyNetRetirement,
      normalValue: normalDepot.monthlyNetRetirement,
      advantage:
        avd.monthlyNetRetirement - normalDepot.monthlyNetRetirement,
      format: formatCurrency,
    },
    {
      label: 'Gesamte Zulagen',
      avdValue: avd.totalSubsidies,
      normalValue: normalDepot.totalSubsidies,
      advantage: avd.totalSubsidies - normalDepot.totalSubsidies,
      format: formatCurrency,
    },
    {
      label: 'Steuereinsparung',
      avdValue: avd.totalTaxSavings,
      normalValue: normalDepot.totalTaxSavings,
      advantage: avd.totalTaxSavings - normalDepot.totalTaxSavings,
      format: formatCurrency,
    },
  ]

  return (
    <div className="glass rounded-2xl overflow-hidden border border-surface-700/40">
      <div className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-surface-50">
          Detailvergleich
        </h3>
        <p className="text-sm text-surface-400 mt-1">
          AVD vs. Normales Depot im direkten Vergleich
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-surface-700/50">
              <th className="px-6 py-3 text-left font-semibold text-surface-400 bg-surface-900/50">
                Metrik
              </th>
              <th className="px-6 py-3 text-right font-semibold text-brand-400 bg-surface-900/50">
                AVD
              </th>
              <th className="px-6 py-3 text-right font-semibold text-chart-orange bg-surface-900/50">
                Normales Depot
              </th>
              <th className="px-6 py-3 text-right font-semibold text-surface-400 bg-surface-900/50">
                Vorteil
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.label}
                className={cn(
                  'border-t border-surface-700/30 transition-colors duration-150',
                  'hover:bg-surface-800/40',
                  index % 2 === 0 ? 'bg-surface-800/20' : 'bg-surface-900/20'
                )}
              >
                <td className="px-6 py-3 font-medium text-surface-200">
                  {row.label}
                </td>
                <td className="px-6 py-3 text-right text-surface-100 font-mono">
                  {row.format(row.avdValue)}
                </td>
                <td className="px-6 py-3 text-right text-surface-100 font-mono">
                  {row.format(row.normalValue)}
                </td>
                <td
                  className={cn(
                    'px-6 py-3 text-right font-mono font-semibold',
                    row.advantage > 0
                      ? 'text-green-400'
                      : row.advantage < 0
                        ? 'text-red-400'
                        : 'text-surface-400'
                  )}
                >
                  {row.advantage > 0 && '+'}
                  {row.format(row.advantage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
