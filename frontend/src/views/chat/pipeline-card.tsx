import { Check, Dot, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineStep } from '@/lib/types'

function StepIndicator({ status }: { status: PipelineStep['status'] }) {
  if (status === 'done')
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="size-3" strokeWidth={3} />
      </span>
    )
  if (status === 'failed')
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <X className="size-3" strokeWidth={3} />
      </span>
    )
  if (status === 'active')
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
      </span>
    )
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
      <Dot className="size-4" />
    </span>
  )
}

export function PipelineCard({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="w-105 max-w-full rounded-xl border bg-card p-4.5 shadow-xs">
      <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Execution pipeline
      </p>
      <div className="flex flex-col gap-2.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2.5">
            <StepIndicator status={step.status} />
            <span
              className={cn(
                'flex-1 text-[13.5px]',
                step.status === 'pending' && 'text-muted-foreground/60',
                step.status === 'active' && 'font-semibold',
                step.status === 'failed' && 'text-destructive',
              )}
            >
              {step.label}
            </span>
            {step.note && (
              <span
                className={cn(
                  'font-mono text-[11.5px]',
                  step.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {step.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
