import { createContext, useContext, useState, type ReactNode } from 'react'
import type { CalculatorType } from '@/lib/types'

interface CalculatorContextValue {
  activeCalculator: CalculatorType | null
  setActiveCalculator: (type: CalculatorType | null) => void
}

const CalculatorContext = createContext<CalculatorContextValue | undefined>(undefined)

interface CalculatorProviderProps {
  children: ReactNode
}

export function CalculatorProvider({ children }: CalculatorProviderProps) {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType | null>(null)

  return (
    <CalculatorContext.Provider value={{ activeCalculator, setActiveCalculator }}>
      {children}
    </CalculatorContext.Provider>
  )
}

export function useCalculator(): CalculatorContextValue {
  const context = useContext(CalculatorContext)
  if (!context) {
    throw new Error('useCalculator must be used within a CalculatorProvider')
  }
  return context
}
