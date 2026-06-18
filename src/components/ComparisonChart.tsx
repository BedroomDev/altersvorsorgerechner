import {
  LineChart,
  Line,
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

interface ComparisonChartProps {
  avdData: CalculationResult
  normalData: CalculationResult
}

interface ComparisonDataPoint {
  age: number
  avdCapital: number
  normalCapital: number
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
      {payload.length === 2 && (
        <div className="mt-2 pt-2 border-t border-surface-700/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-surface-400">Differenz:</span>
            <span
              className={cn(
                'font-medium',
                payload[0].value >= payload[1].value
                  ? 'text-green-400'
                  : 'text-red-400'
              )}
            >
              {formatCurrency(payload[0].value - payload[1].value)}
            </span>
          </div>
        </div>
      )}
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

export default function ComparisonChart({
  avdData,
  normalData,
}: ComparisonChartProps) {
  // Combine savings phase data by age
  const avdMap = new Map(
    avdData.savingsPhase.map((y) => [y.age, y.capital])
  )
  const normalMap = new Map(
    normalData.savingsPhase.map((y) => [y.age, y.capital])
  )

  // Get all unique ages sorted
  const allAges = Array.from(
    new Set([...avdMap.keys(), ...normalMap.keys()])
  ).sort((a, b) => a - b)

  const chartData: ComparisonDataPoint[] = allAges.map((age) => ({
    age,
    avdCapital: avdMap.get(age) ?? 0,
    normalCapital: normalMap.get(age) ?? 0,
  }))

  return (
    <div className="glass rounded-2xl p-6 md:p-8 border border-surface-700/40">
      <h3 className="text-lg font-semibold text-surface-50 mb-6">
        Kapitalentwicklung im Vergleich
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
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
          <Line
            type="monotone"
            dataKey="avdCapital"
            name="Altersvorsorgedepot"
            stroke="#06c4aa"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: '#06c4aa',
              stroke: '#0f172a',
              strokeWidth: 2,
            }}
          />
          <Line
            type="monotone"
            dataKey="normalCapital"
            name="Normales Depot"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={false}
            strokeDasharray="6 3"
            activeDot={{
              r: 5,
              fill: '#f59e0b',
              stroke: '#0f172a',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
