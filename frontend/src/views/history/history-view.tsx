import { useState } from 'react'
import { SearchX, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSubjects, useTasks } from '@/api/hooks'
import type { ApiTask } from '@/api/types'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { formatDate } from '@/lib/format'

const PERIODS = [
  { value: 'all', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
]

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
            value === option.value
              ? 'bg-foreground text-background'
              : 'border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: ApiTask['status'] }) {
  if (status === 'done') return <Badge className="bg-success text-success-foreground">Done</Badge>
  if (status === 'failed')
    return <Badge className="bg-destructive/10 text-destructive">Failed</Badge>
  if (status === 'running')
    return <Badge className="bg-primary/10 text-primary">Running</Badge>
  return <Badge variant="secondary">Queued</Badge>
}

export function HistoryView() {
  const { historySubjectFilter, setHistorySubjectFilter } = useApp()
  const [period, setPeriod] = useState('all')
  const [status, setStatus] = useState<'all' | 'done' | 'failed'>('all')
  const [kind, setKind] = useState<'all' | 'code' | 'doc'>('all')

  const { data: subjects = [] } = useSubjects()
  const { data: tasks, isLoading } = useTasks({
    subject_id: historySubjectFilter === 'all' ? undefined : historySubjectFilter,
    status: status === 'all' ? undefined : status,
    kind: kind === 'all' ? undefined : kind,
    days: period === 'all' ? undefined : Number(period),
  })

  const hasFilters =
    historySubjectFilter !== 'all' || period !== 'all' || status !== 'all' || kind !== 'all'

  const clearFilters = () => {
    setHistorySubjectFilter('all')
    setPeriod('all')
    setStatus('all')
    setKind('all')
  }

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? '—'

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-245 px-9 py-8">
        <h1 className="mb-5 text-[22px] font-bold tracking-tight">Task history</h1>

        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <Select value={historySubjectFilter} onValueChange={setHistorySubjectFilter}>
            <SelectTrigger size="sm" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger size="sm" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <PillGroup
            options={[
              { value: 'all', label: 'All' },
              { value: 'done', label: 'Done' },
              { value: 'failed', label: 'Failed' },
            ]}
            value={status}
            onChange={setStatus}
          />
          <PillGroup
            options={[
              { value: 'all', label: 'All types' },
              { value: 'code', label: 'Code' },
              { value: 'doc', label: 'Documents' },
            ]}
            value={kind}
            onChange={setKind}
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" className="ml-auto text-primary" onClick={clearFilters}>
              <X data-icon="inline-start" />
              Clear filters
            </Button>
          )}
        </div>

        <p className="mb-3 text-[12.5px] text-muted-foreground">
          {tasks ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : '…'}
        </p>

        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-4.5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 rounded-md" />
              ))}
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <SearchX className="size-5" />
              <p className="text-[13.5px]">
                {hasFilters ? 'Nothing matches these filters' : 'No tasks yet — solve your first one'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4.5">Task</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4.5">File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-60 truncate pl-4.5 font-medium">
                      {task.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {subjectName(task.subject_id)}
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">
                      {formatDate(Date.parse(task.created_at))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="pr-4.5">
                      {task.artifact_filename ? (
                        <button
                          type="button"
                          className="font-mono text-xs text-primary hover:underline"
                          onClick={() =>
                            toast.info('Downloads arrive with the real pipeline worker')
                          }
                        >
                          {task.artifact_filename}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
