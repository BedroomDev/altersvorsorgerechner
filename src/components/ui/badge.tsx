import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-surface-950',
  {
    variants: {
      variant: {
        default:
          'bg-brand-500/15 text-brand-300 border border-brand-500/20',
        success:
          'bg-success/15 text-emerald-300 border border-success/20',
        warning:
          'bg-warning/15 text-amber-300 border border-warning/20',
        danger:
          'bg-danger/15 text-red-300 border border-danger/20',
        outline:
          'border border-surface-600 text-surface-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
export type { BadgeProps }
