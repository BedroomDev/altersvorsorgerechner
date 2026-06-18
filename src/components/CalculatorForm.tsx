import { useState, useEffect, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type {
  CalculatorType,
  CalculatorInput,
  EarlyStartInput,
  Gender,
  PresetScenario,
} from '@/lib/types'
import {
  PRESET_SCENARIOS,
  DEFAULT_AVD_INPUT,
  DEFAULT_EARLY_START_INPUT,
} from '@/lib/types'

// ============================================================
// Props
// ============================================================

interface CalculatorFormProps {
  type: CalculatorType
  onCalculate: (input: CalculatorInput | EarlyStartInput) => void
}

// ============================================================
// Tooltip texts (German)
// ============================================================

const TOOLTIP_TEXTS: Record<string, string> = {
  currentAge: 'Ihr heutiges Alter',
  retirementAge: 'Das Alter, in dem Sie in Rente gehen möchten',
  gender: 'Wird für die Berechnung der Lebenserwartung verwendet',
  monthlySavings: 'Ihr monatlicher Sparbetrag (max. 570€ Fördergrenze)',
  annualBonus: 'Optionale einmalige Zusatzzahlung pro Jahr',
  expectedReturn:
    'Durchschnittliche jährliche Rendite (historisch ~7,5% für Aktien-ETFs)',
  marginalTaxRate: 'Ihr aktueller persönlicher Grenzsteuersatz',
  retirementTaxRate:
    'Erwarteter Steuersatz im Ruhestand (typischerweise niedriger)',
  startingCapital: 'Bereits vorhandenes Kapital',
  riesterBalance: 'Bestehendes Riester-Guthaben zum Übertrag ins AVD',
  childAge: 'Das aktuelle Alter Ihres Kindes',
}

// ============================================================
// LocalStorage keys
// ============================================================

const LS_KEY_AVD = 'avd-calculator-inputs'
const LS_KEY_EARLY = 'earlystart-calculator-inputs'

// ============================================================
// Helper: Field with label + tooltip + slider + number input
// ============================================================

interface SliderFieldProps {
  id: string
  label: string
  tooltipKey: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

function SliderField({
  id,
  label,
  tooltipKey,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: SliderFieldProps) {
  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-surface-200">
          {label}
        </Label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-surface-500 hover:text-surface-300 transition-colors"
                aria-label={`Info: ${label}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{TOOLTIP_TEXTS[tooltipKey]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Slider + number input row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Slider
            id={id}
            value={[value]}
            min={min}
            max={max}
            step={step}
            onValueChange={(vals) => onChange(vals[0])}
          />
        </div>
        <div className="relative w-24 shrink-0">
          <Input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) {
                onChange(Math.min(max, Math.max(min, v)))
              }
            }}
            className="pr-7 text-right text-sm h-9"
          />
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-surface-500 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Helper: Number-only input field (no slider)
// ============================================================

interface NumberFieldProps {
  id: string
  label: string
  tooltipKey: string
  value: number
  suffix?: string
  onChange: (value: number) => void
}

function NumberField({
  id,
  label,
  tooltipKey,
  value,
  suffix,
  onChange,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-surface-200">
          {label}
        </Label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-surface-500 hover:text-surface-300 transition-colors"
                aria-label={`Info: ${label}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{TOOLTIP_TEXTS[tooltipKey]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative">
        <Input
          id={id}
          type="number"
          value={value}
          min={0}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v >= 0) onChange(v)
          }}
          className={cn('text-sm', suffix && 'pr-7')}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function CalculatorForm({
  type,
  onCalculate,
}: CalculatorFormProps) {
  const isEarlyStart = type === 'earlystart'
  const lsKey = isEarlyStart ? LS_KEY_EARLY : LS_KEY_AVD

  // --------------------------------------------------------
  // AVD / Comparison state
  // --------------------------------------------------------
  const [currentAge, setCurrentAge] = useState(DEFAULT_AVD_INPUT.currentAge)
  const [retirementAge, setRetirementAge] = useState(
    DEFAULT_AVD_INPUT.retirementAge
  )
  const [gender, setGender] = useState<Gender>(DEFAULT_AVD_INPUT.gender)
  const [monthlySavings, setMonthlySavings] = useState(
    DEFAULT_AVD_INPUT.monthlySavings
  )
  const [annualBonus, setAnnualBonus] = useState(DEFAULT_AVD_INPUT.annualBonus)
  const [expectedReturn, setExpectedReturn] = useState(
    DEFAULT_AVD_INPUT.expectedReturn * 100
  )
  const [marginalTaxRate, setMarginalTaxRate] = useState(
    DEFAULT_AVD_INPUT.marginalTaxRate * 100
  )
  const [retirementTaxRate, setRetirementTaxRate] = useState(
    DEFAULT_AVD_INPUT.retirementTaxRate * 100
  )
  const [startingCapital, setStartingCapital] = useState(
    DEFAULT_AVD_INPUT.startingCapital
  )
  const [riesterBalance, setRiesterBalance] = useState(
    DEFAULT_AVD_INPUT.riesterBalance
  )

  // --------------------------------------------------------
  // Early Start state
  // --------------------------------------------------------
  const [childAge, setChildAge] = useState(DEFAULT_EARLY_START_INPUT.childAge)
  const [earlyMonthlySavings, setEarlyMonthlySavings] = useState(
    DEFAULT_EARLY_START_INPUT.monthlySavings
  )
  const [earlyExpectedReturn, setEarlyExpectedReturn] = useState(
    DEFAULT_EARLY_START_INPUT.expectedReturn * 100
  )
  const [earlyRetirementAge, setEarlyRetirementAge] = useState(
    DEFAULT_EARLY_START_INPUT.retirementAge
  )

  // --------------------------------------------------------
  // Validation
  // --------------------------------------------------------
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    if (!isEarlyStart) {
      if (retirementAge <= currentAge) {
        errors.retirementAge =
          'Das Renteneintrittsalter muss höher als Ihr aktuelles Alter sein.'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [isEarlyStart, retirementAge, currentAge])

  // --------------------------------------------------------
  // LocalStorage persistence
  // --------------------------------------------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem(lsKey)
      if (!stored) return
      const parsed = JSON.parse(stored)

      if (isEarlyStart) {
        if (parsed.childAge !== undefined) setChildAge(parsed.childAge)
        if (parsed.monthlySavings !== undefined)
          setEarlyMonthlySavings(parsed.monthlySavings)
        if (parsed.expectedReturn !== undefined)
          setEarlyExpectedReturn(parsed.expectedReturn)
        if (parsed.retirementAge !== undefined)
          setEarlyRetirementAge(parsed.retirementAge)
      } else {
        if (parsed.currentAge !== undefined) setCurrentAge(parsed.currentAge)
        if (parsed.retirementAge !== undefined)
          setRetirementAge(parsed.retirementAge)
        if (parsed.gender !== undefined) setGender(parsed.gender)
        if (parsed.monthlySavings !== undefined)
          setMonthlySavings(parsed.monthlySavings)
        if (parsed.annualBonus !== undefined) setAnnualBonus(parsed.annualBonus)
        if (parsed.expectedReturn !== undefined)
          setExpectedReturn(parsed.expectedReturn)
        if (parsed.marginalTaxRate !== undefined)
          setMarginalTaxRate(parsed.marginalTaxRate)
        if (parsed.retirementTaxRate !== undefined)
          setRetirementTaxRate(parsed.retirementTaxRate)
        if (parsed.startingCapital !== undefined)
          setStartingCapital(parsed.startingCapital)
        if (parsed.riesterBalance !== undefined)
          setRiesterBalance(parsed.riesterBalance)
      }
    } catch {
      // Ignore corrupt localStorage
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save to localStorage on every state change
  useEffect(() => {
    try {
      if (isEarlyStart) {
        localStorage.setItem(
          lsKey,
          JSON.stringify({
            childAge,
            monthlySavings: earlyMonthlySavings,
            expectedReturn: earlyExpectedReturn,
            retirementAge: earlyRetirementAge,
          })
        )
      } else {
        localStorage.setItem(
          lsKey,
          JSON.stringify({
            currentAge,
            retirementAge,
            gender,
            monthlySavings,
            annualBonus,
            expectedReturn,
            marginalTaxRate,
            retirementTaxRate,
            startingCapital,
            riesterBalance,
          })
        )
      }
    } catch {
      // Ignore full localStorage
    }
  }, [
    isEarlyStart,
    lsKey,
    childAge,
    earlyMonthlySavings,
    earlyExpectedReturn,
    earlyRetirementAge,
    currentAge,
    retirementAge,
    gender,
    monthlySavings,
    annualBonus,
    expectedReturn,
    marginalTaxRate,
    retirementTaxRate,
    startingCapital,
    riesterBalance,
  ])

  // --------------------------------------------------------
  // Preset handling
  // --------------------------------------------------------
  function applyPreset(preset: PresetScenario) {
    const { input } = preset
    if (input.monthlySavings !== undefined)
      setMonthlySavings(input.monthlySavings)
    if (input.annualBonus !== undefined) setAnnualBonus(input.annualBonus)
    if (input.expectedReturn !== undefined)
      setExpectedReturn(input.expectedReturn * 100)
    if (input.marginalTaxRate !== undefined)
      setMarginalTaxRate(input.marginalTaxRate * 100)
    if (input.retirementTaxRate !== undefined)
      setRetirementTaxRate(input.retirementTaxRate * 100)
  }

  // --------------------------------------------------------
  // Submit
  // --------------------------------------------------------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (isEarlyStart) {
      const input: EarlyStartInput = {
        childAge,
        monthlySavings: earlyMonthlySavings,
        expectedReturn: earlyExpectedReturn / 100,
        retirementAge: earlyRetirementAge,
      }
      onCalculate(input)
    } else {
      const input: CalculatorInput = {
        currentAge,
        retirementAge,
        gender,
        monthlySavings,
        annualBonus,
        expectedReturn: expectedReturn / 100,
        marginalTaxRate: marginalTaxRate / 100,
        retirementTaxRate: retirementTaxRate / 100,
        startingCapital,
        riesterBalance,
      }
      onCalculate(input)
    }
  }

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------
  return (
    <div className="glass rounded-2xl p-6 md:p-8 border border-surface-700/40">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Preset buttons (AVD / Comparison only) */}
        {!isEarlyStart && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-surface-400">
              Schnellauswahl
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-5 py-2 text-sm rounded-xl bg-surface-800 border border-surface-700 text-surface-300 hover:bg-brand-500/15 hover:text-brand-300 hover:border-brand-500/40 transition-all duration-200"
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="border-b border-surface-700/30" />
          </div>
        )}

        {/* ======== Early Start Fields ======== */}
        {isEarlyStart && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SliderField
              id="childAge"
              label="Alter des Kindes"
              tooltipKey="childAge"
              value={childAge}
              min={0}
              max={18}
              onChange={setChildAge}
            />
            <SliderField
              id="earlyMonthlySavings"
              label="Monatliche Sparrate"
              tooltipKey="monthlySavings"
              value={earlyMonthlySavings}
              min={10}
              max={570}
              suffix="€"
              onChange={setEarlyMonthlySavings}
            />
            <SliderField
              id="earlyExpectedReturn"
              label="Erwartete Rendite p.a."
              tooltipKey="expectedReturn"
              value={earlyExpectedReturn}
              min={2}
              max={12}
              step={0.5}
              suffix="%"
              onChange={setEarlyExpectedReturn}
            />
            <SliderField
              id="earlyRetirementAge"
              label="Renteneintrittsalter"
              tooltipKey="retirementAge"
              value={earlyRetirementAge}
              min={60}
              max={75}
              onChange={setEarlyRetirementAge}
            />
          </div>
        )}

        {/* ======== AVD / Comparison Fields ======== */}
        {!isEarlyStart && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aktuelles Alter */}
            <SliderField
              id="currentAge"
              label="Aktuelles Alter"
              tooltipKey="currentAge"
              value={currentAge}
              min={18}
              max={80}
              onChange={setCurrentAge}
            />

            {/* Renteneintrittsalter */}
            <div>
              <SliderField
                id="retirementAge"
                label="Renteneintrittsalter"
                tooltipKey="retirementAge"
                value={retirementAge}
                min={60}
                max={75}
                onChange={setRetirementAge}
              />
              {validationErrors.retirementAge && (
                <p className="text-xs text-red-400 mt-1">
                  {validationErrors.retirementAge}
                </p>
              )}
            </div>

            {/* Geschlecht */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="gender" className="text-surface-200">
                  Geschlecht
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-surface-500 hover:text-surface-300 transition-colors"
                        aria-label="Info: Geschlecht"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{TOOLTIP_TEXTS.gender}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={gender}
                onValueChange={(v) => setGender(v as Gender)}
              >
                <SelectTrigger id="gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Männlich</SelectItem>
                  <SelectItem value="F">Weiblich</SelectItem>
                  <SelectItem value="D">Divers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Monatliche Sparrate */}
            <SliderField
              id="monthlySavings"
              label="Monatliche Sparrate"
              tooltipKey="monthlySavings"
              value={monthlySavings}
              min={10}
              max={570}
              suffix="€"
              onChange={setMonthlySavings}
            />

            {/* Jährliche Zusatzanlage */}
            <SliderField
              id="annualBonus"
              label="Jährliche Zusatzanlage"
              tooltipKey="annualBonus"
              value={annualBonus}
              min={0}
              max={10000}
              suffix="€"
              onChange={setAnnualBonus}
            />

            {/* Erwartete Rendite */}
            <SliderField
              id="expectedReturn"
              label="Erwartete Rendite p.a."
              tooltipKey="expectedReturn"
              value={expectedReturn}
              min={2}
              max={12}
              step={0.5}
              suffix="%"
              onChange={setExpectedReturn}
            />

            {/* Grenzsteuersatz heute */}
            <SliderField
              id="marginalTaxRate"
              label="Grenzsteuersatz heute"
              tooltipKey="marginalTaxRate"
              value={marginalTaxRate}
              min={0}
              max={45}
              suffix="%"
              onChange={setMarginalTaxRate}
            />

            {/* Grenzsteuersatz Rente */}
            <SliderField
              id="retirementTaxRate"
              label="Grenzsteuersatz Rente"
              tooltipKey="retirementTaxRate"
              value={retirementTaxRate}
              min={0}
              max={45}
              suffix="%"
              onChange={setRetirementTaxRate}
            />

            {/* Startvermögen */}
            <NumberField
              id="startingCapital"
              label="Startvermögen"
              tooltipKey="startingCapital"
              value={startingCapital}
              suffix="€"
              onChange={setStartingCapital}
            />

            {/* Riester-Guthaben */}
            <NumberField
              id="riesterBalance"
              label="Riester-Guthaben"
              tooltipKey="riesterBalance"
              value={riesterBalance}
              suffix="€"
              onChange={setRiesterBalance}
            />
          </div>
        )}

        {/* Submit button */}
        <Button type="submit" size="lg" className="w-full mt-4">
          Berechnen
        </Button>
      </form>
    </div>
  )
}
