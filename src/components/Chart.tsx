import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { CalculationResult } from '@/lib/types'

interface ChartProps {
  data: CalculationResult
}

interface ChartDataPoint {
  age: number
  beitraege: number
  zulagen: number
  gewinne: number
}

const COLORS = {
  beitraege: '#3b82f6',
  zulagen: '#06c4aa',
  gewinne: '#f59e0b',
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        'glass rounded-xl p-4 shadow-xl',
        'border border-surface-600/30'
      )}
    >
      <p className="text-sm font-semibold text-surface-300 mb-2">
        Alter: {label} Jahre
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm py-0.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-surface-400">{entry.name}:</span>
          <span className="font-medium text-surface-100">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 0 })}.000 €`
  }
  return `${value.toLocaleString('de-DE')} €`
}

export default function Chart({ data }: ChartProps) {
  const chartData: ChartDataPoint[] = data.savingsPhase.map((year) => ({
    age: year.age,
    beitraege: year.cumulativeContributions,
    zulagen: year.cumulativeSubsidies,
    gewinne: year.cumulativeGains,
  }))

  return (
    <div className="glass rounded-2xl p-6 md:p-8 border border-surface-700/40">
      <h3 className="text-lg font-semibold text-surface-50 mb-6">
        Vermögensentwicklung
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradBeitraege" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.beitraege} stopOpacity={0.6} />
              <stop offset="100%" stopColor={COLORS.beitraege} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradZulagen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.zulagen} stopOpacity={0.6} />
              <stop offset="100%" stopColor={COLORS.zulagen} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradGewinne" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.gewinne} stopOpacity={0.6} />
              <stop offset="100%" stopColor={COLORS.gewinne} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="age"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
            tickLine={false}
            label={{
              value: 'Alter',
              position: 'insideBottomRight',
              offset: -5,
              style: { fill: '#64748b', fontSize: 12 },
            }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            iconType="circle"
            iconSize={10}
            formatter={(value: string) => (
              <span className="text-sm text-surface-300">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="beitraege"
            name="Eigene Beiträge"
            stackId="1"
            stroke={COLORS.beitraege}
            fill="url(#gradBeitraege)"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="zulagen"
            name="Staatliche Zulagen"
            stackId="1"
            stroke={COLORS.zulagen}
            fill="url(#gradZulagen)"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="gewinne"
            name="Rendite/Gewinne"
            stackId="1"
            stroke={COLORS.gewinne}
            fill="url(#gradGewinne)"
            fillOpacity={0.6}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
